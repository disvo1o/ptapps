import type { FastifyInstance } from 'fastify';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { Store, id, now, fail, requireRow } from '../db.js';
import { current } from '../auth.js';
import { GAME, replayFlight } from '../../../../shared/flappy.js';
import { pathId } from './player-routes.js';
export function gameRoutes(app:FastifyInstance,db:Store){
 app.get('/api/games',async req=>({best:db.get("SELECT COALESCE(MAX(score),0) score FROM game_sessions WHERE game='FLAPPY' AND user_id=?",current(req)).score,history:db.all("SELECT id,score,reward,finished_at FROM game_sessions WHERE game='FLAPPY' AND user_id=? AND score IS NOT NULL ORDER BY finished_at DESC LIMIT 20",current(req))}));
 app.post('/api/games/flappy/start',{config:{rateLimit:{max:30,timeWindow:'1 minute'}}},async req=>db.tx(()=>{const uid=current(req);db.run('UPDATE game_sessions SET finished_at=? WHERE user_id=? AND finished_at IS NULL',now(),uid);const sid=id(),seed=randomInt(1,2147483647),started=now(),expires=new Date(Date.now()+240000).toISOString();db.run('INSERT INTO game_sessions(id,user_id,seed,started_at,expires_at) VALUES (?,?,?,?,?)',sid,uid,seed,started,expires);return {id:sid,seed,started_at:started,expires_at:expires};}));
 app.post('/api/games/flappy/:id/finish',async req=>{const p=z.object({frames:z.number().int().min(1).max(GAME.maxFrames),inputs:z.array(z.number().int().min(1).max(GAME.maxFrames)).max(3000)}).strict().parse(req.body);return db.tx(()=>{const session=requireRow(db.get("SELECT * FROM game_sessions WHERE game='FLAPPY' AND id=? AND user_id=?",pathId(req.params),current(req)));if(session.score!==null)return {score:session.score,reward:session.reward};if(session.finished_at||session.expires_at<now())fail('Игра завершена или сессия истекла. Начни заново.',409);if(p.inputs.some((f,i)=>f>p.frames||i>0&&f<=p.inputs[i-1]))fail('Некорректная запись игры');if(p.frames/GAME.fps*1000>Date.now()-Date.parse(session.started_at)+1500)fail('Некорректная длительность игры');let result;try{result=replayFlight(session.seed,p.inputs,p.frames);}catch(e){fail((e as Error).message);}const reward=0;db.run('UPDATE game_sessions SET score=?,frames=?,inputs=?,reward=?,finished_at=? WHERE id=?',result!.score,p.frames,JSON.stringify(p.inputs),reward,now(),session.id);return {score:result!.score,reward};});});
}
