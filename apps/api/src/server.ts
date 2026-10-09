import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
import { Store, fail } from './db.js';
import { authRoutes, current } from './auth.js';
import { playerRoutes } from './routes/player-routes.js';
import { tournamentRoutes } from './routes/tournament-routes.js';
import { venueRoutes } from './routes/venue-routes.js';
import { communityRoutes } from './routes/community-routes.js';
import { datingRoutes } from './routes/dating-routes.js';
import { bounceRoutes } from './routes/bounce-routes.js';
import { gameRoutes } from './routes/game-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
export async function createApp(db:Store,options:{mock?:boolean;logger?:boolean}={}){
 const production=process.env.APP_ENV==='production',mock=options.mock??(!production&&process.env.MOCK_TELEGRAM!=='false');
 if(production&&(mock||!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||process.env.JWT_SECRET.includes('replace-with')||!process.env.TELEGRAM_BOT_TOKEN||!process.env.WEB_URL?.startsWith('https://')))throw new Error('Production requires real Telegram auth, HTTPS WEB_URL and a strong JWT_SECRET');
 const app=Fastify({logger:options.logger??false,bodyLimit:1_000_000});
 await app.register(cookie);await app.register(jwt,{secret:process.env.JWT_SECRET||randomBytes(48).toString('hex'),cookie:{cookieName:'ping_session',signed:false}});await app.register(rateLimit,{max:mock?3000:300,timeWindow:'1 minute'});
 app.addHook('onRequest',async(req,reply)=>{reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','strict-origin-when-cross-origin');if(req.url.startsWith('/api/'))reply.header('Cache-Control','no-store');
   if(['POST','PATCH','PUT','DELETE'].includes(req.method)){const origin=req.headers.origin;const allowed=process.env.WEB_URL||'http://127.0.0.1:5173';if(origin&&origin!==allowed&&(!(!production&&origin==='http://localhost:5173')))fail('Недопустимый источник запроса',403);if(production&&!origin)fail('Открой приложение в Telegram',403);}
 });
 app.addHook('preHandler',async req=>{
   if(!req.url.startsWith('/api/')||req.url.startsWith('/api/auth/')||req.url==='/api/health')return;
   try{await req.jwtVerify({onlyCookie:!req.headers.authorization});}catch{fail('Открой приложение заново, чтобы войти',401);}
   const sid=(req.user as any).sid;if(sid&&!db.get('SELECT 1 FROM web_sessions WHERE hash=? AND expires_at>?',sid,new Date().toISOString()))fail('Сессия завершена',401);
   const u=db.get('SELECT id,banned FROM users WHERE id=?',current(req));if(!u)fail('Открой приложение заново, чтобы войти',401);if(u.banned)fail('Аккаунт заблокирован',403);
 });
 app.setErrorHandler((err,req,reply)=>{if(err instanceof ZodError)return reply.code(400).send({error:'Проверь заполненные поля: обязательные значения, формат и допустимые ограничения.'});const e=err as Error & {statusCode?:number};const status=e.statusCode&&e.statusCode>=400&&e.statusCode<500?e.statusCode:500;if(status===500)req.log.error(err);return reply.code(status).send({error:status===500?'Не удалось выполнить действие. Попробуй ещё раз.':status===429?'Слишком много запросов. Подожди минуту и повтори.':e.message});});
 app.get('/api/health',async()=>({ok:true,database:!!db.get('SELECT 1')}));authRoutes(app,db,mock);playerRoutes(app,db);tournamentRoutes(app,db);adminRoutes(app,db);venueRoutes(app,db);gameRoutes(app,db);communityRoutes(app,db);datingRoutes(app,db);bounceRoutes(app,db);
 const dist=resolve('dist/web');if(existsSync(dist)){await app.register(staticFiles,{root:dist});app.setNotFoundHandler((req,reply)=>req.url.startsWith('/api/')?reply.code(404).send({error:'Не найдено'}):reply.sendFile('index.html'));}
 await app.ready();return app;
}
