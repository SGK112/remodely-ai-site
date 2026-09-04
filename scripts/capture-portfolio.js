#!/usr/bin/env node
/**
 * Portfolio imagery, captured from the live products.
 *
 * Every shot here is the real site as it is served right now. If a product
 * cannot be captured, it does not go on the portfolio — a studio page selling
 * verifiability cannot illustrate itself with mockups.
 */
const fs = require('fs'), path = require('path');
const PW = '/Users/homepc/voiceNow-crm/node_modules/playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, '..', 'images', 'work');

const SHOTS = [
  ['voicenow',  'https://www.voicenowcrm.com/'],
  ['webstew',   'https://www.webstew.net/'],
  ['handyman',  'https://scottsdalehandyman.com/'],
  ['surprise',  'https://www.surprisegranite.com/'],
  ['widgets',   'https://www.remodely.ai/widgets/'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = require(PW);
  const b = await chromium.launch({ executablePath: CHROME });
  for (const [name, url] of SHOTS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(3200);                       // let hero media settle
      await p.evaluate(() => window.scrollTo(0, 0));
      const file = path.join(OUT, name + '.png');
      await p.screenshot({ path: file });
      console.log(`${name}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} KB  ${url}`);
    } catch (e) {
      console.error(`${name}: SKIPPED — ${e.message.split('\n')[0]}`);
    }
    await ctx.close();
  }
  await b.close();
})();
