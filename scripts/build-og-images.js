#!/usr/bin/env node
/**
 * Every page pointed og:image at /images/og.png, which did not exist — so every
 * link anyone shared unfurled with no image. These are the real cards, rendered
 * from the site's own brand rather than sourced from anywhere.
 *
 *   node scripts/build-og-images.js
 */
const fs = require('fs'), path = require('path');
const PW = '/Users/homepc/voiceNow-crm/node_modules/playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, '..', 'images');

const MARK = `<svg viewBox="0 0 24 24" fill="none" width="62" height="62">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#4285F4"/><stop offset="25%" stop-color="#EA4335"/>
    <stop offset="50%" stop-color="#FBBC05"/><stop offset="100%" stop-color="#34A853"/>
  </linearGradient></defs>
  <path d="M3 21V10l9-7 9 7v11" stroke="url(#g)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 21h-7" stroke="#34A853" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const card = ({ eyebrow, title, sub, chips = [] }) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:Inter,system-ui,sans-serif;
       background:radial-gradient(1100px 620px at 78% -12%, #1c2942 0%, #0c1222 58%, #080d18 100%);
       color:#fff;display:flex;flex-direction:column;justify-content:space-between;
       padding:62px 68px;position:relative;overflow:hidden}
  /* a warm bloom in the corner so the card is not a flat rectangle */
  body::after{content:"";position:absolute;right:-190px;top:-190px;width:620px;height:620px;border-radius:50%;
    background:radial-gradient(circle,rgba(249,115,22,.30),transparent 66%)}
  .top{display:flex;align-items:center;gap:16px;position:relative;z-index:1}
  .wm{font-size:25px;font-weight:700;letter-spacing:-.02em}
  .wm span{color:#fb923c}
  .mid{position:relative;z-index:1}
  .eyebrow{font-size:16px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#fb923c;margin-bottom:20px}
  h1{font-size:${title.length > 46 ? 62 : 74}px;line-height:1.02;letter-spacing:-.035em;font-weight:800;
     max-width:19ch;text-wrap:balance}
  h1 em{font-style:normal;color:#fb923c}
  p{font-size:26px;line-height:1.42;color:#cbd5e1;margin-top:22px;max-width:34ch;font-weight:400}
  .chips{display:flex;gap:11px;position:relative;z-index:1;flex-wrap:wrap}
  .chip{font-size:18px;font-weight:600;color:#cbd5e1;border:1px solid rgba(255,255,255,.17);
        border-radius:999px;padding:10px 20px}
  .bar{position:absolute;left:0;bottom:0;height:9px;width:100%;
       background:linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853)}
</style></head><body>
  <div class="top">${MARK}<div class="wm">remodely<span>.ai</span></div></div>
  <div class="mid">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    ${sub ? `<p>${sub}</p>` : ''}
  </div>
  <div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
  <div class="bar"></div>
</body></html>`;

const CARDS = {
  'og': {
    eyebrow: 'Remodely AI',
    title: 'Most visitors leave <em>without calling</em>.',
    sub: 'Lead-capture tools for remodeling contractors — branded to your business, one line of code.',
    chips: ['Instant quotes', 'Service area', 'Callbacks', 'Real reviews'],
  },
  'og-report': {
    eyebrow: 'AI visibility report',
    title: 'Can AI <em>verify</em> your business?',
    sub: 'Assistants recommend whoever they can check. Here is what they find when they look you up.',
    chips: ['Google listing', 'BuildZoom', 'Licence', 'Review standing'],
  },
  'og-widgets': {
    eyebrow: 'Widgets',
    title: 'Your site, doing <em>the asking</em>.',
    sub: 'Drop-in tools that turn visitors into quote requests, branded to your business.',
    chips: ['$49/mo', 'No contract', 'Live in minutes'],
  },
  'og-tools': {
    eyebrow: 'Free tools',
    title: 'Grade your site in <em>30 seconds</em>.',
    sub: 'No signup. See exactly what Google and the AI assistants find when they look you up.',
    chips: ['AI visibility', 'Schema', 'Google profile', 'Mobile'],
  },
};

(async () => {
  const { chromium } = require(PW);
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  for (const [name, spec] of Object.entries(CARDS)) {
    await p.setContent(card(spec), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);   // never screenshot a fallback face
    await p.waitForTimeout(350);
    const file = path.join(OUT, `${name}.png`);
    await p.screenshot({ path: file });
    console.log(`${name}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  await b.close();
})();
