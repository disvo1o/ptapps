import {issueSession,upsertTelegram,webAuthRoutes} from './web-auth.js';
import {createHash} from 'node:crypto';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Store, id, now, fail } from './db.js';
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
  webAuthRoutes(app,db);
  app.get('/api/auth/config',async()=>({mock,oidc:!!(process.env.TELEGRAM_LOGIN_CLIENT_ID&&process.env.TELEGRAM_LOGIN_CLIENT_SECRET)}));
  app.post('/api/auth/telegram',{config:{rateLimit:{max:mock?300:30,timeWindow:'1 minute'}}},async(req,reply)=>{
    const input=z.object({initData:z.string().max(20000).optional(),demoId:z.string().max(64).optional()}).strict().parse(req.body||{});let userId:string;
    if(input.initData){
      if(!process.env.TELEGRAM_BOT_TOKEN)fail('Авторизация Telegram пока не настроена',503);
      const u=validateTelegram(input.initData!,process.env.TELEGRAM_BOT_TOKEN!);userId=upsertTelegram(db,u);
    }else{if(!mock)fail('Открой пинг таблет внутри Telegram, чтобы войти',401);userId=input.demoId||'alex';if(!db.get("SELECT id FROM users WHERE id=? AND telegram_id LIKE 'demo-%'",userId))fail('Демо-игрок не найден',404);}
    if(db.get('SELECT banned FROM users WHERE id=?',userId)?.banned)fail('Этот аккаунт заблокирован',403);
    return issueSession(app,db,reply,userId);
  });
  app.post('/api/auth/logout',async(req,reply)=>{const raw=req.cookies.ping_refresh;if(raw)db.run('DELETE FROM web_sessions WHERE hash=?',createHash('sha256').update(raw).digest('hex'));try{await req.jwtVerify({onlyCookie:!req.headers.authorization});const sid=(req.user as any).sid;if(sid)db.run('DELETE FROM web_sessions WHERE hash=?',sid);}catch{}reply.clearCookie('ping_session',{path:'/'});reply.clearCookie('ping_refresh',{path:'/api/auth'});return {ok:true};});
  app.get('/api/auth/demo-users',async()=>{if(!mock)fail('Not found',404);return db.all("SELECT u.id,p.display_name,u.role FROM users u JOIN profiles p ON p.user_id=u.id WHERE telegram_id LIKE 'demo-%' ORDER BY u.id='alex' DESC,p.display_name");});
}
