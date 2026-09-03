#!/usr/bin/env node
/**
 * Email each shop the leads their embedded tool captured.
 *
 * A lead written by an embed carries `shop_slug`. This finds the ones not yet
 * delivered, looks up where that shop wants them, sends via Resend, and stamps
 * `delivered_at` so the same lead is never sent twice.
 *
 *   node scripts/deliver-leads.js [--dry-run] [--limit N]
 *
 * Where the shop's address lives: Firestore `tenant_private/<slug>`, NOT the public
 * /tenants/<slug>.json. Those files are world-readable so an embed on a customer's
 * domain can load its own config; a shop's inbox does not belong in one.
 * Set it with: node scripts/set-shop-email.js --slug x --email y
 *
 * Needs FIREBASE_SA_JSON (or ~/.remodely-firebase.json) and RESEND_API_KEY.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('./lib/gcp.js');

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 50;
const FROM = process.env.LEAD_FROM || 'Remodely AI <support@remodely.ai>';

function resendKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const f = path.join(os.homedir(), '.resend-key');           // local convenience
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  return null;
}

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function buildEmail(lead, shopName) {
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['ZIP', lead.company],            // shop mode reuses this field for the ZIP
    ['Wants', lead.context],
    ['Received', lead.timestamp],
  ].filter(([, v]) => v);

  const text = [
    `New lead from your edge visualizer on ${shopName}.`, '',
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    lead.email ? `Reply straight to them: ${lead.email}` : '',
    '', '— Remodely AI',
  ].filter(Boolean).join('\n');

  const html = `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<p style="margin:0 0 14px">New lead from your <b>edge visualizer</b>.</p>
<table style="border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `
<tr><td style="padding:6px 16px 6px 0;color:#64748b;white-space:nowrap">${esc(k)}</td>
<td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join('')}
</table>${lead.email ? `
<p style="margin:16px 0 0"><a href="mailto:${esc(lead.email)}" style="color:#c2410c">Reply to ${esc(lead.name || lead.email)}</a></p>` : ''}
<p style="margin:22px 0 0;color:#94a3b8;font-size:13px">Sent by Remodely AI · ${esc(shopName)}</p></div>`;

  return {
    subject: `New lead — ${lead.name || 'edge visualizer'}${lead.context ? ` · ${lead.context.replace(/^Viewing:\s*/, '')}` : ''}`,
    text, html,
  };
}

async function send(to, mail, replyTo) {
  const key = resendKey();
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: replyTo || undefined, ...mail }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${body.message || JSON.stringify(body)}`);
  return body.id;
}

(async () => {
  const leads = await db.listDocs('leads');
  // Volume is small, so filter here rather than maintain a composite index. If this
  // ever gets slow, have the client stamp delivery_status:'pending' and query on it.
  const pending = leads
    .filter(l => l.shop_slug && !l.delivered_at)
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .slice(0, LIMIT);

  console.log(`${leads.length} leads · ${pending.length} awaiting delivery${dryRun ? ' (dry run)' : ''}`);
  if (!pending.length) return;

  const shops = new Map();
  let sent = 0, skipped = 0, failed = 0;

  for (const lead of pending) {
    const slug = lead.shop_slug;
    if (!shops.has(slug)) shops.set(slug, await db.getDoc('tenant_private', slug));
    const cfg = shops.get(slug);

    if (!cfg?.notify) {
      // Do NOT stamp delivered_at — the lead stays queued so it goes out once the
      // address is configured, instead of being silently swallowed.
      console.warn(`  ! ${slug}: no notify address in tenant_private/${slug} — lead ${lead.id} left queued`);
      skipped++;
      continue;
    }

    const mail = buildEmail(lead, cfg.name || slug);
    if (dryRun) {
      console.log(`  → would send to ${cfg.notify}: ${mail.subject}`);
      sent++;
      continue;
    }
    try {
      const id = await send(cfg.notify, mail, lead.email);
      await db.patchDoc('leads', lead.id, {
        delivered_at: new Date().toISOString(),
        delivered_to: cfg.notify,
        delivery_id: id,
      });
      console.log(`  ✓ ${slug} → ${cfg.notify} (${id})`);
      sent++;
    } catch (e) {
      // Leave it undelivered so the next run retries.
      console.error(`  ✗ ${slug} lead ${lead.id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`done — sent ${sent}, skipped ${skipped}, failed ${failed}`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error('deliver-leads failed:', e.message); process.exit(1); });
