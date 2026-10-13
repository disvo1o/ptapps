import { Store, now } from '../db.js';
import { defaults, type GameConfig } from './rating.js';
import { uniquePlayerCount } from './cards.js';
export const rarities=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'] as const;
export function config(db:Store):GameConfig{const saved=JSON.parse(db.get('SELECT value FROM config WHERE key=?','game')?.value||'{}');return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,saved[key]??value])) as GameConfig;}
export function achievementEligible(a:{metric:string;threshold:number},stats:Record<string,number>){return (stats[a.metric]??0)>=a.threshold;}
// Retained for a future return of achievements; no currency or card rewards.
export function achievements(db:Store,user:string,extra:Record<string,number>={}){
 const stats={...db.get('SELECT * FROM ratings WHERE user_id=?',user),collection:uniquePlayerCount(db,user),...extra};
 for(const a of db.all('SELECT * FROM achievements'))if(achievementEligible(a,stats))db.run('INSERT OR IGNORE INTO user_achievements VALUES (?,?,?)',user,a.id,now());
}
