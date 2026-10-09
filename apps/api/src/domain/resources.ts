import {Store,id,now,fail} from '../db.js';
export function handicapBalance(db:Store,user:string){return db.get('SELECT COALESCE(SUM(amount),0) n FROM resource_transactions WHERE user_id=?',user).n as number;}
export function handicapCredit(db:Store,user:string,amount:number,reason:string,reference:string,actor:string|null=null){
 if(db.get('SELECT 1 FROM resource_transactions WHERE user_id=? AND reference_id=?',user,reference))return false;
 if(handicapBalance(db,user)+amount<0)fail('Недостаточно форы',409);
 db.run("INSERT INTO resource_transactions VALUES (?,?,'HANDICAP',?,?,?,?,?)",id(),user,amount,reason,reference,actor,now());return true;
}
