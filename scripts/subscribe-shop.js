#!/usr/bin/env node
/**
 * Generate a Stripe Checkout link to send a shop after a call.
 *
 *   node scripts/subscribe-shop.js --slug summit-stone --email owner@shop.com [--annual]
 *
 * The shop must already exist (scripts/add-shop.js). Paying activates their embed
 * automatically via the billing webhook — nothing to flip by hand.
 */
const BILLING = process.env.BILLING_URL || 'https://remodely-billing.onrender.com';
const arg = n => { const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i+1] && !process.argv[i+1].startsWith('--') ? process.argv[i+1] : null; };

(async () => {
  const slug = arg('slug'), email = arg('email');
  const interval = process.argv.includes('--annual') ? 'year' : 'month';
  if (!slug) { console.error('Usage: subscribe-shop.js --slug <slug> [--email <addr>] [--annual]'); process.exit(2); }

  const r = await fetch(`${BILLING}/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, email, interval }),
  });
  const d = await r.json();
  if (!r.ok) { console.error(`Failed: ${d.error}`); process.exit(1); }
  console.log(`Checkout link for ${slug} (${interval === 'year' ? 'annual' : 'monthly'}):\n`);
  console.log(d.url);
  console.log('\nWhen they pay, their embed activates automatically.');
})().catch(e => { console.error(e.message); process.exit(1); });
