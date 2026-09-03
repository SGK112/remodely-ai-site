#!/usr/bin/env node
/**
 * Billing for the embeddable lead tools.
 *
 * A shop subscribes through Stripe Checkout; Stripe tells us about every later
 * state change by webhook, and we mirror that onto the tenant document the embed
 * reads. That mirroring is the whole point — subscription state changes
 * asynchronously (renewals, failed cards, cancellations), so anything that only
 * looked at the Checkout success page would show a lapsed shop as paid forever.
 *
 * Routes
 *   GET  /health
 *   POST /checkout   {slug, email, interval}  -> Checkout Session url
 *   GET  /portal?slug=  -> Customer Portal url (self-serve card/cancel)
 *   POST /webhook    Stripe events (signature-verified)
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *      STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
 *      FIREBASE_SA_JSON, SITE_URL
 *
 * No dependencies on purpose: the repo has no package.json, so Stripe calls are
 * plain fetch and the webhook signature is checked with node crypto.
 */
const http = require('http');
const crypto = require('crypto');
const db = require('../scripts/lib/gcp.js');

const SK = process.env.STRIPE_SECRET_KEY;
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;
const PRICES = { month: process.env.STRIPE_PRICE_MONTHLY, year: process.env.STRIPE_PRICE_ANNUAL };
const SITE = process.env.SITE_URL || 'https://www.remodely.ai';
const EMBED_BASE = process.env.EMBED_BASE || SITE;
const PORT = process.env.PORT || 10000;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

/** Stripe's API is form-encoded, including nested keys like metadata[slug]. */
function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) form(v, key, out);
    else if (Array.isArray(v)) v.forEach((item, i) =>
      typeof item === 'object' ? form(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, item));
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(path, body, method = 'POST') {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-07-29.dahlia',
    },
    body: body ? form(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message || res.status}`);
  return data;
}

/** Constant-time check of Stripe's t=…,v1=… signature over the raw body. */
function verifyWebhook(raw, header) {
  if (!WHSEC) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  const parts = Object.fromEntries(String(header || '').split(',').map(p => p.split('=')));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) throw new Error('malformed signature header');
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) throw new Error('timestamp outside tolerance');
  const expected = crypto.createHmac('sha256', WHSEC).update(`${t}.${raw}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('signature mismatch');
  return JSON.parse(raw);
}

/** Stripe's status is the source of truth; the embed only ever reads `active`. */
const LIVE = new Set(['active', 'trialing']);
async function syncTenant(slug, patch) {
  if (!slug) return;
  await db.patchDoc('tenants', slug, { ...patch, updated_at: new Date().toISOString() });
  console.log(`[billing] tenants/${slug} <-`, JSON.stringify(patch));
}

/** shop name -> url-safe slug, made unique against existing tenants. */
function slugify(name) {
  return String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 40);
}
async function uniqueSlug(name) {
  let base = slugify(name);
  if (base.length < 2) base = 'shop';
  if (!SLUG_RE.test(base)) base = 'shop-' + base.replace(/[^a-z0-9-]/g, '');
  const taken = new Set((await db.listDocs('tenants')).map(t => t.id));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

const embedSnippet = slug =>
  `<iframe src="${EMBED_BASE}/embed/edge-visualizer?shop=${slug}"\n        width="100%" height="1250" style="border:0"></iframe>`;

/** Welcome mail carries the one thing they need: the line to paste. */
async function sendWelcome(tenant) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('[billing] RESEND_API_KEY unset — no welcome email sent'); return; }
  const to = tenant.notify || tenant.email;
  if (!to) { console.warn(`[billing] ${tenant.slug} has no address — no welcome email`); return; }
  const snippet = embedSnippet(tenant.slug);
  const body = {
    from: process.env.LEAD_FROM || 'Remodely AI <support@remodely.ai>',
    to: [to],
    subject: `Your edge visualizer is live — here's the line to paste`,
    text: `${tenant.name} is set up.\n\nPaste this where you want the tool to appear:\n\n${snippet}\n\n` +
      `Preview it first: ${EMBED_BASE}/embed/edge-visualizer?shop=${tenant.slug}\n\n` +
      `Leads go to ${to}. Reply to this email to change that, your colours, or anything else.\n\n` +
      `Manage billing: ${SITE}/lead-tools/manage/?shop=${tenant.slug}\n\n— Remodely AI`,
    html: `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<p><b>${tenant.name}</b> is set up. Paste this where you want the tool to appear:</p>
<pre style="background:#f1f5f9;border-left:3px solid #f97316;padding:14px;border-radius:3px;overflow-x:auto;font-size:13px">${snippet.replace(/</g, '&lt;')}</pre>
<p><a href="${EMBED_BASE}/embed/edge-visualizer?shop=${tenant.slug}" style="color:#c2410c">Preview it first &rarr;</a></p>
<p>Leads go to <b>${to}</b>. Reply to this email to change that, your colours, or anything else.</p>
<p><a href="${SITE}/lead-tools/manage/?shop=${tenant.slug}" style="color:#c2410c">Manage billing &rarr;</a></p>
<p style="color:#94a3b8;font-size:13px">Remodely AI</p></div>`,
  };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error('[billing] welcome email failed:', (await r.text()).slice(0, 160));
  else console.log(`[billing] welcome email -> ${to}`);
}

