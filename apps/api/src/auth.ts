import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Store, id, now, fail } from './db.js';
import { credit } from './domain/economy.js';
export function validateTelegram(initData:string,token:string,clock=Date.now()){
  const params=new URLSearchParams(initData);const hash=params.get('hash');
  if([...params.keys()].length!==new Set(params.keys()).size)fail('Invalid Telegram authentication',401);
  if(!hash||! /^[a-f0-9]{64}$/i.test(hash))fail('Invalid Telegram authentication',401);
  params.delete('hash');const check=[...params.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(token).digest();
  const expected=createHmac('sha256',secret).update(check).digest();
  if(!timingSafeEqual(expected,Buffer.from(hash!,'hex')))fail('Invalid Telegram authentication',401);
  const date=Number(params.get('auth_date'));if(!date||clock/1000-date>3600||date-clock/1000>30)fail('Telegram session expired. Reopen PING in Telegram.',401);
  let json;try{json=JSON.parse(params.get('user')||'null');}catch{fail('Invalid Telegram user',401);}
  const parsed=z.object({id:z.number().int().positive().safe(),first_name:z.string().min(1).max(100),last_name:z.string().max(100).optional(),username:z.string().max(100).optional(),photo_url:z.string().url().optional()}).safeParse(json);
  if(!parsed.success)fail('Invalid Telegram user',401);return parsed.data!;
}
export function current(req:FastifyRequest):string{return (req.user as {sub:string}).sub;}
export function authorize(db:Store,req:FastifyRequest,roles:string[]){const u=db.get('SELECT role FROM users WHERE id=?',current(req));if(!u||!roles.includes(u.role))fail('You do not have permission for this action',403);}
export function authRoutes(app:FastifyInstance,db:Store,mock:boolean){
  app.get('/api/auth/config',async()=>({mock}));
  app.post('/api/auth/telegram',{config:{rateLimit:{max:30,timeWindow:'1 minute'}}},async(req,reply)=>{
    const input=z.object({initData:z.string().max(20000).optional(),demoId:z.string().max(64).optional()}).strict().parse(req.body||{});let userId:string;
    if(input.initData){
      if(!process.env.TELEGRAM_BOT_TOKEN)fail('Telegram authentication is not configured',503);
      const u=validateTelegram(input.initData!,process.env.TELEGRAM_BOT_TOKEN!);const existing=db.get('SELECT id FROM users WHERE telegram_id=?',String(u.id));
      userId=existing?.id||db.tx(()=>{const uid=id();db.run('INSERT INTO users VALUES (?,?,?,?,?,?)',uid,String(u.id),u.username||`player${u.id}`,'PLAYER',0,now());db.run('INSERT INTO profiles VALUES (?,?,?,?,?,?,?,?)',uid,[u.first_name,u.last_name].filter(Boolean).join(' '),null,u.photo_url?.startsWith('https://')?u.photo_url:null,'','','',now());db.run('INSERT INTO ratings(user_id) VALUES (?)',uid);credit(db,uid,100,'BONUS','registration','Welcome to PING');return uid;});
    }else{if(!mock)fail('Open PING inside Telegram to sign in',401);userId=input.demoId||'alex';if(!db.get("SELECT id FROM users WHERE id=? AND telegram_id LIKE 'demo-%'",userId))fail('Demo user not found',404);}
    if(db.get('SELECT banned FROM users WHERE id=?',userId)?.banned)fail('This account is suspended',403);
    const token=app.jwt.sign({sub:userId},{expiresIn:'12h'});reply.setCookie('ping_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.APP_ENV==='production',path:'/',maxAge:43200});return {ok:true};
  });
  app.post('/api/auth/logout',async(_req,reply)=>{reply.clearCookie('ping_session',{path:'/'});return {ok:true};});
  app.get('/api/auth/demo-users',async()=>{if(!mock)fail('Not found',404);return db.all("SELECT u.id,p.display_name,u.role FROM users u JOIN profiles p ON p.user_id=u.id WHERE telegram_id LIKE 'demo-%' ORDER BY u.id='alex' DESC,p.display_name");});
}
