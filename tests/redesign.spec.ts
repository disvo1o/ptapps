import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://telegram.org/**',r=>r.abort());});

test('secondary destinations, player details and rating explanation remain reachable', async ({page}) => {
 await page.goto('/profile');
 for(const label of ['Карточки','Понгсы','Турниры','Статистика','Достижения']) {
  await expect(page.locator('.profile-shortcuts').getByRole('link',{name:label,exact:true})).toBeVisible();
 }
 await page.getByRole('link',{name:'Достижения',exact:true}).click();
 await expect(page.locator('.achievement').first()).toBeVisible();
 await page.locator('.bottom-nav').getByRole('link',{name:'Профиль',exact:true}).click();
 await page.getByRole('link',{name:'Статистика',exact:true}).click();
 await expect(page.getByRole('img',{name:/История рейтинга/})).toBeVisible();
 await page.locator('.rating-rules summary').click();
 await expect(page.locator('.rating-rules')).toContainText('неопределённость');
 await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},'/collection');
 await page.locator('.album-grid .player-card').first().click();
 const dialog=page.getByRole('dialog');await expect(dialog).toHaveAccessibleName(/\S/);
 await dialog.getByRole('link',{name:'Профиль игрока'}).click();
 await expect(page.locator('.profile-identity')).toBeVisible();
 await expect(page.getByText('Матчи вместе',{exact:true})).toBeVisible();
});

test('admin points adjustment, search and role editor preserve their actions', async ({page}) => {
 await page.goto('/');await page.getByRole('button',{name:'Демо'}).click();
 await page.locator('.demo-user').filter({hasText:'Администратор'}).click();
 await expect(page.getByRole('heading',{name:'Привет, Sam.'})).toBeVisible();
 await page.locator('.bottom-nav').getByRole('link',{name:'Профиль',exact:true}).click();
 await page.locator('.profile-shortcuts').getByRole('link',{name:'Управление',exact:true}).click();
 await expect(page.locator('.tabs button')).toHaveCount(10);
 await page.getByLabel('Поиск записей').fill('Luna');
 await page.getByRole('button',{name:'Управлять',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('combobox',{name:'Роль',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog').getByRole('combobox',{name:'Доступ',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByLabel('Поиск записей').fill('');
 await page.getByRole('button',{name:'Понгсы',exact:true}).click();
 await page.getByRole('button',{name:'Начислить понгсы'}).click();
 await page.getByRole('combobox',{name:'Игрок',exact:true}).selectOption('player-3');
 await page.getByLabel('Количество понгсов').fill('25');
 const reason='Проверка интерфейса '+Date.now();await page.getByLabel('Причина').fill(reason);
 await page.getByRole('button',{name:'Начислить',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.admin-records')).toContainText(reason);
});

test('test tournament keeps sixteen entrants, swaps and winner selection', async ({page}) => {
 await page.goto('/tournaments');await page.getByRole('button',{name:'Тест 16',exact:true}).click();
 await expect(page.locator('.lineup-row')).toHaveCount(16);
 await page.getByRole('button',{name:'Начать турнир',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Подтвердить',exact:true}).click();
 await page.getByRole('button',{name:'Заменить игроков',exact:true}).first().click();
 const players=page.getByRole('dialog').locator('select[name="player_id"]');
 const currentNames=await page.getByRole('dialog').locator('select[name="slot"] option').allTextContents();
 const entrant=await players.locator('option').evaluateAll((options,names)=>options.find(o=>!names.includes(o.textContent||''))?.getAttribute('value'),currentNames);
 await players.selectOption(entrant!);
 await page.getByRole('dialog').getByRole('button',{name:'Заменить игрока',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('.bracket-match.ready .match-player').first().click();
 await page.getByRole('button',{name:'Подтвердить результат'}).click();
 await expect(page.locator('.bracket-match.done')).toHaveCount(1);
});

test('empty, error and camera fallback retain useful actions', async ({page}) => {
 await page.route('**/api/me/stickers',route=>route.fulfill({json:[]}));
 await page.goto('/collection');await expect(page.getByText('Игроки скоро появятся')).toBeVisible();
 await expect(page.getByRole('link',{name:'Открыть пак'})).toBeVisible();
 let fail=true;
 await page.route('**/api/leaderboard?*',async route=>{
  if(fail){await route.fulfill({status:503,json:{error:'Проверка состояния ошибки'}});return;}
  await route.continue();
 });
 await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},'/leaderboard');await expect(page.getByRole('alert')).toContainText('Проверка состояния ошибки');
 fail=false;await page.getByRole('button',{name:'Повторить'}).click();await expect(page.locator('.leader-row').first()).toBeVisible();
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new Error('denied for test')};});
 await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},'/scan');await expect(page.getByRole('button',{name:'Открыть камеру'})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Не удалось открыть камеру');
 await expect(page.locator('.scanner-panel input')).toHaveCount(0);
});
