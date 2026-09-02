#!/usr/bin/env node
/**
 * Onboard a shop to the embeddable tools.
 *
 * A tenant is a public JSON file under /tenants/. This writes one, validates the
 * slug, and prints the embed line to hand the customer. Commit and push to go live.
 *
 *   node scripts/add-shop.js --slug summit-stone --name "Summit Stone & Tile" \
 *        --accent c2410c --site https://summitstone.com
 *
 *   --off   write it with active:false (suspends an existing shop's embed)
 *
 * Nothing secret belongs in these files — they are world-readable by design, since
 * the embed has to load its config from a customer's domain with no credentials.
 */
const fs = require('fs');
const path = require('path');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : d;
};
const slug = arg('slug');
const name = arg('name');
const accent = (arg('accent', 'c2410c') || '').replace(/^#/, '');
const site = arg('site', '');
const active = !process.argv.includes('--off');

if (!slug || !name) {
  console.error('Usage: add-shop.js --slug <slug> --name "<Shop Name>" [--accent hex] [--site url] [--off]');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(slug)) {
  console.error(`Bad slug "${slug}". Lowercase letters, digits and dashes; 2-49 chars.`);
  console.error('The visualizer treats anything else as a literal preview name and will not look it up.');
  process.exit(2);
}
if (!/^[0-9a-f]{6}$/i.test(accent)) {
  console.error(`Bad accent "${accent}". Six hex digits, e.g. c2410c.`);
  process.exit(2);
}

const file = path.join(__dirname, '..', 'tenants', `${slug}.json`);
const existed = fs.existsSync(file);
fs.writeFileSync(file, JSON.stringify({
  slug, name, accent: `#${accent.toLowerCase()}`, active,
  ...(site ? { site } : {}),
}, null, 2) + '\n');

console.log(`${existed ? 'Updated' : 'Created'} tenants/${slug}.json  (active: ${active})`);
if (!active) {
  console.log('\nThis shop\'s embed will now show the "subscription is inactive" notice.');
} else {
  console.log(`\nEmbed line for ${name}:\n`);
  console.log(`<iframe src="https://www.remodely.ai/embed/edge-visualizer?shop=${slug}"`);
  console.log(`        width="100%" height="1250" style="border:0"></iframe>\n`);
  console.log(`Preview: https://www.remodely.ai/embed/edge-visualizer?shop=${slug}`);
}
console.log('\nCommit and push to make it live.');