async function handleEvent(evt) {
  const o = evt.data.object;
  switch (evt.type) {
    case 'checkout.session.completed': {
      const slug = o.metadata?.slug;
      if (o.payment_status === 'unpaid' && o.status !== 'complete') return;
      await syncTenant(slug, {
        active: true, status: 'active',
        stripe_customer: o.customer, stripe_subscription: o.subscription,
      });
      // Self-serve: they never speak to us, so this email IS the handoff.
      const t = await db.getDoc('tenants', slug);
      const priv = await db.getDoc('tenant_private', slug);
      if (t && !t.welcomed_at) {
        await sendWelcome({ ...t, slug, notify: priv?.notify });
        await syncTenant(slug, { welcomed_at: new Date().toISOString() });
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const slug = o.metadata?.slug || (await tenantByCustomer(o.customer));
      const status = evt.type.endsWith('deleted') ? 'canceled' : o.status;
      await syncTenant(slug, {
        active: LIVE.has(status), status,
        stripe_customer: o.customer, stripe_subscription: o.id,
      });
      break;
    }
    case 'invoice.payment_failed': {
      // Stripe retries for days before giving up. Don't cut a paying shop's tool
      // off on one bounced card — the subscription.updated event that follows
      // (past_due -> unpaid/canceled) is what actually deactivates them.
      const slug = await tenantByCustomer(o.customer);
      await syncTenant(slug, { status: 'payment_failed', last_payment_error_at: new Date().toISOString() });
      break;
    }
    case 'invoice.paid': {
      // Deliberately does NOT set `status`. This and customer.subscription.updated
      // arrive in either order, so writing status here made whichever landed last
      // win — a trialing shop showed up as "active". The subscription events own
      // status; this one only confirms they're paid up.
      const slug = await tenantByCustomer(o.customer);
      await syncTenant(slug, { active: true, last_paid_at: new Date().toISOString() });
      break;
    }
    default:
      console.log(`[billing] ignoring ${evt.type}`);
  }
}

async function tenantByCustomer(customerId) {
  if (!customerId) return null;
  const all = await db.listDocs('tenants');
  return all.find(t => t.stripe_customer === customerId)?.id || null;
}

const json = (res, code, obj, extra = {}) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...extra,
  });
  res.end(JSON.stringify(obj));
};

