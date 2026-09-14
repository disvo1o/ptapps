import 'dotenv/config';
import { Store } from './db.js';
import { createApp } from './server.js';
import { seed } from '../../../scripts/seed.js';
if(!process.env.WEB_URL && process.env.RENDER_EXTERNAL_URL)process.env.WEB_URL=process.env.RENDER_EXTERNAL_URL;
const db=new Store();db.migrate();seed(db,process.env.APP_ENV!=='production'&&process.env.MOCK_TELEGRAM!=='false');
const app=await createApp(db,{logger:true});await app.listen({port:Number(process.env.PORT||process.env.API_PORT||3001),host:process.env.API_HOST||'127.0.0.1'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();db.close();process.exit(0);});
