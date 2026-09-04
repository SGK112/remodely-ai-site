#!/usr/bin/env node
/**
 * Product imagery, captured from the product.
 *
 * The pages had no images and no video at all. Everything here is a real
 * session against the live site — no stock photography, no mockups — so what a
 * visitor sees on the sales page is what they actually get.
 *
 *   node scripts/capture-media.js
 */
const fs = require('fs'), path = require('path');
const PW = '/Users/homepc/voiceNow-crm/node_modules/playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, '..', 'images', 'product');
const SITE = 'https://www.remodely.ai';
const DEMO_SITE = process.env.DEMO_SITE || 'albaconstruction.com';

const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';

(async () => {
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME });

  // ---- video: the audit actually running, start to finish ------------------
  const vctx = await browser.newContext({
    viewport: { width: 1120, height: 720 }, deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1120, height: 720 } },
  });
  const vp = await vctx.newPage();
  await vp.goto(`${SITE}/tools/ai-visibility/`, { waitUntil: 'domcontentloaded' });
  await vp.waitForTimeout(1200);
  // Type it out rather than filling instantly — the point is to show the flow.
  await vp.type('#site', DEMO_SITE, { delay: 55 });
  await vp.waitForTimeout(500);
  await vp.click('#go');
  await vp.waitForSelector('.stage', { timeout: 90000 });
  await vp.waitForTimeout(900);
  for (let i = 0; i < 5; i++) {           // scroll through the findings
    await vp.mouse.wheel(0, 320);
    await vp.waitForTimeout(650);
  }
  await vctx.close();                      // close writes the file
  const raw = fs.readdirSync(OUT).find(f => f.endsWith('.webm'));
  if (raw) {
    fs.renameSync(path.join(OUT, raw), path.join(OUT, 'audit-demo.webm'));
    console.log('audit-demo.webm  ' + kb(path.join(OUT, 'audit-demo.webm')));
  }

  // ---- stills --------------------------------------------------------------
  const shot = async (name, url, prep) => {
    const ctx = await browser.newContext({ viewport: { width: 1160, height: 820 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    const target = await prep(p);
    const file = path.join(OUT, name + '.png');
    await (target ? target.screenshot({ path: file }) : p.screenshot({ path: file }));
    console.log(`${name}.png  ${kb(file)}`);
    await ctx.close();
  };

  await shot('report', `${SITE}/tools/ai-visibility/`, async p => {
    await p.waitForTimeout(900);
    await p.fill('#site', DEMO_SITE);
    await p.click('#go');
    await p.waitForSelector('.stage', { timeout: 90000 });
    await p.waitForTimeout(800);
    return p.locator('#out');
  });

  await shot('grader-start', `${SITE}/tools/ai-visibility/`, async p => {
    await p.waitForTimeout(1400);
    return p.locator('.wrap');
  });

  await browser.close();
})();
