import { Store, id, now, audit, fail, requireRow } from '../db.js';
export const priors:Record<number,number>={1:900,2:1200,3:1500};
export const ratingModel={name:'Club Bayesian v1',initialRating:1200,levels:priors,initialDeviation:300,minDeviation:60,floor:400,maxChangePerMatch:80};
type Skill={rating:number;deviation:number;games:number};
type Observation={rating:number;deviation:number;win:boolean;match_id:string;round?:number};
// Sequential Bayesian logistic approximation. Opponent uncertainty discounts evidence;
// bounded changes protect provisional players. No placement bonus duplicates match wins.
export function updateSkill(skill:Skill,opponent:Observation){
 const q=Math.log(10)/400,weight=1/Math.sqrt(1+3*q*q*opponent.deviation**2/Math.PI**2);
 const expected=1/(1+10**(weight*(opponent.rating-skill.rating)/400));
 const variance=1/(1/skill.deviation**2+q*q*weight*weight*expected*(1-expected));
 const raw=variance*q*weight*((opponent.win?1:0)-expected);
 const delta=Math.round(Math.max(-80,Math.min(80,raw)));
 const rating=Math.max(ratingModel.floor,skill.rating+delta),deviation=Math.max(60,Math.sqrt(variance));
 return {rating,deviation,games:skill.games+1,expected,delta:rating-skill.rating};
}
export function setInitialLevel(db:Store,actor:string,user:string,level:number){
 const r=requireRow(db.get('SELECT * FROM ratings WHERE user_id=?',user));if(db.get('SELECT 1 FROM player_preferences WHERE user_id=? AND is_guest=1',user))fail('У гостей нет клубного рейтинга');
 if(db.get("SELECT 1 FROM tournament_players tp JOIN tournaments t ON t.id=tp.tournament_id WHERE tp.user_id=? AND t.status='LIVE'",user))fail('Дождись завершения текущего турнира',409);
 const rating=priors[level];if(!rating)fail('Выбери уровень от 1 до 3');
 db.run('UPDATE ratings SET rating=?,rating_level=?,rating_deviation=300,calibrated_games=0,highest_rating=MAX(highest_rating,?) WHERE user_id=?',rating,level,rating,user);
 db.run('INSERT INTO rating_history(id,user_id,rating,created_at,system,previous_rating,rating_change,uncertainty_before,uncertainty_after,details) VALUES (?,?,?,?,?,?,?,?,?,?)',id(),user,rating,now(),'CALIBRATION',r.rating,rating-r.rating,r.rating_deviation,300,JSON.stringify({level,actor,reason:'Оценка администратора'}));
 audit(db,actor,'RATING_LEVEL',user,{level,previous:r.rating,rating});return {rating,level};
}
export function rateFriendly(db:Store,m:any){
 const previous=db.all("SELECT user_id,rating_change FROM rating_history WHERE match_id=? AND system='FRIENDLY'",m.id);
 if(previous.length===2)return [m.player_a,m.player_b].map(uid=>previous.find(h=>h.user_id===uid)!.rating_change);
 if(previous.length)fail('Неполная история результата матча',409);
 if(m.score_a===m.score_b)fail('Для этого матча нужен победитель',409);
 const deltas:number[]=[];
 for(const [uid,win] of [[m.player_a,m.score_a>m.score_b],[m.player_b,m.score_b>m.score_a]] as const){
  const own=requireRow(db.get('SELECT * FROM ratings WHERE user_id=?',uid)),delta=win?10:-10;
  db.run('UPDATE ratings SET friendly_rating=friendly_rating+?,friendly_games=friendly_games+1,friendly_wins=friendly_wins+? WHERE user_id=?',delta,win?1:0,uid);
  db.run('INSERT INTO rating_history(id,user_id,rating,match_id,created_at,system,previous_rating,rating_change,details) VALUES (?,?,?,?,?,?,?,?,?)',id(),uid,own.friendly_rating+delta,m.id,now(),'FRIENDLY',own.friendly_rating,delta,JSON.stringify({actual:win?1:0,model:'Friendly fixed 10'}));
  deltas.push(delta);
 }
 return deltas;
}
export function rateTournament(db:Store,tid:string){
 const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tid));if(t.rating_processed_at||t.is_test)return;
 const matches=db.all("SELECT m.*,tm.round FROM matches m JOIN tournament_matches tm ON tm.match_id=m.id WHERE m.tournament_id=? AND m.status='CONFIRMED' AND m.rating_system='TOURNAMENT' ORDER BY tm.round,tm.position",tid);
 // Snapshot all opponents before the rating period, so processing order is irrelevant.
 const snapshots=new Map(db.all('SELECT r.* FROM ratings r JOIN tournament_players tp ON tp.user_id=r.user_id WHERE tp.tournament_id=?',tid).map(r=>[r.user_id,r]));
 for(const [uid,old] of snapshots){
  if(db.get('SELECT 1 FROM player_preferences WHERE user_id=? AND is_guest=1',uid))continue;
  let state={rating:old.rating,deviation:old.rating_deviation,games:old.calibrated_games};let counted=0;
  for(const m of matches.filter(m=>m.player_a===uid||m.player_b===uid)){
   const opponent=m.player_a===uid?m.player_b:m.player_a;if(db.get('SELECT 1 FROM player_preferences WHERE user_id=? AND is_guest=1',opponent))continue;
   const other=snapshots.get(opponent)!;const prev=state,next=updateSkill(state,{rating:other.rating,deviation:other.rating_deviation,win:m.winner===uid,match_id:m.id,round:m.round});state=next;counted++;
   db.run('INSERT INTO rating_history(id,user_id,season_id,rating,match_id,created_at,system,previous_rating,rating_change,uncertainty_before,uncertainty_after,tournament_id,details) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',id(),uid,t.season_id,next.rating,m.id,now(),'TOURNAMENT',prev.rating,next.delta,prev.deviation,next.deviation,tid,JSON.stringify({opponent_id:opponent,opponent_rating:other.rating,opponent_uncertainty:other.rating_deviation,expected:next.expected,actual:m.winner===uid?1:0,round:m.round,tournament_wins:matches.filter(g=>g.winner===uid).length,exit_round:matches.find(g=>g.loser===uid)?.round||null,model:ratingModel.name}));
   db.run(`UPDATE matches SET ${m.player_a===uid?'rating_change_a':'rating_change_b'}=? WHERE id=?`,next.delta,m.id);
  }
  if(counted){db.run('UPDATE ratings SET rating=?,rating_deviation=?,calibrated_games=?,highest_rating=MAX(highest_rating,?) WHERE user_id=?',state.rating,state.deviation,state.games,state.rating,uid);}
 }
 db.run('UPDATE tournaments SET rating_processed_at=? WHERE id=?',now(),tid);
}