const readBody = req => new Promise((resolve, reject) => {
  let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) reject(new Error('body too large')); });
  req.on('end', () => resolve(d)); req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});

  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true, prices: Object.keys(PRICES).filter(k => PRICES[k]) });

    if (url.pathname === '/webhook' && req.method === 'POST') {
      const raw = await readBody(req);
      let evt;
      try { evt = verifyWebhook(raw, req.headers['stripe-signature']); }
      catch (e) { console.error('[billing] rejected webhook:', e.message); return json(res, 400, { error: e.message }); }
      // Acknowledge first so Stripe never retries on our processing time.
      json(res, 200, { received: true });
      try { await handleEvent(evt); }
      catch (e) { console.error(`[billing] ${evt.type} failed:`, e.message); }
      return;
    }

    // Self-serve signup: create the shop, then send them straight to Checkout.
    // The tenant is created INACTIVE — only the webhook turns an embed on, so
    // abandoning the payment page leaves nothing serving.
    if (url.pathname === '/signup' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const name = String(body.name || '').trim().slice(0, 60);
      const email = String(body.email || '').trim();
      const interval = body.interval === 'year' ? 'year' : 'month';
      const accent = /^#?[0-9a-fA-F]{6}$/.test(body.accent || '') ? `#${String(body.accent).replace('#','').toLowerCase()}` : '#c2410c';
      if (!name) return json(res, 400, { error: 'Shop name is required' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'A valid email is required' });

      const slug = await uniqueSlug(name);
      await db.setDoc('tenants', slug, {
        slug, name, accent, active: false, status: 'pending_payment',
        website: String(body.website || '').trim().slice(0, 200),
        created_at: new Date().toISOString(),
      });
      // Where their leads go. Private collection — never in the public tenant doc.
      await db.setDoc('tenant_private', slug, { slug, notify: email, name, updated_at: new Date().toISOString() });

      const session = await stripe('checkout/sessions', {
        mode: 'subscription',
        line_items: [{ price: PRICES[interval], quantity: 1 }],
        customer_email: email,
        client_reference_id: slug,
        metadata: { slug },
        subscription_data: { metadata: { slug } },
        allow_promotion_codes: true,
        success_url: `${SITE}/lead-tools/welcome/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE}/lead-tools/?cancelled=1`,
        integration_identifier: 'leadtools-kqmvxrtz',
      });
      return json(res, 200, { url: session.url, slug });
    }

    // Powers the post-payment page: hands back the line they need to paste.
    if (url.pathname === '/welcome') {
      const sid = url.searchParams.get('session_id') || '';
      if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json(res, 400, { error: 'missing session' });
      let session;
      try { session = await stripe(`checkout/sessions/${sid}`, null, 'GET'); }
      catch { return json(res, 404, { error: 'That checkout session no longer exists' }); }
      const slug = session.metadata?.slug || session.client_reference_id;
      if (!slug) return json(res, 404, { error: 'unknown session' });
      const t = await db.getDoc('tenants', slug);
      const priv = await db.getDoc('tenant_private', slug);
      return json(res, 200, {
        slug, name: t?.name || slug,
        // paid is Stripe's word, active is ours — the webhook may not have landed yet
        paid: session.payment_status === 'paid' || session.status === 'complete',
        active: !!t?.active,
        notify: priv?.notify || null,
        embed: embedSnippet(slug),
        preview: `${EMBED_BASE}/embed/edge-visualizer?shop=${slug}`,
      });
    }

    if (url.pathname === '/checkout' && req.method === 'POST') {
      const { slug, email, interval = 'month' } = JSON.parse((await readBody(req)) || '{}');
      if (!SLUG_RE.test(slug || '')) return json(res, 400, { error: 'valid shop slug required' });
      const price = PRICES[interval];
      if (!price) return json(res, 400, { error: `unknown interval "${interval}"` });

      const tenant = await db.getDoc('tenants', slug);
      if (!tenant) return json(res, 404, { error: 'unknown shop — create the tenant first' });

      const session = await stripe('checkout/sessions', {
        mode: 'subscription',
        // No payment_method_types: Stripe picks eligible methods dynamically.
        line_items: [{ price, quantity: 1 }],
        customer: tenant.stripe_customer || undefined,
        customer_email: tenant.stripe_customer ? undefined : email || undefined,
        client_reference_id: slug,
        metadata: { slug },
        subscription_data: { metadata: { slug } },
        allow_promotion_codes: true,
        success_url: `${SITE}/lead-tools/?subscribed=${slug}`,
        cancel_url: `${SITE}/lead-tools/`,
        integration_identifier: 'leadtools-kqmvxrtz',
      });
      return json(res, 200, { url: session.url, id: session.id });
    }

    if (url.pathname === '/portal') {
      const slug = url.searchParams.get('slug') || '';
      if (!SLUG_RE.test(slug)) return json(res, 400, { error: 'valid shop slug required' });
      const tenant = await db.getDoc('tenants', slug);
      if (!tenant?.stripe_customer) return json(res, 404, { error: 'no subscription for that shop yet' });
      const portal = await stripe('billing_portal/sessions', {
        customer: tenant.stripe_customer, return_url: `${SITE}/lead-tools/`,
      });
      return json(res, 302, { url: portal.url }, { Location: portal.url });
    }

    return json(res, 404, { error: 'not found' });
  } catch (e) {
    console.error('[billing]', e.message);
    return json(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, () => console.log(`[billing] listening on ${PORT}`));
