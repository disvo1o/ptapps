import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Store, id, now, audit, requireRow } from '../db.js';
import { authorize, current } from '../auth.js';
import { pathId } from './player-routes.js';
const offer=z.object({name:z.string().trim().min(2).max(100),address:z.string().trim().min(3).max(250),description:z.string().max(300).default(''),image:z.string().max(750000).refine(v=>!v||/^https:\/\//.test(v)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)).default(''),promo_code:z.string().trim().min(1).max(60),discount:z.string().trim().min(1).max(60),additional_text:z.string().max(500).default(''),active:z.boolean().default(true)}).strict();
export function venueRoutes(app:FastifyInstance,db:Store){
 app.get('/api/offers',async()=>db.all('SELECT * FROM venue_offers WHERE active=1 ORDER BY updated_at DESC'));
 app.get('/api/admin/offers',async req=>{authorize(db,req,['ADMIN']);return db.all('SELECT * FROM venue_offers ORDER BY updated_at DESC');});
 app.post('/api/admin/offers',async req=>{authorize(db,req,['ADMIN']);const p=offer.parse(req.body);return db.tx(()=>{const oid=id();db.run('INSERT INTO venue_offers VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',oid,p.name,p.address,p.description,p.image,p.promo_code,p.discount,p.additional_text,p.active?1:0,current(req),now(),now());audit(db,current(req),'OFFER_CREATE',oid,{name:p.name});return {id:oid};});});
 app.patch('/api/admin/offers/:id',async req=>{authorize(db,req,['ADMIN']);const p=offer.parse(req.body),oid=pathId(req.params);return db.tx(()=>{requireRow(db.get('SELECT id FROM venue_offers WHERE id=?',oid));db.run('UPDATE venue_offers SET name=?,address=?,description=?,image=?,promo_code=?,discount=?,additional_text=?,active=?,updated_at=? WHERE id=?',p.name,p.address,p.description,p.image,p.promo_code,p.discount,p.additional_text,p.active?1:0,now(),oid);audit(db,current(req),'OFFER_UPDATE',oid,{name:p.name,active:p.active});return {ok:true};});});
 app.delete('/api/admin/offers/:id',async req=>{authorize(db,req,['ADMIN']);const oid=pathId(req.params);return db.tx(()=>{requireRow(db.get('SELECT id FROM venue_offers WHERE id=?',oid));db.run('DELETE FROM venue_offers WHERE id=?',oid);audit(db,current(req),'OFFER_DELETE',oid,{});return {ok:true};});});
}
