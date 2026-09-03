#!/usr/bin/env node
/**
 * Set where a shop's leads get emailed.
 *
 *   node scripts/set-shop-email.js --slug summit-stone --email leads@summitstone.com
 *   node scripts/set-shop-email.js --list
 *
 * Writes Firestore `tenant_private/<slug>`, which no client can read — the public
 * /tenants/<slug>.json deliberately holds no addresses.
 */
const db = require('./lib/gcp.js');
const arg = n => { const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i+1] && !process.argv[i+1].startsWith('--') ? process.argv[i+1] : null; };

(async () => {
  if (process.argv.includes('--list')) {
    const rows = await db.listDocs('tenant_private');
    if (!rows.length) return console.log('No shops configured for delivery yet.');
    for (const r of rows) console.log(`  ${r.id.padEnd(22)} -> ${r.notify || '(none)'}${r.name ? `  [${r.name}]` : ''}`);
    return;
  }
  const slug = arg('slug'), email = arg('email'), name = arg('name');
  if (!slug || !email) {
    console.error('Usage: set-shop-email.js --slug <slug> --email <address> [--name "Shop Name"]');
    console.error('       set-shop-email.js --list');
    process.exit(2);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error(`Bad email: ${email}`); process.exit(2); }
  await db.setDoc('tenant_private', slug, { slug, notify: email, ...(name ? { name } : {}), updated_at: new Date().toISOString() });
  console.log(`tenant_private/${slug} -> ${email}`);
  console.log('Leads from that shop\'s embed will be emailed on the next delivery run.');
})().catch(e => { console.error(e.message); process.exit(1); });
