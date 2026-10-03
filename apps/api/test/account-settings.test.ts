import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Store } from '../src/db.js';
import { createApp } from '../src/server.js';
import { russianMessage } from '../src/russian.js';
const stores:Store[]=[];afterEach(()=>{stores.splice(0).forEach(s=>s.close());});
function database(){const db=new Store(':memory:');stores.push(db);return db;}
function sign(user:{id:number;username:string;first_name:string},token:string){const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify(user)}),check=[...params].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n'),secret=createHmac('sha256','WebAppData').update(token).digest();params.set('hash',createHmac('sha256',secret).update(check).digest('hex'));return params.toString();}
describe('account migration and owner identity',()=>{
 it('starts at the 1200 prior and preserves established ratings',()=>{const db=database();db.db.exec(readFileSync(new URL('../../../database/migrations/001_initial.sql',import.meta.url),'utf8'));db.db.exec("CREATE TABLE schema_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES ('001','today')");for(const user of ['new','played'])db.run("INSERT INTO users VALUES (?,?,?,'PLAYER',0,'today')",user,user,user);db.run("INSERT INTO ratings(user_id) VALUES ('new')");db.run("INSERT INTO ratings(user_id,rating,highest_rating,games) VALUES ('played',1030,1040,3)");db.migrate();db.migrate();expect(db.get("SELECT rating FROM ratings WHERE user_id='new'").rating).toBe(1200);expect(db.get("SELECT rating FROM ratings WHERE user_id='played'").rating).toBe(1030);});
 it('pins the superadmin to the verified Telegram ID',async()=>{const db=database();db.migrate();const old=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN='test-token-with-no-real-service';const app=await createApp(db,{mock:true});try{const login=async(id:number,username:string)=>app.inject({method:'POST',url:'/api/auth/telegram',payload:{initData:sign({id,username,first_name:'Тест'},process.env.TELEGRAM_BOT_TOKEN!)}});expect((await login(123,'disvolo')).statusCode).toBe(200);expect(db.get("SELECT role FROM users WHERE telegram_id='123'").role).toBe('ADMIN');expect(db.get("SELECT value FROM config WHERE key='superadmin_telegram_id'").value).toBe('123');expect((await login(123,'renamed')).statusCode).toBe(200);expect((await login(456,'disvolo')).statusCode).toBe(200);expect(db.get("SELECT role FROM users WHERE telegram_id='456'").role).toBe('PLAYER');expect(db.get("SELECT rating FROM ratings JOIN users ON users.id=ratings.user_id WHERE telegram_id='456'").rating).toBe(1200);}finally{await app.close();if(old===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=old;}});
 it('translates historical notifications',()=>{expect(russianMessage('Victory · +20 rating · +30 PP')).toBe('Победа · +20 рейтинга · +30 пинг поинтов');expect(russianMessage('Клубный турнир finished · +100 PP')).toBe('Клубный турнир завершён · +100 пинг поинтов');});
});

it('keeps verified Telegram sessions working when the webview drops cookies',async()=>{
 const db=database();db.migrate();const old=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN='test-token-with-no-real-service';const app=await createApp(db,{mock:false});
 try{
  const login=await app.inject({method:'POST',url:'/api/auth/telegram',payload:{initData:sign({id:789,username:'cookie_test',first_name:'Тест'},process.env.TELEGRAM_BOT_TOKEN!)}});
  expect(login.statusCode).toBe(200);const token=login.json().token;
  expect(typeof token).toBe('string');
  expect((await app.inject({url:'/api/me'})).statusCode).toBe(401);
  const me=await app.inject({url:'/api/me',headers:{authorization:`Bearer ${token}`}});
  expect(me.statusCode).toBe(200);expect(me.json().username).toBe('cookie_test');
  expect((await app.inject({url:'/api/me',cookies:{ping_session:login.cookies[0].value}})).statusCode).toBe(200);
  expect((await app.inject({url:'/api/me',headers:{authorization:'Bearer invalid'}})).statusCode).toBe(401);
  expect((await app.inject({url:'/api/admin/overview',headers:{authorization:`Bearer ${token}`}})).statusCode).toBe(403);
  const uid=db.get("SELECT id FROM users WHERE telegram_id='789'").id;
  const expired=app.jwt.sign({sub:uid},{expiresIn:-1});
  expect((await app.inject({url:'/api/me',headers:{authorization:`Bearer ${expired}`}})).statusCode).toBe(401);
  db.run('UPDATE users SET banned=1 WHERE id=?',uid);
  expect((await app.inject({url:'/api/me',headers:{authorization:`Bearer ${token}`}})).statusCode).toBe(403);
 }finally{await app.close();if(old===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=old;}
});
