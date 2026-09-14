import { test, expect } from '@playwright/test';
test('opens the app and profile with cookies blocked',async({page})=>{
 await page.route('**/api/**',async route=>{
  const headers=await route.request().allHeaders();delete headers.cookie;
  const response=await route.fetch({headers});
  const responseHeaders=response.headers();delete responseHeaders['set-cookie'];
  await route.fulfill({response,headers:responseHeaders});
 });
 await page.goto('/');
 await expect(page.locator('.bottom-nav')).toBeVisible();
 await page.goto('/profile');
 await expect(page.locator('.bottom-nav')).toBeVisible();
 await expect(page.getByText('Попробуем ещё раз.')).toHaveCount(0);
});
