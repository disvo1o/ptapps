import { randomBytes } from 'node:crypto';
import { Store, id, now, fail, requireRow, audit, notify } from '../db.js';
import { settleMatch, validateScore } from './matches.js';
import { credit, config, achievements } from './economy.js';
export const qrToken=()=>randomBytes(24).toString('base64url');
export function organizer(db:Store,user:string,t:any){if(t.organizer_id!==user&&db.get('SELECT role FROM users WHERE id=?',user)?.role!=='ADMIN')fail('Only the organizer can manage this tournament',403);}
export function joinTournament(db:Store,user:string,tournamentId:string,token?:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));if(token!==undefined&&token!==t.qr_token)fail('This QR invitation has expired',403);
  if(db.get('SELECT user_id FROM tournament_players WHERE tournament_id=? AND user_id=?',tournamentId,user))return {joined:true};
  if(t.status!=='OPEN')fail('Registration is closed',409);if(t.registration_deadline<now())fail('Registration deadline has passed',409);
  const count=db.get('SELECT COUNT(*) n FROM tournament_players WHERE tournament_id=?',tournamentId).n;if(count>=t.max_players)fail('Турнир уже заполнен',409);
  db.run('INSERT INTO tournament_players VALUES (?,?,?)',tournamentId,user,now());if(count+1>=t.max_players)db.run("UPDATE tournaments SET status='FULL' WHERE id=?",tournamentId);notify(db,user,'TOURNAMENT','Ты присоединился к турниру: '+t.title);return {joined:true};
});}
function advanceByes(db:Store,tournamentId:string){
  const rows=db.all('SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY round,position',tournamentId);const last=Math.max(...rows.map(r=>r.round));
  for(const m of rows){if(m.status!=='WAITING')continue;
    const ready=m.round===1||db.all('SELECT status FROM tournament_matches WHERE tournament_id=? AND round=? AND position IN (?,?)',tournamentId,m.round-1,m.position*2,m.position*2+1).every(x=>['DONE','BYE'].includes(x.status));
    if(!ready)continue;
    const live=db.get('SELECT * FROM tournament_matches WHERE id=?',m.id);
    if(live.player_a&&live.player_b){db.run("UPDATE tournament_matches SET status='READY' WHERE id=?",m.id);continue;}
    const winner=live.player_a||live.player_b||null;db.run("UPDATE tournament_matches SET winner=?,status='BYE' WHERE id=?",winner,m.id);
    if(m.round<last)db.run(`UPDATE tournament_matches SET ${m.position%2===0?'player_a':'player_b'}=? WHERE tournament_id=? AND round=? AND position=?`,winner,tournamentId,m.round+1,Math.floor(m.position/2));
  }
}
export function startTournament(db:Store,user:string,tournamentId:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));organizer(db,user,t);if(!['OPEN','FULL'].includes(t.status))fail('Турнир нельзя начать сейчас',409);
  const entrants=db.all('SELECT tp.user_id,r.rating,u.banned FROM tournament_players tp JOIN ratings r ON r.user_id=tp.user_id JOIN users u ON u.id=tp.user_id WHERE tournament_id=? ORDER BY r.rating DESC,tp.joined_at',tournamentId);
  if(entrants.length<2)fail('At least two players are needed',409);if(entrants.some(p=>p.banned))fail('Remove suspended players before starting',409);
  const size=2**Math.ceil(Math.log2(entrants.length)),rounds=Math.log2(size);
  // Mirror seeds so the strongest two meet only in the final; top seeds receive byes.
  let seeds=[1,2];for(let n=4;n<=size;n*=2)seeds=seeds.flatMap(s=>[s,n+1-s]);
  for(let round=1;round<=rounds;round++)for(let pos=0;pos<size/2**round;pos++)db.run('INSERT INTO tournament_matches(id,tournament_id,round,position,player_a,player_b) VALUES (?,?,?,?,?,?)',id(),tournamentId,round,pos,round===1?entrants[seeds[pos*2]-1]?.user_id||null:null,round===1?entrants[seeds[pos*2+1]-1]?.user_id||null:null);
  db.run("UPDATE tournaments SET status='LIVE' WHERE id=?",tournamentId);advanceByes(db,tournamentId);audit(db,user,'TOURNAMENT_START',tournamentId,{players:entrants.length});return {started:true};
});}
export function tournamentResult(db:Store,user:string,tournamentId:string,matchId:string,a:number,b:number){return db.tx(()=>{
  validateScore(a,b);const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));organizer(db,user,t);
  const m=requireRow(db.get('SELECT * FROM tournament_matches WHERE id=? AND tournament_id=?',matchId,tournamentId));
  if(m.status==='DONE'){if(m.score_a!==a||m.score_b!==b)fail('Result already recorded',409);return m;}
  if(t.status!=='LIVE'||m.status!=='READY')fail('This match is not ready',409);
  const game=id();db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,status,tournament_id,created_at) VALUES (?,?,?,?,?,'PENDING',?,?)",game,m.player_a,m.player_b,a,b,tournamentId,now());const result=settleMatch(db,game);
  db.run("UPDATE tournament_matches SET status='DONE',winner=?,score_a=?,score_b=?,match_id=? WHERE id=?",result.winner,a,b,game,matchId);
  const next=db.get('SELECT id FROM tournament_matches WHERE tournament_id=? AND round=? AND position=?',tournamentId,m.round+1,Math.floor(m.position/2));
  if(next){db.run(`UPDATE tournament_matches SET ${m.position%2===0?'player_a':'player_b'}=? WHERE id=?`,result.winner,next.id);advanceByes(db,tournamentId);}
  else{
    db.run("UPDATE tournaments SET status='FINISHED',champion_id=? WHERE id=?",result.winner,tournamentId);const c=config(db);
    for(const p of db.all('SELECT user_id FROM tournament_players WHERE tournament_id=?',tournamentId)){credit(db,p.user_id,c.tournamentParticipation,'TOURNAMENT',`${tournamentId}:participation`,'Турнир завершён');notify(db,p.user_id,'TOURNAMENT',`${t.title} finished · +${c.tournamentParticipation} PP`);}
    credit(db,result.winner,c.tournamentWin,'TOURNAMENT',`${tournamentId}:winner`,'Чемпион турнира');db.run('UPDATE ratings SET tournament_wins=tournament_wins+1 WHERE user_id=?',result.winner);
    const podium=new Set([result.winner,result.loser,...db.all('SELECT player_a,player_b,winner FROM tournament_matches WHERE tournament_id=? AND round=? AND status=\'DONE\'',tournamentId,m.round-1).map(x=>x.player_a===x.winner?x.player_b:x.player_a)]);
    for(const p of podium)if(p)db.run('UPDATE ratings SET podiums=podiums+1 WHERE user_id=?',p);
    for(const p of db.all('SELECT user_id FROM tournament_players WHERE tournament_id=?',tournamentId))achievements(db,p.user_id);
  }
  audit(db,user,'TOURNAMENT_RESULT',matchId,{a,b,winner:result.winner});return result;
});}
