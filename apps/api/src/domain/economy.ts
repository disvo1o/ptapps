import { randomInt } from 'node:crypto';
import { Store, id, now, fail, notify } from '../db.js';
import { defaults, type GameConfig } from './rating.js';
export const rarities=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'] as const;
export function config(db:Store):GameConfig{return {...defaults,...JSON.parse(db.get('SELECT value FROM config WHERE key=?','game')?.value||'{}')};}
export function balance(db:Store,user:string):number{return db.get('SELECT COALESCE(SUM(amount),0) balance FROM pingpoint_transactions WHERE user_id=?',user).balance;}
export function credit(db:Store,user:string,amount:number,type:string,ref:string,description:string){
  if(db.get('SELECT id FROM pingpoint_transactions WHERE user_id=? AND type=? AND reference_id=?',user,type,ref))return false;
  if(balance(db,user)+amount<0)fail('Not enough Pingpoints',409);
  db.run('INSERT INTO pingpoint_transactions VALUES (?,?,?,?,?,?,?)',id(),user,amount,type,ref,description,now());return true;
}
export function weightedRarity(weights:Record<string,number>,roll=randomInt(1_000_000)/1_000_000):string{
  const total=Object.values(weights).reduce((a,b)=>a+b,0);if(total<=0||Object.values(weights).some(v=>v<0))throw new Error('Invalid probabilities');
  let target=roll*total;for(const [rarity,weight] of Object.entries(weights)){target-=weight;if(target<0)return rarity;}return Object.keys(weights).at(-1)!;
}
export function awardSticker(db:Store,user:string,sticker:string){db.run('INSERT INTO user_stickers VALUES (?,?,1,?,?) ON CONFLICT(user_id,sticker_id) DO UPDATE SET quantity=quantity+1,last_received_at=excluded.last_received_at',user,sticker,now(),now());}
export function achievementEligible(a:{metric:string;threshold:number},stats:Record<string,number>){return (stats[a.metric]??0)>=a.threshold;}
export function achievements(db:Store,user:string,extra:Record<string,number>={}){
  const stats={...db.get('SELECT * FROM ratings WHERE user_id=?',user),collection:db.get("SELECT COUNT(*) n FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id WHERE user_id=? AND quantity>0 AND s.type='COLLECTION'",user).n,balance:balance(db,user),...extra};
  for(const a of db.all('SELECT * FROM achievements'))if(achievementEligible(a,stats)){
    const inserted=db.run('INSERT OR IGNORE INTO user_achievements VALUES (?,?,?)',user,a.id,now()).changes;
    if(inserted){credit(db,user,a.reward,'ACHIEVEMENT',a.id,a.name);notify(db,user,'ACHIEVEMENT',`Achievement unlocked: ${a.name} · +${a.reward} PP`);}
  }
}
export function openPack(db:Store,user:string,packId:string,key:string){return db.tx(()=>{
  const existing=db.get('SELECT * FROM pack_openings WHERE user_id=? AND request_key=?',user,key);
  if(existing){if(existing.pack_id!==packId)fail('This request key was already used for another pack',409);return {...existing,rewards:JSON.parse(existing.rewards),balance:balance(db,user)};}
  const pack=db.get('SELECT * FROM packs WHERE id=? AND active=1',packId);if(!pack)fail('Pack not found',404);
  const opening=id();credit(db,user,-pack.price,'PACK_PURCHASE',opening,`${pack.name} pack`);
  const rewards=[];for(let i=0;i<3;i++){
    const rarity=weightedRarity(JSON.parse(pack.probabilities));const choices=db.all("SELECT * FROM stickers WHERE rarity=? AND type='COLLECTION'",rarity);if(!choices.length)fail('This pack is temporarily unavailable',409);
    const sticker=choices[randomInt(choices.length)];awardSticker(db,user,sticker.id);rewards.push(sticker);
  }
  db.run('INSERT INTO pack_openings VALUES (?,?,?,?,?,?)',opening,user,packId,JSON.stringify(rewards),key,now());
  achievements(db,user);notify(db,user,'PACK_REWARD',`Opened ${pack.name}: ${rewards.map(s=>s.name).join(', ')}`);
  return {id:opening,rewards,balance:balance(db,user)};
});}
