import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Store, id, now, fail } from './db.js';
import { credit } from './domain/economy.js';
export function validateTelegram(initData:string,token:string,clock=Date.now()){
  const params=new URLSearchParams(initData);const hash=params.get('hash');
  if([...params.keys()].length!==new Set(params.keys()).size)fail('Не удалось проверить подпись Telegram',401);
  if(!hash||! /^[a-f0-9]{64}$/i.test(hash))fail('Не удалось проверить подпись Telegram',401);
  params.delete('hash');const check=[...params.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(token).digest();
  const expected=createHmac('sha256',secret).update(check).digest();
  if(!timingSafeEqual(expected,Buffer.from(hash!,'hex')))fail('Не удалось проверить подпись Telegram',401);
  const date=Number(params.get('auth_date'));if(!date||clock/1000-date>3600||date-clock/1000>30)fail('Сессия Telegram истекла. Открой пинг таблет заново в Telegram.',401);
  let json;try{json=JSON.parse(params.get('user')||'null');}catch{fail('Не удалось определить пользователя Telegram',401);}
  const parsed=z.object({id:z.number().int().positive().safe(),first_name:z.string().min(1).max(100),last_name:z.string().max(100).optional(),username:z.string().max(100).optional(),photo_url:z.string().url().optional()}).safeParse(json);
  if(!parsed.success)fail('Не удалось определить пользователя Telegram',401);return parsed.data!;
}
export function current(req:FastifyRequest):string{return (req.user as {sub:string}).sub;}
export function authorize(db:Store,req:FastifyRequest,roles:string[]){const u=db.get('SELECT role FROM users WHERE id=?',current(req));if(!u||!roles.includes(u.role))fail('У тебя нет прав для этого действия',403);}
export function authRoutes(app:FastifyInstance,db:Store,mock:boolean){
  app.get('/api/auth/config',async()=>({mock}));
  app.post('/api/auth/telegram',{config:{rateLimit:{max:30,timeWindow:'1 minute'}}},async(req,reply)=>{
    const input=z.object({initData:z.string().max(20000).optional(),demoId:z.string().max(64).optional()}).strict().parse(req.body||{});let userId:string;
    if(input.initData){
      if(!process.env.TELEGRAM_BOT_TOKEN)fail('Авторизация Telegram пока не настроена',503);
      const u=validateTelegram(input.initData!,process.env.TELEGRAM_BOT_TOKEN!);const existing=db.get('SELECT id FROM users WHERE telegram_id=?',String(u.id));
      userId=existing?.id||db.tx(()=>{const uid=id();db.run('INSERT INTO users VALUES (?,?,?,?,?,?)',uid,String(u.id),u.username||`player${u.id}`,'PLAYER',0,now());db.run('INSERT INTO profiles VALUES (?,?,?,?,?,?,?,?)',uid,[u.first_name,u.last_name].filter(Boolean).join(' '),null,u.photo_url?.startsWith('https://')?u.photo_url:null,'','','',now());db.run('INSERT INTO ratings(user_id,rating,highest_rating) VALUES (?,100,100)',uid);credit(db,uid,100,'BONUS','registration','Добро пожаловать в пинг таблет');return uid;});
      db.tx(()=>{
        db.run('UPDATE users SET username=? WHERE id=?',u.username||`player${u.id}`,userId);
        if(u.username?.toLowerCase()==='disvolo')db.run("INSERT OR IGNORE INTO config(key,value) VALUES ('superadmin_telegram_id',?)",String(u.id));
        if(db.get("SELECT value FROM config WHERE key='superadmin_telegram_id'")?.value===String(u.id))db.run("UPDATE users SET role='ADMIN',banned=0 WHERE id=?",userId);
      });
    }else{if(!mock)fail('Открой пинг таблет внутри Telegram, чтобы войти',401);userId=input.demoId||'alex';if(!db.get("SELECT id FROM users WHERE id=? AND telegram_id LIKE 'demo-%'",userId))fail('Демо-игрок не найден',404);}
    if(db.get('SELECT banned FROM users WHERE id=?',userId)?.banned)fail('Этот аккаунт заблокирован',403);
    const token=app.jwt.sign({sub:userId},{expiresIn:'12h'});reply.setCookie('ping_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.APP_ENV==='production',path:'/',maxAge:43200});return {ok:true,token};
  });
  app.post('/api/auth/logout',async(_req,reply)=>{reply.clearCookie('ping_session',{path:'/'});return {ok:true};});
  app.get('/api/auth/demo-users',async()=>{if(!mock)fail('Not found',404);return db.all("SELECT u.id,p.display_name,u.role FROM users u JOIN profiles p ON p.user_id=u.id WHERE telegram_id LIKE 'demo-%' ORDER BY u.id='alex' DESC,p.display_name");});
}
