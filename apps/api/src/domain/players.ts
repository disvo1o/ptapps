import { Store, requireRow } from '../db.js';
import { balance, config } from './economy.js';
import { league } from './rating.js';
export const playerSelect=`SELECT u.id,u.username,u.role,u.banned,u.created_at,p.display_name,p.avatar,p.profile_photo,p.city,p.country,p.bio,r.* FROM users u JOIN profiles p ON p.user_id=u.id JOIN ratings r ON r.user_id=u.id`;
export function player(db:Store,user:string,privateData=false){const p=requireRow(db.get(`${playerSelect} WHERE u.id=?`,user));const collection=db.get("SELECT COUNT(*) n FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id WHERE user_id=? AND quantity>0 AND s.type='COLLECTION'",user).n;const result={...p,league:league(p.rating,config(db)),collection,win_rate:p.games?Math.round(p.wins/p.games*100):0};if(privateData) return {...result,pingpoints:balance(db,user),telegram_id:db.get('SELECT telegram_id FROM users WHERE id=?',user).telegram_id};delete result.banned;return result;}
