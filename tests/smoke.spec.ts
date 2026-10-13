import { test, expect } from '@playwright/test';
test('демо-вход и упрощённая навигация',async({page})=>{
 await page.route('https://telegram.org/**',r=>r.abort());await page.goto('/');
 await expect(page.getByText(/Привет, Alex/)).toBeVisible();await expect(page.getByRole('heading',{name:'Турниры'})).toBeVisible();await expect(page.locator('.bottom-nav a')).toHaveCount(4);
 await page.locator('.bottom-nav').getByRole('link',{name:'Рейтинг',exact:true}).click();await expect(page.getByRole('heading',{name:'Рейтинг'})).toBeVisible();
 await page.locator('.bottom-nav').getByRole('link',{name:'Профиль',exact:true}).click();await expect(page.getByText('Карточки',{exact:true})).toBeVisible();
});
