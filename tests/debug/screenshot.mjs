import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3739/thorndon-tennis-club-day/';
const out = process.argv[3] || '/tmp/board.png';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });

// Make sure something is in "here today" — quick-add and then assign + finish a game
await page.getByTestId('quick-add-trigger').click();
await page.getByTestId('quick-add-name').fill('Demo Played One');
await page.getByTestId('quick-add-submit').click();

await page.getByTestId('quick-add-trigger').click();
await page.getByTestId('quick-add-name').fill('Demo Yet One');
await page.getByTestId('quick-add-submit').click();

await page.locator('[data-testid^="chip-p-aj-bailey"]').first()
  .getByRole('button', { name: /Options for/ }).click();
await page.getByRole('menuitem', { name: /Assign to Court 3/ }).first().click();

await page.locator('[data-testid^="chip-p-chris-roberts"]').first()
  .getByRole('button', { name: /Options for/ }).click();
await page.getByRole('menuitem', { name: /Assign to Court 3/ }).first().click();

await page.locator('[data-testid^="chip-p-jan-rogers"]').first()
  .getByRole('button', { name: /Options for/ }).click();
await page.getByRole('menuitem', { name: /Assign to Court 3/ }).first().click();

await page.locator('[data-testid^="chip-p-judy-langham"]').first()
  .getByRole('button', { name: /Options for/ }).click();
await page.getByRole('menuitem', { name: /Assign to Court 3/ }).first().click();

await page.waitForTimeout(200);
await page.getByTestId('finish-court-3').click();
await page.waitForTimeout(200);

// Set a duty manager
await page.getByRole('button', { name: /Choose/ }).click();
await page.getByRole('menuitemradio', { name: 'Demo Yet One' }).click();

await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: false });
console.log('saved', out);
await browser.close();
