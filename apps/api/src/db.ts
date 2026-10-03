import { russianMessage } from './russian.js';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export class Store {
  db: DatabaseSync;
  path: string;
  constructor(url = process.env.DATABASE_URL || 'file:./.data/ping.sqlite') {
    if (!url.startsWith('file:') && url !== ':memory:') throw new Error('This local adapter requires DATABASE_URL=file:...');
    const path = url === ':memory:' ? url : resolve(url.slice(5));
    this.path=path;
    if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }
  run(sql:string,...args:SQLInputValue[]) { return this.db.prepare(sql).run(...args); }
  get<T=any>(sql:string,...args:SQLInputValue[]):T | undefined { return this.db.prepare(sql).get(...args) as T | undefined; }
  all<T=any>(sql:string,...args:SQLInputValue[]):T[] { return this.db.prepare(sql).all(...args) as T[]; }
  tx<T>(fn:()=>T):T { this.db.exec('BEGIN IMMEDIATE'); try { const result=fn();this.db.exec('COMMIT');return result; } catch(e){this.db.exec('ROLLBACK');throw e;} }
  migrate(){
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const directory=new URL('../../../database/migrations/',import.meta.url);
    const files=readdirSync(directory).filter(f=>/^\d+_.+\.sql$/.test(f)).sort();
    const pending=files.filter(f=>!this.get('SELECT version FROM schema_migrations WHERE version=?',f.split('_')[0]));
    if(pending.length&&this.path!==':memory:'&&this.get('SELECT 1 FROM schema_migrations LIMIT 1')){const backupDirectory=resolve(dirname(this.path),'backups');mkdirSync(backupDirectory,{recursive:true});const backup=resolve(backupDirectory,`before-${pending[0].split('_')[0]}-${Date.now()}.sqlite`);this.db.prepare('VACUUM INTO ?').run(backup);}
    for(const file of files){
      const version=file.split('_')[0];
      if(!this.get('SELECT version FROM schema_migrations WHERE version=?',version))this.tx(()=>{
        this.db.exec(readFileSync(new URL(file,directory),'utf8'));
        this.run('INSERT INTO schema_migrations VALUES (?,?)',version,now());
      });
    }
  }
  close(){this.db.close();}
}
export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
export const fail=(message:string,statusCode=400):never=>{throw Object.assign(new Error(message),{statusCode});};
export function requireRow<T>(row:T,message='Not found'):NonNullable<T> { if(!row)fail(message,404); return row as NonNullable<T>; }
export function audit(db:Store,actor:string|null,action:string,entity:string|null,detail:unknown){db.run('INSERT INTO admin_logs VALUES (?,?,?,?,?,?)',id(),actor,action,entity,JSON.stringify(detail),now());}
export function notify(db:Store,user:string,type:string,message:string){db.run('INSERT INTO notifications(id,user_id,type,message,created_at) VALUES (?,?,?,?,?)',id(),user,type,russianMessage(message),now());}
