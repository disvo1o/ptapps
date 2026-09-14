import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { Store, id, now, audit, notify } from '../apps/api/src/db.js';
import { credit, awardSticker, achievements, balance } from '../apps/api/src/domain/economy.js';
import { qrToken, startTournament } from '../apps/api/src/domain/tournaments.js';
const names=['Alex Morgan','Max Chen','Luna Park','Oliver Reed','Sofia Costa','Noah Bakker','Mia Novak','Leo Martin','Emma Wilson','Kai Tanaka','Zoe Dubois','Finn Meyer','Ava Jensen','Liam Scott','Isla Rossi','Ethan Kim','Aria Singh','Oscar Berg','Nora Ali','Hugo Silva','Ella White','Theo Clark','Ivy Wang','Milo Brown','Freya Klein','Felix Ward','Ruby Lee','Jude Patel','Ada Fox','Sam River'];
const uid=(n:number)=>n===0?'alex':n===1?'max':n===29?'admin':`player-${n+1}`;
export function seed(db:Store,demo=true){
 db.tx(()=>{
 if(!db.get('SELECT id FROM seasons LIMIT 1'))db.run('INSERT INTO seasons VALUES (?,?,?,?,?)','season-01','Season 01 · First Serve','2026-09-01T00:00:00.000Z','2027-01-01T00:00:00.000Z','CURRENT');
 const themes=['Fire Serve','Moon Shot','Spin Doctor','Lucky Rally','Golden Paddle','Ghost Spin','Court King','Match Point','Neon Smash','Cloud Nine'];
 for(let i=0;i<100;i++){const rarity=i<40?'COMMON':i<65?'UNCOMMON':i<82?'RARE':i<93?'EPIC':i<99?'LEGENDARY':'MYTHIC';db.run("INSERT OR IGNORE INTO stickers(id,name,description,image_url,rarity,season,type,created_at) VALUES (?,?,?,?,?,?,'COLLECTION',?)",`sticker-${String(i+1).padStart(3,'0')}`,`${themes[i%10]} ${['I','II','III','IV','V','VI','VII','VIII','IX','X'][Math.floor(i/10)]}`,'A little court magic. Part of the First Serve collection.',`/stickers/${i+1}.svg`,rarity,'season-01',now());}
 for(const p of [['basic','Basic',100,{COMMON:70,UNCOMMON:22,RARE:7,EPIC:1}],['pro','Pro',300,{COMMON:40,UNCOMMON:30,RARE:20,EPIC:9,LEGENDARY:1}],['legendary','Legendary',1000,{COMMON:10,UNCOMMON:20,RARE:30,EPIC:25,LEGENDARY:14,MYTHIC:1}]] as const)db.run('INSERT OR IGNORE INTO packs VALUES (?,?,?,?,1)',p[0],p[1],p[2],JSON.stringify(p[3]));
 for(const a of [['FIRST_MATCH','First Serve','Confirm your first match','games',1,20],['FIRST_WIN','Winner’s Circle','Win your first match','wins',1,30],['FIVE_WIN_STREAK','On Fire','Win 5 games in a row','longest_streak',5,50],['TEN_WIN_STREAK','Unstoppable','Win 10 games in a row','longest_streak',10,100],['TOURNAMENT_WINNER','Crowned','Win a tournament','tournament_wins',1,100],['GIANT_SLAYER','Giant Slayer','Beat a player rated 200 points above you','giant_slayer',1,100],['COLLECTOR_25','The Collector','Find 25 unique stickers','collection',25,100],['COLLECTOR_50','Full House','Find 50 unique stickers','collection',50,150],['COLLECTOR_100','Master Collector','Find 100 unique stickers','collection',100,300],['RICH_10000','Big Stack','Hold 10,000 Pingpoints','balance',10000,100]] as const)db.run('INSERT OR IGNORE INTO achievements VALUES (?,?,?,?,?,?)',...a);
 });
 if(!demo||db.get('SELECT id FROM users WHERE id=?','alex'))return;
 db.tx(()=>{
 for(let i=0;i<30;i++){
   const user=uid(i),rating=i===0?1284:Math.round(920+((i*127)%1040));
   db.run('INSERT INTO users VALUES (?,?,?,?,0,?)',user,`demo-user-${i+1}`,names[i].toLowerCase().replace(/ /g,'.'),i===29?'ADMIN':i===0||i===1?'ORGANIZER':'PLAYER',now());
   db.run('INSERT INTO profiles VALUES (?,?,?,?,?,?,?,?)',user,names[i],String(i),null,i%4===0||i<2?'Amsterdam':['Berlin','London','Paris'][i%3],i%4===0||i<2?'NL':'EU',i===0?'Here for the rallies. Staying for the rivalries.':'One more game?',now());
   db.run('INSERT INTO ratings(user_id,rating,highest_rating) VALUES (?,?,?)',user,rating,rating+72);
   db.run("INSERT INTO stickers VALUES (?,?,?,?,?,?,'BATTLE',?,?)",`battle-${user}`,`${names[i].split(' ')[0]}’s Signature`,'A Battle Sticker earned by defeating this player. Collection stickers are never lost.',`/stickers/${(i*3)%100+1}.svg`,'RARE','season-01',user,now());awardSticker(db,user,`battle-${user}`);
   const count=i===0?42:8+(i*7)%76;for(let j=0;j<count;j++)awardSticker(db,user,`sticker-${String((j*7+i*3)%100+1).padStart(3,'0')}`);
 }
 // Historical demo games are real relational records; standings derive from their outcomes.
 for(let i=0;i<126;i++){
   const opponent=uid(i%28+1),win=i<119?(i%17<6||(i%17>=9&&i%17<14)):true;const date=new Date(Date.now()-(130-i)*86400000).toISOString();const mid=id();
   db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,winner,loser,status,created_at,confirmed_at,rating_change_a,rating_change_b) VALUES (?,?,?,?,?,?,?,'CONFIRMED',?,?,?,?)",mid,'alex',opponent,win?11:7,win?8:11,win?'alex':opponent,win?opponent:'alex',date,date,win?12:-12,win?-12:12);
   db.run('INSERT INTO rating_history VALUES (?,?,?,?,?,?)',id(),'alex','season-01',Math.round(1000+i*2.1+Math.sin(i/7)*42),mid,date);
 }
 // Games between the remaining demo players give the global table meaningful variety.
 for(let i=0;i<180;i++){
   const a=uid(i%28+1),b=uid((i*7+9)%28+1);if(a===b)continue;const date=new Date(Date.now()-(190-i)*86400000).toISOString();
   db.run("INSERT INTO matches(id,player_a,player_b,score_a,score_b,winner,loser,status,created_at,confirmed_at,rating_change_a,rating_change_b) VALUES (?,?,?,?,?,?,?,'CONFIRMED',?,?,12,-12)",id(),a,b,11,8,a,b,date,date);
 }
 for(let i=0;i<30;i++){
  const u=uid(i),ms=db.all("SELECT winner FROM matches WHERE status='CONFIRMED' AND (player_a=? OR player_b=?) ORDER BY confirmed_at",u,u);let wins=0,streak=0,longest=0;
  for(const m of ms){if(m.winner===u){wins++;streak++;longest=Math.max(longest,streak);}else streak=0;}
  db.run('UPDATE ratings SET games=?,wins=?,losses=?,streak=?,longest_streak=? WHERE user_id=?',ms.length,wins,ms.length-wins,streak,longest,u);
  if(i===0)db.run('UPDATE ratings SET longest_streak=7 WHERE user_id=?',u);
  if(i!==0)for(let j=0;j<15;j++)db.run('INSERT INTO rating_history VALUES (?,?,?,?,?,?)',id(),u,'season-01',db.get('SELECT rating FROM ratings WHERE user_id=?',u).rating-100+j*7,null,new Date(Date.now()-(16-j)*86400000).toISOString());
  achievements(db,u);credit(db,u,(i===0?1840:300+(i*173)%2400)-balance(db,u),'BONUS','demo-seed','Demo opening balance');
 }
 db.run('INSERT INTO rating_history VALUES (?,?,?,?,?,?)',id(),'alex','season-01',1284,null,now());
 for(const [tid,title,loc,days,max,count,start] of [['weekend','The Weekend Rally','Club Pong · Amsterdam',5,16,12,1],['afterhours','After Hours Open','Spin Studio · Amsterdam',2,8,7,2],['city-cup','City Cup — Live','De Pijp · Amsterdam',0,4,4,3]] as const){
   db.run("INSERT INTO tournaments(id,title,description,organizer_id,location,start_at,registration_deadline,max_players,format,status,qr_token,season_id,created_at) VALUES (?,?,?,?,?,?,?,?,'SINGLE_ELIMINATION','OPEN',?,?,?)",tid,title,'Good people. Great rallies. Bring your best game. All levels welcome.','max',loc,new Date(Date.now()+(days+1)*86400000).toISOString(),new Date(Date.now()+(days+0.9)*86400000).toISOString(),max,qrToken(),'season-01',now());
   for(let p=start;p<start+count;p++)db.run('INSERT INTO tournament_players VALUES (?,?,?)',tid,uid(p),now());
 }
 notify(db,'alex','WELCOME','Welcome to First Serve. Your next great rally starts here.');audit(db,'admin','DEMO_SEED',null,{users:30,collectibles:100});
 });
 startTournament(db,'max','city-cup');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.env.APP_ENV==='production'&&!process.argv.includes('--catalog-only'))throw new Error('Use --catalog-only in production');const db=new Store();db.migrate();seed(db,!process.argv.includes('--catalog-only'));db.close();console.log('PING database seeded.');}
