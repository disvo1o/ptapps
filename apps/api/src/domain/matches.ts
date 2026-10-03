import { Store, fail, id, now, requireRow, notify, audit } from '../db.js';
import { awardPlayerCard } from './cards.js';
import { rateFriendly } from './skill-rating.js';
import { matchReward } from './rating.js';
import { config, credit, achievements } from './economy.js';
export function validateScore(a:number,b:number){if(a===b||Math.max(a,b)<11||Math.abs(a-b)<2||(Math.max(a,b)>11&&Math.abs(a-b)!==2))fail('Укажи счёт завершённой партии: до 11, с разницей в 2 очка');}
export function submitMatch(db:Store,user:string,opponent:string,a:number,b:number,key:string){return db.tx(()=>{
  validateScore(a,b);if(user===opponent)fail('Выбери другого игрока');
  if(!db.get('SELECT u.id FROM users u WHERE u.id=? AND u.banned=0 AND NOT EXISTS(SELECT 1 FROM player_preferences pp WHERE pp.user_id=u.id AND pp.is_guest=1)',opponent))fail('Игрок не найден',404);
  const previous=db.get('SELECT * FROM matches WHERE request_key=?',`${user}:${key}`);if(previous){if(previous.player_b!==opponent||previous.score_a!==a||previous.score_b!==b)fail('Запрос уже использован',409);return previous;}
  if(db.get("SELECT id FROM matches WHERE status='PENDING' AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?))",user,opponent,opponent,user))fail('У тебя уже есть неподтверждённый матч с этим игроком',409);
  const match=id();db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,status,created_at,request_key,rating_system) VALUES (?,?,?,?,?,'PENDING',?,?,'FRIENDLY')",match,user,opponent,a,b,now(),`${user}:${key}`);
  notify(db,opponent,'MATCH_PENDING','A match result is waiting for your confirmation');return db.get('SELECT * FROM matches WHERE id=?',match);
});}
// Called only inside the enclosing confirmation / tournament transaction.
export function settleMatch(db:Store,matchId:string){
  const m=requireRow(db.get('SELECT * FROM matches WHERE id=?',matchId));if(m.status==='CONFIRMED')return m;if(m.status!=='PENDING')fail('Этот результат нельзя подтвердить',409);const guestMatch=!!(m.tournament_id&&db.get('SELECT 1 FROM tournaments WHERE id=? AND is_test=1',m.tournament_id))||!!db.get('SELECT 1 FROM player_preferences WHERE is_guest=1 AND user_id IN (?,?)',m.player_a,m.player_b);if(guestMatch){const winner=m.score_a>m.score_b?m.player_a:m.player_b,loser=winner===m.player_a?m.player_b:m.player_a;db.run("UPDATE matches SET status='CONFIRMED',winner=?,loser=?,confirmed_at=?,rating_change_a=0,rating_change_b=0,reward_eligible=0 WHERE id=?",winner,loser,now(),m.id);return db.get('SELECT * FROM matches WHERE id=?',m.id);}if(db.get('SELECT id FROM users WHERE id IN (?,?) AND banned=1',m.player_a,m.player_b))fail('Игрок заблокирован',409);
  if(!m.tournament_id){const [da,dbb]=rateFriendly(db,m);db.run("UPDATE matches SET status='CONFIRMED',winner=?,loser=?,confirmed_at=?,confirmed_by=?,rating_system='FRIENDLY',rating_change_a=?,rating_change_b=? WHERE id=?",m.score_a>m.score_b?m.player_a:m.player_b,m.score_a>m.score_b?m.player_b:m.player_a,now(),m.player_b,da,dbb,m.id);return db.get('SELECT * FROM matches WHERE id=?',m.id);}
  const a=db.get('SELECT * FROM ratings WHERE user_id=?',m.player_a),b=db.get('SELECT * FROM ratings WHERE user_id=?',m.player_b);const c=config(db);const aWins=m.score_a>m.score_b;
  const deltaA=0,deltaB=0;
  const winner=aWins?m.player_a:m.player_b,loser=aWins?m.player_b:m.player_a;
  const cooldown=new Date(Date.now()-c.pairCooldownMinutes*60_000).toISOString();
  const pairRecent=db.get("SELECT id FROM matches WHERE status='CONFIRMED' AND confirmed_at>? AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?))",cooldown,m.player_a,m.player_b,m.player_b,m.player_a);
  const day=new Date().toISOString().slice(0,10);const rewardEligible=!!m.tournament_id||!pairRecent&&[m.player_a,m.player_b].every(u=>db.get("SELECT COUNT(*) n FROM matches WHERE status='CONFIRMED' AND reward_eligible=1 AND confirmed_at>=? AND (player_a=? OR player_b=?)",day,u,u).n<c.dailyRewardMatches);
  if(m.tournament_id){const card=awardPlayerCard(db,winner,loser);notify(db,winner,'STICKER_RECEIVED',`В коллекцию добавлена карточка игрока ${card.name}`);}
  for(const [u,old,delta,win] of [[m.player_a,a,deltaA,aWins],[m.player_b,b,deltaB,!aWins]] as const){
    const rating=Math.max(0,old.rating+delta),streak=win?old.streak+1:0;
    db.run('UPDATE ratings SET rating=?,highest_rating=MAX(highest_rating,?),games=games+1,wins=wins+?,losses=losses+?,streak=?,longest_streak=MAX(longest_streak,?) WHERE user_id=?',rating,rating,win?1:0,win?0:1,streak,streak,u);
    // Tournament ratings are processed together when the tournament finishes.
    const amount=matchReward(win,rewardEligible,c);if(amount)credit(db,u,amount,win?'MATCH_WIN':'MATCH_LOSS',m.id,win?'Победа в матче':'Участие в матче');
    achievements(db,u,{giant_slayer:win&&((win===aWins?b:a).rating-old.rating>=200)?1:0});notify(db,u,'MATCH_RESULT',`${win?'Победа':'Матч завершён'} · +${amount} пинг поинтов. Рейтинг обновится после турнира.`);
  }
  if(!rewardEligible)audit(db,null,'REWARD_LIMIT',m.id,{players:[m.player_a,m.player_b],reason:pairRecent?'pair cooldown':'daily cap'});
  db.run("UPDATE matches SET status='CONFIRMED',winner=?,loser=?,confirmed_at=?,rating_change_a=?,rating_change_b=?,reward_eligible=?,rating_system='TOURNAMENT' WHERE id=?",winner,loser,now(),Math.max(0,a.rating+deltaA)-a.rating,Math.max(0,b.rating+deltaB)-b.rating,rewardEligible?1:0,m.id);
  return db.get('SELECT * FROM matches WHERE id=?',m.id);
}
export function confirmMatch(db:Store,user:string,matchId:string){return db.tx(()=>{const m=requireRow(db.get('SELECT * FROM matches WHERE id=?',matchId));if(m.tournament_id||m.player_b!==user)fail('Только соперник может подтвердить матч',403);if(db.get('SELECT id FROM users WHERE id IN (?,?) AND banned=1',m.player_a,m.player_b))fail('Игрок заблокирован',409);return settleMatch(db,matchId);});}
