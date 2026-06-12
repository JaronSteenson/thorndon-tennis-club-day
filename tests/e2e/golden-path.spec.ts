import { test, expect } from '@playwright/test';

test('sign in via quick-add, undo toast shows, finish day', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Switch to the dedicated sign-in screen
  await page.getByTestId('mode-toggle').click();

  // Quick-add a fresh visitor so the test is independent of seed
  await page.getByTestId('quick-add-trigger').click();
  await page.getByTestId('quick-add-name').fill('Test Player One');
  await page.getByTestId('quick-add-submit').click();

  // The new player shows as signed in, and the action raised an undo toast
  const chip = page.getByRole('button', { name: 'Test Player One' });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('undo-toast')).toContainText('Added Test Player One');

  // Finish day clears
  await page.getByTestId('finish-day-trigger').click();
  await page.getByTestId('finish-day-confirm').click();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');

  // Back to the allocation board
  await page.getByTestId('mode-toggle').click();
  const here = page.getByRole('heading', { name: 'Here today' });
  await expect(here).toBeVisible();
});
