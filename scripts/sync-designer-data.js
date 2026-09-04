#!/usr/bin/env node
/**
 * Design Pro's product feeds are maintained on the countertop shop's site — it
 * is the business that actually buys and sells this stuff. The app is served
 * from remodely.ai, and those feeds are fetched with fetch(), which is
 * same-origin only: the shop's site sends no Access-Control-Allow-Origin, so
 * pointing at it directly would fail in the browser.
 *
 * So the files are copied, and this refreshes them. Run it when the shop
 * updates a catalogue, or on a schedule.
 *
 *   node scripts/sync-designer-data.js          # report what changed
 *   node scripts/sync-designer-data.js --write  # actually update
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const SRC = 'https://www.surprisegranite.com';
const ROOT = path.join(__dirname, '..');
const FILES = [
  'data/bravo-tile.json', 'data/countertops.json', 'data/faucets.json',
  'data/flooring.json', 'data/sinks.json', 'data/tile.json', 'data/search-index.json',
  'js/designer-pro-features.js', 'js/image-fallback.js', 'js/remodely-hub.js',
  'css/marketplace-mobile-fix.css',
];
const write = process.argv.includes('--write');
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);

(async () => {
  let changed = 0, same = 0, failed = 0;
  for (const rel of FILES) {
    let body;
    try {
      const r = await fetch(`${SRC}/${rel}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      body = Buffer.from(await r.arrayBuffer());
    } catch (e) {
      console.error(`  FAILED  ${rel} — ${e.message}`);
      failed++;
      continue;
    }
    // A truncated or error-page response would quietly replace real data.
    if (rel.endsWith('.json')) {
      try { JSON.parse(body.toString('utf8')); }
      catch { console.error(`  FAILED  ${rel} — not valid JSON, refusing to write`); failed++; continue; }
    }
    // The shop's feeds carry image paths rooted at their domain. Served from
    // here those 404, and images need no CORS, so qualify them on the way in —
    // otherwise every sync silently breaks thousands of product images.
    if (rel.endsWith('.json')) {
      body = Buffer.from(body.toString('utf8').split('"/migrated/').join('"' + SRC + '/migrated/'), 'utf8');
    }

    const dest = path.join(ROOT, rel);
    const before = fs.existsSync(dest) ? fs.readFileSync(dest) : Buffer.alloc(0);
    if (before.equals(body)) { same++; continue; }
    console.log(`  ${write ? 'UPDATED' : 'DIFFERS'} ${rel}  ${sha(before)} → ${sha(body)}  (${(body.length / 1024).toFixed(0)}KB)`);
    if (write) fs.writeFileSync(dest, body);
    changed++;
  }
  console.log(`\n${changed} changed, ${same} unchanged, ${failed} failed${write ? '' : '  — run with --write to apply'}`);
  if (failed) process.exitCode = 1;
})();
