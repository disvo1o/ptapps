import 'dotenv/config';
import { Store } from '../apps/api/src/db.js';
const db=new Store();db.migrate();db.close();console.log('Migrations applied.');
