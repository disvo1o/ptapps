import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export class Store {
  db: DatabaseSync;
  constructor(url = process.env.DATABASE_URL || 'file:./.data/ping.sqlite') {
    if (!url.startsWith('file:') && url !== ':memory:') throw new Error('This local adapter requires DATABASE_URL=file:...');
    const path = url === ':memory:' ? url : resolve(url.slice(5));
    if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }
  run(sql:string,...args:SQLInputValue[]) { return this.db.prepare(sql).run(...args); }
  get<T=any>(sql:string,...args:SQLInputValue[]):T | undefined { return this.db.prepare(sql).get(...args) as T | undefined; }
  all<T=any>(sql:string,...args:SQLInputValue[]):T[] { return this.db.prepare(sql).all(...args) as T[]; }
  tx<T>(fn:()=>T):T { this.db.exec('BEGIN IMMEDIATE'); try { const result=fn();this.db.exec('COMMIT');return result; } catch(e){this.db.exec('ROLLBACK');throw e;} }
  migrate(){this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');if(!this.get('SELECT version FROM schema_migrations WHERE version=?','001'))this.tx(()=>{this.db.exec(readFileSync(new URL('../../../database/migrations/001_initial.sql',import.meta.url),'utf8'));this.run('INSERT INTO schema_migrations VALUES (?,?)','001',now());});}
  close(){this.db.close();}
}
export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
export const fail=(message:string,statusCode=400):never=>{throw Object.assign(new Error(message),{statusCode});};
export function requireRow<T>(row:T,message='Not found'):NonNullable<T> { if(!row)fail(message,404); return row as NonNullable<T>; }
export function audit(db:Store,actor:string|null,action:string,entity:string|null,detail:unknown){db.run('INSERT INTO admin_logs VALUES (?,?,?,?,?,?)',id(),actor,action,entity,JSON.stringify(detail),now());}
export function notify(db:Store,user:string,type:string,message:string){db.run('INSERT INTO notifications(id,user_id,type,message,created_at) VALUES (?,?,?,?,?)',id(),user,type,message,now());}
