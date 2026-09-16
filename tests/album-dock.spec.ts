import { test, expect } from '@playwright/test';

test('four independent dock targets, animated icons and reduced motion',async({page})=>{
 await page.goto('/');
 const dock=page.getByRole('navigation',{name:'Основная навигация'});
 await expect(dock.getByRole('link')).toHaveText(['Главная','Сканировать','Рейтинг','Профиль']);
 await page.evaluate(()=>{const native=Element.prototype.animate;(window as any).iconAnimations=0;Element.prototype.animate=function(...args:Parameters<typeof native>){if(this.closest('.bottom-nav'))(window as any).iconAnimations++;return native.apply(this,args);};});
 await dock.getByRole('link',{name:'Рейтинг',exact:true}).click();
 await expect(page).toHaveURL(/\/leaderboard$/);
 expect(await page.evaluate(()=>(window as any).iconAnimations)).toBe(1);
 await page.emulateMedia({reducedMotion:'reduce'});
 await dock.getByRole('link',{name:'Профиль',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).iconAnimations)).toBe(1);
 for(const width of [320,390,768,900]){
  await page.setViewportSize({width,height:844});
  const boxes=await dock.getByRole('link').evaluateAll(links=>links.map(link=>{const r=link.getBoundingClientRect(),text=link.querySelector('span')!.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,textLeft:text.left,textRight:text.right};}));
  for(let i=0;i<4;i++){expect(boxes[i].textLeft).toBeGreaterThanOrEqual(boxes[i].x);expect(boxes[i].textRight).toBeLessThanOrEqual(boxes[i].right);if(i)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].right);}
 }
 await page.setViewportSize({width:390,height:844});
 await dock.screenshot({path:'work/dock-mobile.png'});
});

test('one album entry per player, three columns, grey locked cards',async({page})=>{
 await page.goto('/');await expect(page.locator('.bottom-nav')).toBeVisible();
 const pack=await page.request.post('/api/packs/basic/open',{data:{request_key:'album-e2e-'+Date.now()}});expect(pack.ok()).toBe(true);
 await page.goto('/collection');
 const cards=page.locator('.album-grid .player-card');await expect(cards.first()).toBeVisible();
 const ids=await cards.evaluateAll(items=>items.map(item=>item.getAttribute('data-player-id')));expect(new Set(ids).size).toBe(ids.length);
 await expect(page.locator('.album-page .tabs')).toHaveCount(0);
 await expect(page.getByLabel('Фильтр редкости')).toHaveCount(0);
 expect(await page.locator('.album-grid .locked').count()).toBeGreaterThan(0);
 expect(await page.locator('.album-grid .collected').count()).toBeGreaterThan(0);
 await expect(page.locator('.album-grid .locked').first()).toHaveCSS('filter','grayscale(1)');
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  const boxes=await cards.evaluateAll(items=>items.slice(0,4).map(item=>{const r=item.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};}));
  expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[1].y).toBe(boxes[2].y);expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].right);expect(boxes[2].x).toBeGreaterThan(boxes[1].right);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/album-mobile.png'});
 await cards.first().click();await expect(page.locator('dialog .player-card-stats')).toBeVisible();
});
