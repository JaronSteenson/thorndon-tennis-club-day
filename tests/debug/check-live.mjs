import { chromium } from 'playwright';

const url = process.argv[2] || 'https://jaronsteenson.github.io/thorndon-tennis-club-day/';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on('console', (msg) => {
  console.log(`[console.${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  console.log('[pageerror]', err.message);
  if (err.stack) console.log(err.stack);
});
page.on('requestfailed', (req) => {
  console.log(`[requestfailed] ${req.url()} -> ${req.failure()?.errorText}`);
});

console.log('Loading', url);
await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
console.log('---bodyText---');
console.log(bodyText);
await browser.close();
