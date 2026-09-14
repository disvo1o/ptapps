import { Store, now, fail } from '../db.js';

const editions=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'] as const;
// Editions have cosmetic rarity only: every registered player can appear in every pack.
export function ensurePlayerCards(db:Store){
  const season=db.get("SELECT id FROM seasons WHERE status='CURRENT'")?.id||null;
  for(const p of db.all("SELECT u.id,p.display_name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.banned=0 AND NOT EXISTS (SELECT 1 FROM stickers s WHERE s.id='victory-'||u.id)")){
    for(const rarity of editions)db.run("INSERT OR IGNORE INTO stickers(id,name,description,image_url,rarity,season,type,owner_id,created_at) VALUES (?,?,?,?,?,?,'COLLECTION',?,?)",`card-${p.id}-${rarity}`,p.display_name,'Карточка игрока пинг таблет. Характеристики обновляются после турниров.','',rarity,season,p.id,now());
    db.run("INSERT OR IGNORE INTO stickers(id,name,description,image_url,rarity,season,type,owner_id,created_at) VALUES (?,?,?,?,?,?,'BATTLE',?,?)",`victory-${p.id}`,p.display_name,'Карточка соперника, которого ты победил на турнире.','', 'RARE',season,p.id,now());
  }
}
export const cardSelect=`SELECT s.*,p.display_name name,p.display_name,p.profile_photo,p.avatar,r.rating,r.games,r.wins,r.losses,r.streak,r.tournament_wins,CASE WHEN r.games>0 THEN ROUND(100.0*r.wins/r.games) ELSE 0 END win_rate,u.username FROM stickers s JOIN users u ON u.id=s.owner_id JOIN profiles p ON p.user_id=u.id JOIN ratings r ON r.user_id=u.id`;
export function playerCards(db:Store,user?:string){
  ensurePlayerCards(db);
  return user?db.all(`${cardSelect.replace('SELECT s.*','SELECT s.*,COALESCE(us.quantity,0) quantity')} LEFT JOIN user_stickers us ON us.sticker_id=s.id AND us.user_id=? WHERE u.banned=0 AND (s.id LIKE 'card-%' OR s.id LIKE 'victory-%') ORDER BY s.type,p.display_name,s.rarity`,user):db.all(`${cardSelect} WHERE u.banned=0 AND s.type='COLLECTION' AND s.id LIKE 'card-%' ORDER BY p.display_name,s.rarity`);
}
export function awardPlayerCard(db:Store,winner:string,opponent:string){
  if(!db.get('SELECT id FROM users WHERE id=?',opponent))fail('Игрок не найден',404);
  ensurePlayerCards(db);
  const card=db.get(`${cardSelect} WHERE s.id=?`,`victory-${opponent}`);
  if(!card)fail('Карточка игрока недоступна',409);
  db.run('INSERT INTO user_stickers VALUES (?,?,1,?,?) ON CONFLICT(user_id,sticker_id) DO UPDATE SET quantity=quantity+1,last_received_at=excluded.last_received_at',winner,card.id,now(),now());
  return card;
}
export function uniquePlayerCount(db:Store,user:string){return db.get("SELECT COUNT(DISTINCT s.owner_id) n FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id JOIN users u ON u.id=s.owner_id WHERE us.user_id=? AND us.quantity>0 AND u.banned=0 AND (s.id LIKE 'card-%' OR s.id LIKE 'victory-%')",user).n;}
