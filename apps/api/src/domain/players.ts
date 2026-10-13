import { handicapBalance } from './resources.js';
import { uniquePlayerCount } from './cards.js';
import { Store, requireRow } from '../db.js';
import { config } from './economy.js';
import { league } from './rating.js';
export const playerSelect=`SELECT u.id,u.username,u.role,u.banned,u.created_at,p.display_name,p.avatar,p.profile_photo,p.bio,COALESCE(pp.registration_mode,'QR') registration_mode,COALESCE(pp.handicap,0) handicap,COALESCE(pp.is_guest,0) is_guest,r.* FROM users u JOIN profiles p ON p.user_id=u.id LEFT JOIN player_preferences pp ON pp.user_id=u.id JOIN ratings r ON r.user_id=u.id`;
export function playerStatistics(db:Store,user:string){
 return {
  tournaments:db.get("SELECT COUNT(DISTINCT tp.tournament_id) n FROM tournament_players tp JOIN tournaments t ON t.id=tp.tournament_id WHERE tp.user_id=? AND t.is_test=0 AND t.status IN ('LIVE','FINISHED')",user).n,
  wins:db.get("SELECT COUNT(*) n FROM matches m WHERE m.winner=? AND m.status='CONFIRMED' AND NOT EXISTS(SELECT 1 FROM tournaments t WHERE t.id=m.tournament_id AND t.is_test=1) AND NOT EXISTS(SELECT 1 FROM player_preferences pp WHERE pp.is_guest=1 AND pp.user_id IN (m.player_a,m.player_b))",user).n,
  tournament_wins:db.get("SELECT COUNT(*) n FROM tournaments WHERE champion_id=? AND status='FINISHED' AND is_test=0",user).n
 };
}
export function player(db:Store,user:string,privateData=false){const p=requireRow(db.get(`${playerSelect} WHERE u.id=?`,user));const collection=uniquePlayerCount(db,user);const result={...p,statistics:playerStatistics(db,user),tournament_rating:p.rating,is_superadmin:db.get("SELECT value FROM config WHERE key='superadmin_telegram_id'")?.value===db.get('SELECT telegram_id FROM users WHERE id=?',user)?.telegram_id,league:league(p.rating,config(db)),collection,win_rate:p.games?Math.round(p.wins/p.games*100):0};if(privateData) return {...result,handicap_balance:handicapBalance(db,user),telegram_id:db.get('SELECT telegram_id FROM users WHERE id=?',user).telegram_id};delete result.banned;return result;}
