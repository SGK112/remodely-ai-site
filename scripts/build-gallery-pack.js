#!/usr/bin/env node
/**
 * Build the design gallery's image pack.
 *
 * The gallery originally fetched Surprise Granite's catalog API live. That API has
 * an origin allowlist and remodely.ai is not on it, so a cross-origin fetch 403s —
 * and opening the allowlist would leave the product depending on another site's
 * uptime. This pulls the same images once, ships them same-origin, and drops the
 * dependency entirely (the same approach as build-edge-viz-stones.js).
 *
 *   node scripts/build-gallery-pack.js [--limit 120]
 *
 * These are the STONE VENDORS' own styled room photography — the ambient shots the
 * texture builder rejects. They are illustrative of the material, never anyone's
 * completed project, and the gallery copy has to say so.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const API = 'https://surprise-granite-email-api.onrender.com/api/catalog';
const OUT_DIR = path.join(__dirname, '..', 'tools', 'design-gallery', 'rooms');
const MANIFEST = path.join(__dirname, '..', 'tools', 'design-gallery', 'gallery.json');
const li = process.argv.indexOf('--limit');
const LIMIT = li !== -1 ? Number(process.argv[li + 1]) : 120;

// Borrowed from the original tool so the same images are selected.
const ROOM = /kitchen|bath|room|render|_res_|_com_|install|vanity|shower|vignette|fireplace|laundry|scene|lifestyle|inspiration|amb/i;
const SLAB = /slab|swatch|closeup|close-up|detail|bookmatch|_cu_|zoom|_full_|thumb|detalle/i;

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function classify(url) {
  if (/kitchen/i.test(url)) return 'Kitchen';
  if (/bath|vanity|shower/i.test(url)) return 'Bath';
  if (/fireplace/i.test(url)) return 'Fireplace';
  if (/laundry/i.test(url)) return 'Laundry';
  return 'Interior';
}

async function fetchAll() {
  const out = [];
  for (let offset = 0; ; offset += 250) {
    const r = await fetch(`${API}?category=slab&limit=250&offset=${offset}`);
    if (!r.ok) throw new Error(`catalog ${r.status}`);
    const j = await r.json();
    out.push(...(j.products || []));
    if (out.length >= (j.total || 0) || !j.products?.length) break;
  }
  return out;
}

/** Room shots are landscape and want width, not a square crop like a texture. */
function toWebImage(srcFile, destFile) {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '68',
    '-Z', '1000', srcFile, '--out', destFile], { stdio: 'ignore' });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const products = await fetchAll();
  console.log(`catalog: ${products.length} slabs`);

  // One shot per product first, so a single colour can't dominate the grid.
  const picks = [];
  const seen = new Set();
  for (const p of products) {
    if (!p.name) continue;
    const rooms = (p.image_urls || []).filter(u => u && ROOM.test(u) && !SLAB.test(u.replace(/.*\//, '')));
    if (!rooms.length) continue;
    const key = slug(p.name);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push({ url: rooms[0], name: p.name, material: p.subcategory || p.category || 'Stone', key });
  }
  console.log(`candidates: ${picks.length} products with a room shot`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-'));
  const manifest = [];
  let failed = 0;

  for (const pick of picks.slice(0, LIMIT)) {
    const file = `${pick.key}.jpg`;
    const dest = path.join(OUT_DIR, file);
    try {
      if (!fs.existsSync(dest)) {
        const raw = path.join(tmp, pick.key);
        if (pick.url.startsWith('/')) {
          const local = path.join('/Users/homepc/surprise-granite-site', decodeURIComponent(pick.url).replace(/^\//, ''));
          if (!fs.existsSync(local)) throw new Error('local image missing');
          fs.copyFileSync(local, raw);
        } else {
          const r = await fetch(pick.url);
          if (!r.ok) throw new Error(`img ${r.status}`);
          fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
        }
        toWebImage(raw, dest);
        fs.unlinkSync(raw);
      }
      manifest.push({ img: `rooms/${file}`, name: pick.name, material: pick.material, room: classify(pick.url) });
    } catch (e) {
      failed++;
      console.warn(`  skip ${pick.name}: ${e.message}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  fs.writeFileSync(MANIFEST, JSON.stringify({
    generated: new Date().toISOString(),
    note: 'Vendor room photography illustrating each stone. Not any shop\'s completed work.',
    looks: manifest,
  }, null, 1));
  console.log(`wrote ${manifest.length} images (${failed} failed) -> ${MANIFEST}`);
})();
