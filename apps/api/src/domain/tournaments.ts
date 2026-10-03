import { randomBytes, randomInt } from 'node:crypto';
import { Store, id, now, fail, requireRow, audit, notify } from '../db.js';
import { settleMatch, validateScore } from './matches.js';
import { rateTournament } from './skill-rating.js';
import { credit, config, achievements } from './economy.js';
export const qrToken=()=>randomBytes(24).toString('base64url');
export function organizer(db:Store,user:string,t:any){if(!(['ORGANIZER','ADMIN'].includes(db.get('SELECT role FROM users WHERE id=?',user)?.role))||(t.organizer_id!==user&&db.get('SELECT role FROM users WHERE id=?',user)?.role!=='ADMIN'))fail('Управлять турниром может только организатор или администратор',403);}
export function joinTournament(db:Store,user:string,tournamentId:string,token?:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));
  if(db.get('SELECT user_id FROM tournament_players WHERE tournament_id=? AND NOT EXISTS(SELECT 1 FROM player_preferences pp WHERE pp.user_id=tournament_players.user_id AND pp.is_guest=1) AND user_id=?',tournamentId,user))return {joined:true};
  if(token!==t.qr_token)fail('Для регистрации отсканируйте QR-код организатора',403);
  if(t.status!=='OPEN')fail('Регистрация закрыта',409);if(t.registration_deadline<now())fail('Срок регистрации истёк',409);
  const count=db.get('SELECT COUNT(*) n FROM tournament_players WHERE tournament_id=?',tournamentId).n;if(count>=t.max_players)fail('Турнир уже заполнен',409);
  db.run('INSERT INTO tournament_players VALUES (?,?,?)',tournamentId,user,now());if(count+1>=t.max_players)db.run("UPDATE tournaments SET status='FULL' WHERE id=?",tournamentId);notify(db,user,'TOURNAMENT','Ты присоединился к турниру: '+t.title);return {joined:true};
});}
function advanceByes(db:Store,tournamentId:string){
  const rows=db.all('SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY round,position',tournamentId);const last=Math.max(...rows.map(r=>r.round));
  for(const m of rows){if(m.status!=='WAITING')continue;
    const ready=m.round===1||db.all('SELECT status FROM tournament_matches WHERE tournament_id=? AND round=? AND position IN (?,?)',tournamentId,m.round-1,m.position*2,m.position*2+1).every(x=>['DONE','BYE'].includes(x.status));
    if(!ready)continue;const live=db.get('SELECT * FROM tournament_matches WHERE id=?',m.id);
    if(live.player_a&&live.player_b){db.run("UPDATE tournament_matches SET status='READY' WHERE id=?",m.id);continue;}
    const winner=live.player_a||live.player_b||null;db.run("UPDATE tournament_matches SET winner=?,status='BYE' WHERE id=?",winner,m.id);
    if(m.round<last)db.run(`UPDATE tournament_matches SET ${m.position%2===0?'player_a':'player_b'}=? WHERE tournament_id=? AND round=? AND position=?`,winner,tournamentId,m.round+1,Math.floor(m.position/2));
  }
}
export function tournamentStandings(db:Store,tid:string){
  const players=db.all('SELECT tp.user_id id,p.display_name,r.rating FROM tournament_players tp JOIN profiles p ON p.user_id=tp.user_id JOIN ratings r ON r.user_id=tp.user_id WHERE tournament_id=? ORDER BY tp.joined_at,tp.user_id',tid);
  const games=db.all("SELECT * FROM tournament_matches WHERE tournament_id=? AND status IN ('DONE','BYE')",tid);
  const scores=new Map(players.map(p=>[p.id,{...p,wins:0,losses:0,played:0,buchholz:0}]));
  for(const m of games){if(m.winner&&scores.has(m.winner))scores.get(m.winner)!.wins++;if(m.status==='DONE')for(const u of [m.player_a,m.player_b])if(scores.has(u)){scores.get(u)!.played++;if(u!==m.winner)scores.get(u)!.losses++;}}
  for(const m of games)if(m.status==='DONE')for(const [a,b] of [[m.player_a,m.player_b],[m.player_b,m.player_a]])if(scores.has(a))scores.get(a)!.buchholz+=scores.get(b)?.wins||0;
  const tournament=db.get('SELECT format,champion_id,seed_order FROM tournaments WHERE id=?',tid);
  const seeds:string[]=JSON.parse(tournament?.seed_order||'[]');
  return [...scores.values()].sort((a,b)=>(tournament?.format==='DOUBLE_ELIMINATION'?Number(b.id===tournament.champion_id)-Number(a.id===tournament.champion_id)||a.losses-b.losses:0)||b.wins-a.wins||b.buchholz-a.buchholz||(seeds.length?seeds.indexOf(a.id)-seeds.indexOf(b.id):b.rating-a.rating)||a.id.localeCompare(b.id));
}
function insertGame(db:Store,tid:string,round:number,pos:number,a:string|null,b:string|null){db.run('INSERT INTO tournament_matches(id,tournament_id,round,position,player_a,player_b,status,winner) VALUES (?,?,?,?,?,?,?,?)',id(),tid,round,pos,a,b,a&&b?'READY':'BYE',a&&b?null:a||b);}
function swissRound(db:Store,tid:string,round:number){
  const standings=tournamentStandings(db,tid);const played=db.all('SELECT player_a,player_b FROM tournament_matches WHERE tournament_id=?',tid);
  if(standings.length%2){const prior=new Set(db.all("SELECT winner FROM tournament_matches WHERE tournament_id=? AND status='BYE'",tid).map(m=>m.winner));let index=standings.findLastIndex(p=>!prior.has(p.id));if(index<0)index=standings.length-1;const [bye]=standings.splice(index,1);insertGame(db,tid,round,Math.floor((standings.length+1)/2),bye.id,null);}
  const met=(a:string,b:string)=>played.some(m=>m.player_a===a&&m.player_b===b||m.player_b===a&&m.player_a===b);
  let budget=30000;
  function pair(rows:typeof standings):Array<[string,string]>|null{if(!rows.length)return [];if(--budget<0)return null;const [a,...rest]=rows;for(let i=0;i<rest.length;i++){if(met(a.id,rest[i].id))continue;const tail=pair(rest.filter((_,j)=>j!==i));if(tail)return [[a.id,rest[i].id],...tail];}return null;}
  const pairs=pair(standings);if(pairs){pairs.forEach(([a,b],i)=>insertGame(db,tid,round,i,a,b));return;}
  let position=0;while(standings.length){const a=standings.shift()!;let i=standings.findIndex(b=>!met(a.id,b.id));if(i<0)i=0;const [b]=standings.splice(i,1);insertGame(db,tid,round,position++,a.id,b.id);}
}
// Upper bracket plays first, then the lower bracket. A lower-bracket winner
// must beat the undefeated finalist twice; this generates the reset final.
function doubleEliminationRound(db:Store,tid:string,round:number){
  const ranked=tournamentStandings(db,tid);const active=ranked.filter(p=>p.losses<2);
  const upper=active.filter(p=>p.losses===0),lower=active.filter(p=>p.losses===1);
  if(active.length===1)return active[0].id;
  const group=upper.length>1?upper:lower.length>1?lower:active;
  const seeds:string[]=JSON.parse(db.get('SELECT seed_order FROM tournaments WHERE id=?',tid).seed_order);
  group.sort((a,b)=>seeds.indexOf(a.id)-seeds.indexOf(b.id));
  let position=0;while(group.length){const a=group.shift()!;const b=group.pop();insertGame(db,tid,round,position++,a.id,b?.id||null);}
  return null;
}
export function startTournament(db:Store,user:string,tournamentId:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));organizer(db,user,t);if(!['OPEN','FULL'].includes(t.status))fail('Турнир нельзя начать сейчас',409);
  const entrants=db.all('SELECT tp.user_id,r.rating,u.banned FROM tournament_players tp JOIN ratings r ON r.user_id=tp.user_id JOIN users u ON u.id=tp.user_id WHERE tournament_id=? ORDER BY r.rating DESC,tp.joined_at',tournamentId);
  if(entrants.length<2)fail('Нужно минимум два игрока',409);if(entrants.some(p=>p.banned))fail('Перед стартом удалите заблокированных игроков',409);
  const saved:string[]=JSON.parse(t.seed_order||'[]');if(saved.length===entrants.length&&entrants.every(p=>saved.includes(p.user_id)))entrants.sort((a,b)=>saved.indexOf(a.user_id)-saved.indexOf(b.user_id));else if(t.seeding==='RANDOM')for(let i=entrants.length-1;i>0;i--){const j=randomInt(i+1);[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
  db.run('UPDATE tournaments SET seed_order=? WHERE id=?',JSON.stringify(entrants.map(p=>p.user_id)),t.id);
  if(t.format==='ROUND_ROBIN'){
    const rotation:(string|null)[]=entrants.map(p=>p.user_id);if(rotation.length%2)rotation.push(null);const n=rotation.length;
    for(let round=1;round<n;round++){for(let pos=0;pos<n/2;pos++)insertGame(db,t.id,round,pos,rotation[pos],rotation[n-1-pos]);rotation.splice(1,0,rotation.pop()!);}
  }else if(t.format==='DOUBLE_ELIMINATION')doubleEliminationRound(db,t.id,1);
  else if(t.format.startsWith('SWISS'))swissRound(db,t.id,1);
  else{
    const size=2**Math.ceil(Math.log2(entrants.length)),rounds=Math.log2(size);let seeds=[1,2];for(let n=4;n<=size;n*=2)seeds=seeds.flatMap(s=>[s,n+1-s]);
    for(let round=1;round<=rounds;round++)for(let pos=0;pos<size/2**round;pos++)db.run('INSERT INTO tournament_matches(id,tournament_id,round,position,player_a,player_b) VALUES (?,?,?,?,?,?)',id(),tournamentId,round,pos,round===1?entrants[seeds[pos*2]-1]?.user_id||null:null,round===1?entrants[seeds[pos*2+1]-1]?.user_id||null:null);
    advanceByes(db,t.id);
  }
  db.run("UPDATE tournaments SET status='LIVE',started_at=? WHERE id=?",now(),t.id);audit(db,user,'TOURNAMENT_START',t.id,{players:entrants.length,format:t.format});return {started:true};
});}
function finishTournament(db:Store,t:any,champion:string,podium:string[]){
  db.run("UPDATE tournaments SET status='FINISHED',champion_id=?,finished_at=? WHERE id=?",champion,now(),t.id);if(t.is_test)return;rateTournament(db,t.id);const c=config(db);
  for(const p of db.all('SELECT user_id FROM tournament_players WHERE tournament_id=? AND NOT EXISTS(SELECT 1 FROM player_preferences pp WHERE pp.user_id=tournament_players.user_id AND pp.is_guest=1)',t.id)){credit(db,p.user_id,c.tournamentParticipation,'TOURNAMENT',`${t.id}:participation`,'Участие в турнире');notify(db,p.user_id,'TOURNAMENT',`${t.title}: турнир завершён · +${c.tournamentParticipation} пинг поинтов`);}
  if(!db.get('SELECT 1 FROM player_preferences WHERE user_id=? AND is_guest=1',champion)){credit(db,champion,c.tournamentWin,'TOURNAMENT',`${t.id}:winner`,'Победа в турнире');notify(db,champion,'TOURNAMENT',`Ты победил в турнире «${t.title}» · +${c.tournamentWin} пинг поинтов`);db.run('UPDATE ratings SET tournament_wins=tournament_wins+1 WHERE user_id=?',champion);}
  for(const p of new Set(podium))if(p&&!db.get('SELECT 1 FROM player_preferences WHERE user_id=? AND is_guest=1',p))db.run('UPDATE ratings SET podiums=podiums+1 WHERE user_id=?',p);
  for(const p of db.all('SELECT user_id FROM tournament_players WHERE tournament_id=? AND NOT EXISTS(SELECT 1 FROM player_preferences pp WHERE pp.user_id=tournament_players.user_id AND pp.is_guest=1)',t.id))achievements(db,p.user_id);
}
export function tournamentResult(db:Store,user:string,tournamentId:string,matchId:string,a?:number,b?:number,winnerId?:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tournamentId));organizer(db,user,t);const m=requireRow(db.get('SELECT * FROM tournament_matches WHERE id=? AND tournament_id=?',matchId,tournamentId));
  if(winnerId){if(winnerId!==m.player_a&&winnerId!==m.player_b)fail('Выберите участника этого матча');}else{if(a===undefined||b===undefined)fail('Выберите победителя или укажите счёт');validateScore(a!,b!);winnerId=a!>b!?m.player_a:m.player_b;}
  if(m.status==='DONE'){if(m.winner!==winnerId||(a!==undefined&&(m.score_a!==a||m.score_b!==b)))fail('Результат уже записан',409);return m;}
  if(t.status!=='LIVE'||m.status!=='READY')fail('Матч ещё не готов к результату',409);
  const game=id();db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,status,tournament_id,created_at) VALUES (?,?,?,?,?,'PENDING',?,?)",game,m.player_a,m.player_b,a??(winnerId===m.player_a?1:0),b??(winnerId===m.player_b?1:0),t.id,now());const result=settleMatch(db,game);
  db.run("UPDATE tournament_matches SET status='DONE',winner=?,score_a=?,score_b=?,match_id=? WHERE id=?",result.winner,a??null,b??null,game,matchId);
  if(t.format==='SINGLE_ELIMINATION'){
    const next=db.get('SELECT id FROM tournament_matches WHERE tournament_id=? AND round=? AND position=?',t.id,m.round+1,Math.floor(m.position/2));
    if(next){db.run(`UPDATE tournament_matches SET ${m.position%2===0?'player_a':'player_b'}=? WHERE id=?`,result.winner,next.id);advanceByes(db,t.id);}
    else finishTournament(db,t,result.winner,[result.winner,result.loser,...db.all("SELECT player_a,player_b,winner FROM tournament_matches WHERE tournament_id=? AND round=? AND status='DONE'",t.id,m.round-1).map(x=>x.player_a===x.winner?x.player_b:x.player_a)]);
  }else if(!db.get("SELECT id FROM tournament_matches WHERE tournament_id=? AND status IN ('READY','WAITING')",t.id)){
    if(t.format==='DOUBLE_ELIMINATION'){const champion=doubleEliminationRound(db,t.id,m.round+1);if(champion){const others=db.all("SELECT m.loser FROM matches m WHERE tournament_id=? AND status='CONFIRMED' ORDER BY confirmed_at DESC,rowid DESC",t.id);finishTournament(db,t,champion,[champion,...[...new Set<string>(others.map(g=>g.loser))].filter(u=>u!==champion).slice(0,2)]);}}else{
    const count=db.get('SELECT COUNT(*) n FROM tournament_players WHERE tournament_id=?',t.id).n;const target=Math.min(Number(t.format.split('_')[1])||3,count%2?count:count-1);
    if(t.format.startsWith('SWISS')&&m.round<target)swissRound(db,t.id,m.round+1);else{const ranking=tournamentStandings(db,t.id);finishTournament(db,t,ranking[0].id,ranking.slice(0,3).map(p=>p.id));}}
  }
  audit(db,user,'TOURNAMENT_RESULT',matchId,{a,b,winner:result.winner});return result;
});}
export function replaceTournamentPlayer(db:Store,user:string,tid:string,matchId:string,slot:'player_a'|'player_b',playerId:string){return db.tx(()=>{
  const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tid));organizer(db,user,t);const target=requireRow(db.get('SELECT * FROM tournament_matches WHERE id=? AND tournament_id=?',matchId,tid));
  if(t.status!=='LIVE'||target.status!=='READY')fail('Менять игроков можно только в незавершённом матче',409);
  if(!db.get('SELECT tp.user_id FROM tournament_players tp JOIN users u ON u.id=tp.user_id WHERE tournament_id=? AND user_id=? AND banned=0',tid,playerId))fail('Игрок должен быть зарегистрирован на этот турнир');
  if(target[slot]===playerId)return {ok:true};if(target[slot==='player_a'?'player_b':'player_a']===playerId)fail('Игрок не может играть сам с собой');
  const source=db.get('SELECT * FROM tournament_matches WHERE tournament_id=? AND round=? AND (player_a=? OR player_b=?)',tid,target.round,playerId,playerId);
  if(source&&source.status!=='READY')fail('Игрок уже завершил матч в этом раунде',409);
  const previous=target[slot];if(t.format==='DOUBLE_ELIMINATION'){const ranking=tournamentStandings(db,tid);const incoming=ranking.find(p=>p.id===playerId),outgoing=ranking.find(p=>p.id===previous);if(!incoming||incoming.losses>=2||incoming.losses!==outgoing?.losses)fail('В сетке до двух поражений замена возможна между игроками с одинаковым числом поражений',409);}
  if(source)db.run(`UPDATE tournament_matches SET ${source.player_a===playerId?'player_a':'player_b'}=? WHERE id=?`,previous,source.id);
  db.run(`UPDATE tournament_matches SET ${slot}=? WHERE id=?`,playerId,target.id);audit(db,user,'TOURNAMENT_SWAP',tid,{matchId,slot,playerId,previous,source:source?.id||null});return {ok:true};
});}

export function shuffleTournament(db:Store,user:string,tid:string){return db.tx(()=>{const t=requireRow(db.get('SELECT * FROM tournaments WHERE id=?',tid));organizer(db,user,t);if(!['OPEN','FULL'].includes(t.status))fail('После старта перемешивание недоступно',409);const order=db.all('SELECT user_id FROM tournament_players WHERE tournament_id=?',tid).map(p=>p.user_id);if(order.length<2)fail('Добавь минимум двух участников');for(let i=order.length-1;i>0;i--){const j=randomInt(i+1);[order[i],order[j]]=[order[j],order[i]];}db.run("UPDATE tournaments SET seed_order=?,seeding='RANDOM' WHERE id=?",JSON.stringify(order),tid);audit(db,user,'TOURNAMENT_SHUFFLE',tid,{order});return {order};});}
