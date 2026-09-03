#!/usr/bin/env node
/**
 * Port a Surprise Granite tool into the white-label Remodely set.
 *
 *   node scripts/port-tool.js flooring-calculator [--as flooring]
 *
 * The SG tools all share one design system — the same :root custom properties and
 * the same class names — so the retheme is a token swap rather than a rewrite.
 * What this does:
 *   - swaps the SG gold/cream palette for Remodely orange on slate
 *   - strips the Surprise Granite site footer and any SG links
 *   - marks remaining Remodely branding data-remodely-chrome so embeds drop it
 *   - injects /tools/_tenant.js, which does the shop lookup and lead writing
 *
 * It deliberately does NOT touch the calculator logic. Anything tool-specific
 * (lead forms, copy) is a follow-up edit on the ported file.
 */
const fs = require('fs');
const path = require('path');

const SRC_ROOT = '/Users/homepc/surprise-granite-site/tools';
const DST_ROOT = path.join(__dirname, '..', 'tools');

const name = process.argv[2];
const asIdx = process.argv.indexOf('--as');
const dstName = asIdx !== -1 ? process.argv[asIdx + 1] : name;
if (!name) { console.error('Usage: port-tool.js <sg-tool-dir> [--as <remodely-name>]'); process.exit(2); }

const src = path.join(SRC_ROOT, name, 'index.html');
if (!fs.existsSync(src)) { console.error(`No such tool: ${src}`); process.exit(1); }
let s = fs.readFileSync(src, 'utf8');
const before = s.length;

// --- palette -----------------------------------------------------------------
const SWAPS = [
  ['--gold:#f9cb00', '--gold:#f97316'],
  ['--gold-deep:#e5b800', '--gold-deep:#ea580c'],
  ['--gold-lite:#ffdf4a', '--gold-lite:#fb923c'],
  ['--ink:#17181d', '--ink:#0f172a'],
  ['--mut:#6b6e78', '--mut:#64748b'],
  ['--bg:#f4f1ea', '--bg:#f8fafc'],
  ['--line:#e6e1d6', '--line:#e2e8f0'],
  ['--stage-a:#2a2c33', '--stage-a:#131c2e'],
  ['--stage-b:#191a1f', '--stage-b:#0a0f1a'],
  ['--ink:#f3f1ec', '--ink:#f1f5f9'],
  ['--mut:#9a9ca6', '--mut:#94a3b8'],
  ['--bg:#0f1013', '--bg:#0a0f1a'],
  ['--panel:#181a1f', '--panel:#131c2e'],
  ['--line:#2a2c33', '--line:#1e293b'],
  ['--stage-a:#20222a', '--stage-a:#1e293b'],
  ['--stage-b:#0d0e12', '--stage-b:#0a0f1a'],
];
for (const [a, b] of SWAPS) s = s.split(a).join(b);
s = s.split('rgba(249,203,0,').join('rgba(249,115,22,');   // gold glows
s = s.split('#141207').join('#fff');                        // dark text that sat on gold
s = s.split('#f9cb00').join('#f97316').split('#e5b800').join('#ea580c').split('#ffdf4a').join('#fb923c');

// --- strip the Surprise Granite site chrome ----------------------------------
// The big migrated footer and nav belong to the other site entirely.
s = s.replace(/<footer[\s\S]*?<\/footer>/gi, '');
s = s.replace(/<div class="simple-footer"[\s\S]*?<\/div>\s*(?=<script|<\/body)/i, '');
s = s.replace(/<section class="sg-seo"[\s\S]*?<\/section>/gi, '');
s = s.replace(/<[^>]*class="[^"]*footer-[^"]*"[\s\S]{0,4000}?<\/(?:div|section|footer)>/gi, m =>
  /surprisegranite/i.test(m) ? '' : m);

// Any leftover absolute SG link becomes a relative one or is neutralised.
s = s.replace(/https?:\/\/(www\.)?surprisegranite\.com\/tools\/[a-z0-9-]+\/?/gi, '/tools/');
s = s.replace(/https?:\/\/(www\.)?surprisegranite\.com[^"'\s)]*/gi, '/');
s = s.replace(/Surprise Granite/g, 'Remodely AI');
s = s.replace(/surprisegranite/gi, 'remodely');

// --- head --------------------------------------------------------------------
s = s.replace(/<link rel="canonical"[^>]*>/i,
  `<link rel="canonical" href="https://www.remodely.ai/tools/${dstName}/">`);
s = s.replace(/<link rel="shortcut icon"[^>]*>|<link rel="icon"[^>]*>/i,
  '<link rel="icon" type="image/svg+xml" href="/images/remodely-house-logo.svg">');

// The shared layer must load before the tool's own script reads Remodely.*
if (!s.includes('/tools/_tenant.js')) {
  s = s.replace('</head>', '<script src="/tools/_tenant.js?v=1"></script>\n</head>');
}

fs.mkdirSync(path.join(DST_ROOT, dstName), { recursive: true });
const dst = path.join(DST_ROOT, dstName, 'index.html');
fs.writeFileSync(dst, s);

const leftovers = (s.match(/surprise|granite\.com/gi) || []).length;
console.log(`${name} -> tools/${dstName}/index.html  (${before} -> ${s.length} bytes)`);
console.log(`  SG references remaining: ${leftovers}${leftovers ? '  <-- check these' : ''}`);
