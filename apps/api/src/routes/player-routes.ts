import { playerCards } from '../domain/cards.js';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Store, now, fail } from '../db.js';
import { current } from '../auth.js';
import { player, playerSelect, playerStatistics } from '../domain/players.js';
import { config } from '../domain/economy.js';
import { ratingModel } from '../domain/skill-rating.js';
import { league } from '../domain/rating.js';
import { confirmMatch, submitMatch } from '../domain/matches.js';
export const entityId=z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const keySchema=z.string().min(8).max(100);
const pagination=z.object({limit:z.coerce.number().int().min(1).max(100).default(50),offset:z.coerce.number().int().min(0).max(100000).default(0)});
export const pathId=(p:unknown)=>z.object({id:entityId}).parse(p).id;
export const scoreSchema=z.object({score_a:z.number().int().min(0).max(99),score_b:z.number().int().min(0).max(99)});
export const matchList=(db:Store,user:string,limit=50,offset=0)=>db.all(`SELECT m.*,CASE WHEN m.tournament_id IS NULL THEN 1 ELSE EXISTS(SELECT 1 FROM tournament_matches tm WHERE tm.match_id=m.id AND tm.score_a IS NOT NULL) END score_recorded,pa.display_name name_a,pb.display_name name_b FROM matches m JOIN profiles pa ON pa.user_id=m.player_a JOIN profiles pb ON pb.user_id=m.player_b WHERE (player_a=? OR player_b=?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,user,user,limit,offset);
export function playerRoutes(app:FastifyInstance,db:Store){
  app.get('/api/me',async req=>player(db,current(req),true));
  app.get('/api/rating-system',async()=>({...config(db),...ratingModel}));
  app.patch('/api/me/profile',async req=>{
    const photo=z.string().max(750000).refine(v=>v===''||/^https:\/\//.test(v)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),'Используй HTTPS-ссылку или фото PNG, JPEG, WebP');
    const p=z.object({display_name:z.string().trim().min(1).max(50),bio:z.string().trim().max(300),profile_photo:photo.optional(),registration_mode:z.enum(['QR','NAME']).optional()}).strict().parse(req.body);
    db.run('UPDATE profiles SET display_name=?,bio=?,profile_photo=COALESCE(?,profile_photo),updated_at=? WHERE user_id=?',p.display_name,p.bio,p.profile_photo??null,now(),current(req)); if(p.registration_mode)db.run("INSERT INTO player_preferences(user_id,registration_mode) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET registration_mode=excluded.registration_mode",current(req),p.registration_mode);return player(db,current(req),true);
  });
  app.get('/api/players',async req=>{const q=pagination.extend({search:z.string().max(100).default('')}).parse(req.query);return db.all(`${playerSelect} WHERE u.banned=0 AND COALESCE(pp.is_guest,0)=0 AND (p.display_name LIKE ? OR u.username LIKE ?) ORDER BY r.rating DESC LIMIT ? OFFSET ?`,`%${q.search}%`,`%${q.search}%`,q.limit,q.offset).map(p=>({...p,league:league(p.rating,config(db))}));});
  app.get('/api/players/:id',async req=>{const uid=pathId(req.params);const other=player(db,uid);const matches=db.all("SELECT m.*,CASE WHEN m.tournament_id IS NULL THEN 1 ELSE EXISTS(SELECT 1 FROM tournament_matches tm WHERE tm.match_id=m.id AND tm.score_a IS NOT NULL) END score_recorded,pa.display_name name_a,pb.display_name name_b FROM matches m JOIN profiles pa ON pa.user_id=m.player_a JOIN profiles pb ON pb.user_id=m.player_b WHERE status='CONFIRMED' AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?)) ORDER BY confirmed_at DESC",current(req),uid,uid,current(req));return {...other,head_to_head:{games:matches.length,wins:matches.filter(m=>m.winner===current(req)).length,losses:matches.filter(m=>m.loser===current(req)).length,matches:matches.slice(0,10)}};});
  app.get('/api/leaderboard',async req=>{const q=pagination.extend({metric:z.enum(['rating','friendly','streak','collectors']).default('rating')}).parse(req.query);const order={rating:'rating',friendly:'friendly_rating',streak:'streak',collectors:'collection'}[q.metric];return db.all(`SELECT u.id,p.display_name,p.avatar,p.profile_photo,r.rating,r.rating_deviation,r.friendly_rating,r.friendly_games,r.streak,(SELECT COUNT(DISTINCT s.owner_id) FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id JOIN users owner ON owner.id=s.owner_id WHERE us.user_id=u.id AND us.quantity>0 AND s.owner_id IS NOT NULL AND owner.banned=0 AND (s.id LIKE 'card-%' OR s.id LIKE 'victory-%')) collection FROM users u JOIN profiles p ON p.user_id=u.id JOIN ratings r ON r.user_id=u.id WHERE u.banned=0 AND COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0 ORDER BY ${order} DESC,${q.metric==='friendly'?'r.friendly_games':'r.rating'} DESC,u.id LIMIT ? OFFSET ?`,q.limit,q.offset).map((p,i)=>({...p,rank:q.offset+i+1,league:league(p.rating,config(db))}));});
  app.get('/api/players/:id/statistics',async req=>{const uid=pathId(req.params),p=player(db,uid);return {player:{id:p.id,display_name:p.display_name},...playerStatistics(db,uid)};});
  app.get('/api/matches',async req=>{const q=pagination.extend({system:z.enum(['all','friendly']).default('all')}).parse(req.query);if(q.system==='friendly')return db.all("SELECT m.*,pa.display_name name_a,pb.display_name name_b FROM matches m JOIN profiles pa ON pa.user_id=m.player_a JOIN profiles pb ON pb.user_id=m.player_b WHERE m.tournament_id IS NULL AND m.rating_system='FRIENDLY' AND (player_a=? OR player_b=?) ORDER BY m.created_at DESC LIMIT ? OFFSET ?",current(req),current(req),q.limit,q.offset);return matchList(db,current(req),q.limit,q.offset);});
  app.post('/api/matches',async req=>{const p=scoreSchema.extend({opponent_id:entityId,request_key:keySchema}).strict().parse(req.body);return submitMatch(db,current(req),p.opponent_id,p.score_a,p.score_b,p.request_key);});
  app.post('/api/matches/:id/confirm',async req=>confirmMatch(db,current(req),pathId(req.params)));
  app.post('/api/matches/:id/reject',async req=>{const mid=pathId(req.params);const result=db.run("UPDATE matches SET status='REJECTED' WHERE id=? AND player_b=? AND status='PENDING' AND tournament_id IS NULL",mid,current(req));if(!result.changes)fail('Этот матч нельзя отклонить',409);return {ok:true};});
  app.post('/api/matches/:id/cancel',async req=>{const result=db.run("UPDATE matches SET status='CANCELLED' WHERE id=? AND player_a=? AND status='PENDING' AND tournament_id IS NULL",pathId(req.params),current(req));if(!result.changes)fail('Этот матч нельзя отменить',409);return {ok:true};});
  app.get('/api/stickers',async()=>playerCards(db));
  app.get('/api/me/stickers',async req=>playerCards(db,current(req)));
  app.get('/api/me/achievements',async req=>db.all('SELECT a.*,ua.created_at unlocked_at FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id=a.id AND ua.user_id=? ORDER BY ua.created_at DESC,a.threshold',current(req)));
  app.get('/api/seasons/current',async()=>db.get("SELECT * FROM seasons WHERE status='CURRENT'")||null);
}
