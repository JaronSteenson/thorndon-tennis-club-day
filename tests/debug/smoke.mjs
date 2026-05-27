import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3739/thorndon-tennis-club-day/';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });

const headerOK = await page.getByText('Thorndon Tennis Club Day').isVisible();
console.log('Header visible:', headerOK);

// Quick add a player
await page.getByTestId('quick-add-trigger').click();
await page.getByTestId('quick-add-name').fill('Smoke Tester');
await page.getByTestId('quick-add-submit').click();
await page.waitForTimeout(500);

const hereTodayHasNew = await page.getByText('SMOKE TESTER').isVisible();
console.log('Quick-add visible in Here Today:', hereTodayHasNew);

// Pick a roster chip and use overflow menu to assign to court 3
await page.locator('[data-testid^="chip-p-aj-bailey"]').first().getByRole('button', { name: /Options for/ }).click();
await page.getByRole('menuitem', { name: /Assign to Court 3/ }).first().click();
await page.waitForTimeout(300);
const onCourt3 = await page.getByText('AJ BAILEY').first().isVisible();
console.log('AJ Bailey appears (assigned):', onCourt3);

console.log('---errors---');
console.log(errors.length === 0 ? 'no errors' : errors.join('\n'));

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
