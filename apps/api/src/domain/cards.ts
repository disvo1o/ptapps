import { Store, now, fail } from '../db.js';

export const playerCardId=(user:string)=>`card-${user}`;
export function ensurePlayerCards(db:Store){
  db.run(`INSERT OR IGNORE INTO stickers(id,name,description,image_url,rarity,type,owner_id,created_at)
    SELECT 'card-'||u.id,p.display_name,'Карточка игрока','', 'COMMON','COLLECTION',u.id,?
    FROM users u JOIN profiles p ON p.user_id=u.id
    WHERE u.banned=0 AND COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0`,now());
}
export const cardSelect=`SELECT s.*,p.display_name name,p.display_name,p.profile_photo,p.avatar,r.rating,r.games,r.wins,r.losses,r.streak,r.tournament_wins,CASE WHEN r.games>0 THEN ROUND(100.0*r.wins/r.games) ELSE 0 END win_rate,u.username FROM stickers s JOIN users u ON u.id=s.owner_id JOIN profiles p ON p.user_id=u.id JOIN ratings r ON r.user_id=u.id AND COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0 AND s.id='card-'||u.id`;
export function playerCards(db:Store,user?:string){
  ensurePlayerCards(db);
  return user?db.all(`${cardSelect.replace('SELECT s.*','SELECT s.*,COALESCE(us.quantity,0) quantity')} LEFT JOIN user_stickers us ON us.sticker_id=s.id AND us.user_id=? WHERE u.banned=0 ORDER BY p.display_name,u.id`,user):db.all(`${cardSelect} WHERE u.banned=0 ORDER BY p.display_name,u.id`);
}
export function awardPlayerCard(db:Store,matchId:string){
 const m=db.get("SELECT * FROM matches WHERE id=? AND status='CONFIRMED'",matchId);
 if(!m||!m.tournament_id||!db.get("SELECT 1 FROM tournament_matches WHERE match_id=? AND tournament_id=?",m.id,m.tournament_id)||m.score_a===m.score_b||m.player_a===m.player_b)fail('Карточка доступна только за подтверждённую победу на турнире',409);
 const winner=m.score_a>m.score_b?m.player_a:m.player_b,opponent=winner===m.player_a?m.player_b:m.player_a;
 if(m.winner!==winner||m.loser!==opponent)fail('Неверный результат матча',409);
 if(db.get('SELECT 1 FROM player_preferences WHERE is_guest=1 AND user_id IN (?,?)',winner,opponent)||m.tournament_id&&db.get('SELECT 1 FROM tournaments WHERE id=? AND is_test=1',m.tournament_id))return;
 if(db.get('SELECT 1 FROM match_card_awards WHERE match_id=?',matchId))return;
 ensurePlayerCards(db);
 const card=db.get(`${cardSelect} WHERE s.id=? AND u.banned=0`,playerCardId(opponent));
 if(!card)fail('Карточка игрока недоступна',409);
 db.run('INSERT INTO match_card_awards(match_id,user_id,sticker_id,created_at) VALUES (?,?,?,?)',matchId,winner,card.id,now());
 db.run('INSERT INTO user_stickers VALUES (?,?,1,?,?) ON CONFLICT(user_id,sticker_id) DO UPDATE SET quantity=1,last_received_at=excluded.last_received_at WHERE user_stickers.quantity<1',winner,card.id,now(),now());
 return card;
}
export function uniquePlayerCount(db:Store,user:string){return db.get(`SELECT COUNT(*) n FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id JOIN users u ON u.id=s.owner_id WHERE us.user_id=? AND us.quantity>0 AND u.banned=0 AND s.id='card-'||u.id AND COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0`,user).n;}
