import { Store, fail, id, now, requireRow, notify, audit } from '../db.js';
import { elo, matchReward } from './rating.js';
import { config, credit, awardSticker, achievements } from './economy.js';
export function validateScore(a:number,b:number){if(a===b||Math.max(a,b)<11||Math.abs(a-b)<2||(Math.max(a,b)>11&&Math.abs(a-b)!==2))fail('Use a completed game score: first to 11, win by 2');}
export function submitMatch(db:Store,user:string,opponent:string,a:number,b:number,key:string){return db.tx(()=>{
  validateScore(a,b);if(user===opponent)fail('Choose another player');
  if(!db.get('SELECT id FROM users WHERE id=? AND banned=0',opponent))fail('Player not found',404);
  const previous=db.get('SELECT * FROM matches WHERE request_key=?',`${user}:${key}`);if(previous){if(previous.player_b!==opponent||previous.score_a!==a||previous.score_b!==b)fail('Request key already used',409);return previous;}
  if(db.get("SELECT id FROM matches WHERE status='PENDING' AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?))",user,opponent,opponent,user))fail('У тебя уже есть неподтверждённый матч с этим игроком',409);
  const match=id();db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,status,created_at,request_key) VALUES (?,?,?,?,?,'PENDING',?,?)",match,user,opponent,a,b,now(),`${user}:${key}`);
  notify(db,opponent,'MATCH_PENDING','A match result is waiting for your confirmation');return db.get('SELECT * FROM matches WHERE id=?',match);
});}
// Called only inside the enclosing confirmation / tournament transaction.
export function settleMatch(db:Store,matchId:string){
  const m=requireRow(db.get('SELECT * FROM matches WHERE id=?',matchId));if(m.status==='CONFIRMED')return m;if(m.status!=='PENDING')fail('This result cannot be confirmed',409);
  const a=db.get('SELECT * FROM ratings WHERE user_id=?',m.player_a),b=db.get('SELECT * FROM ratings WHERE user_id=?',m.player_b);const c=config(db);const aWins=m.score_a>m.score_b;
  const deltaA=elo(a.rating,b.rating,a.games,aWins,c),deltaB=elo(b.rating,a.rating,b.games,!aWins,c);
  const winner=aWins?m.player_a:m.player_b,loser=aWins?m.player_b:m.player_a;
  const cooldown=new Date(Date.now()-c.pairCooldownMinutes*60_000).toISOString();
  const pairRecent=db.get("SELECT id FROM matches WHERE status='CONFIRMED' AND confirmed_at>? AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?))",cooldown,m.player_a,m.player_b,m.player_b,m.player_a);
  const day=new Date().toISOString().slice(0,10);const rewardEligible=!pairRecent&&[m.player_a,m.player_b].every(u=>db.get("SELECT COUNT(*) n FROM matches WHERE status='CONFIRMED' AND reward_eligible=1 AND confirmed_at>=? AND (player_a=? OR player_b=?)",day,u,u).n<c.dailyRewardMatches);
  for(const [u,old,delta,win] of [[m.player_a,a,deltaA,aWins],[m.player_b,b,deltaB,!aWins]] as const){
    const rating=Math.max(0,old.rating+delta),streak=win?old.streak+1:0;
    db.run('UPDATE ratings SET rating=?,highest_rating=MAX(highest_rating,?),games=games+1,wins=wins+?,losses=losses+?,streak=?,longest_streak=MAX(longest_streak,?) WHERE user_id=?',rating,rating,win?1:0,win?0:1,streak,streak,u);
    db.run('INSERT INTO rating_history VALUES (?,?,?,?,?,?)',id(),u,db.get("SELECT id FROM seasons WHERE status='CURRENT'")?.id||null,rating,m.id,now());
    const amount=matchReward(win,rewardEligible,c);if(amount)credit(db,u,amount,win?'MATCH_WIN':'MATCH_LOSS',m.id,win?'Match victory':'Match played');
    achievements(db,u,{giant_slayer:win&&((win===aWins?b:a).rating-old.rating>=200)?1:0});notify(db,u,'MATCH_RESULT',`${win?'Victory':'Match confirmed'} · ${rating-old.rating>=0?'+':''}${rating-old.rating} rating · +${amount} PP`);
  }
  if(rewardEligible){
    const signature=db.get("SELECT id FROM stickers WHERE type='BATTLE' AND owner_id=?",loser);
    if(signature){const held=db.get('SELECT quantity FROM user_stickers WHERE user_id=? AND sticker_id=?',loser,signature.id);if(held?.quantity>0)db.run('UPDATE user_stickers SET quantity=quantity-1 WHERE user_id=? AND sticker_id=?',loser,signature.id);awardSticker(db,winner,signature.id);notify(db,winner,'STICKER_RECEIVED','Ты получил боевой стикер соперника');}
  }else audit(db,null,'REWARD_LIMIT',m.id,{players:[m.player_a,m.player_b],reason:pairRecent?'pair cooldown':'daily cap'});
  db.run("UPDATE matches SET status='CONFIRMED',winner=?,loser=?,confirmed_at=?,rating_change_a=?,rating_change_b=?,reward_eligible=? WHERE id=?",winner,loser,now(),Math.max(0,a.rating+deltaA)-a.rating,Math.max(0,b.rating+deltaB)-b.rating,rewardEligible?1:0,m.id);
  return db.get('SELECT * FROM matches WHERE id=?',m.id);
}
export function confirmMatch(db:Store,user:string,matchId:string){return db.tx(()=>{const m=requireRow(db.get('SELECT * FROM matches WHERE id=?',matchId));if(m.tournament_id||m.player_b!==user)fail('Only the opponent can confirm this match',403);if(db.get('SELECT id FROM users WHERE id IN (?,?) AND banned=1',m.player_a,m.player_b))fail('A player is suspended',409);return settleMatch(db,matchId);});}
