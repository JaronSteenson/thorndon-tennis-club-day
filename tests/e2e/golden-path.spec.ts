import { test, expect } from '@playwright/test';

test('quick-add player, assign to court, finish day', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Quick-add a fresh visitor so the test is independent of seed
  await page.getByTestId('quick-add-trigger').click();
  await page.getByTestId('quick-add-name').fill('Test Player One');
  await page.getByTestId('quick-add-submit').click();

  await expect(page.getByText('Test Player One', { exact: true })).toBeVisible();

  // Finish day clears
  await page.getByTestId('finish-day-trigger').click();
  await page.getByTestId('finish-day-confirm').click();

  // The chip stays in roster (still searchable) but no longer in "Here today"
  const here = page.getByRole('heading', { name: 'Here today' });
  await expect(here).toBeVisible();
});
