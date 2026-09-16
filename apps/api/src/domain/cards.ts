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
export function collectPlayerCard(db:Store,user:string,card:string){
  db.run('INSERT INTO user_stickers VALUES (?,?,1,?,?) ON CONFLICT(user_id,sticker_id) DO UPDATE SET quantity=1,last_received_at=excluded.last_received_at',user,card,now(),now());
}
export function awardPlayerCard(db:Store,winner:string,opponent:string){
  ensurePlayerCards(db);
  const card=db.get(`${cardSelect} WHERE s.id=? AND u.banned=0`,playerCardId(opponent));
  if(!card)fail('Карточка игрока недоступна',409);
  collectPlayerCard(db,winner,card.id);
  return card;
}
export function uniquePlayerCount(db:Store,user:string){return db.get(`SELECT COUNT(*) n FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id JOIN users u ON u.id=s.owner_id WHERE us.user_id=? AND us.quantity>0 AND u.banned=0 AND s.id='card-'||u.id AND COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0`,user).n;}
