import { test, expect } from '@playwright/test';
test('demo login and core navigation',async({page})=>{await page.goto('/');await expect(page.getByText('Let’s rally, Alex')).toBeVisible();await page.goto('/leaderboard');await expect(page.getByText('Earn your place.')).toBeVisible();await page.goto('/shop');await expect(page.getByText('Unwrap the unexpected.')).toBeVisible();});
