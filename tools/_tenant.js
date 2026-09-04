/**
 * Shared white-label layer for the embeddable lead tools.
 *
 * Every tool answers the same three questions — whose shop is this, what colour,
 * and where do the leads go — so the logic lives here once instead of being
 * pasted into each one.
 *
 *   <script src="/tools/_tenant.js"></script>
 *   Remodely.ready(t => { ... t.name, t.slug, t.embed ... });
 *   Remodely.submitLead({ name, email, phone, zip, context });
 *
 * URL params
 *   ?shop=summit-stone   resolve that tenant
 *   ?shop=Any Name       literal preview name (powers the sales-page demo)
 *   ?accent=%23c2410c    override accent (preview only)
 *   ?embed=1             chromeless; also implied on /embed/ paths
 *
 * With no ?shop= the tool stays Remodely-branded and nothing below applies.
 */
(function (global) {
  const FS = 'https://firestore.googleapis.com/v1/projects/remodelyai-app/databases/(default)/documents/tenants/';
  const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
  const q = new URLSearchParams(location.search);
  const shopParam = (q.get('shop') || '').trim().slice(0, 60);
  const accentParam = q.get('accent');
  const onEmbedPath = location.pathname.startsWith('/embed/');
  const embed = q.get('embed') === '1' || onEmbedPath;

  const callbacks = [];
  let resolved = null, settled = false;

  /** Derive a light and dark companion so one hex drives the whole palette. */
  function applyAccent(hex) {
    if (!/^#?[0-9a-f]{6}$/i.test(hex || '')) return;
    hex = hex.startsWith('#') ? hex : '#' + hex;
    const shift = (h, pct) => {
      const n = parseInt(h.slice(1), 16);
      const c = [n >> 16, (n >> 8) & 255, n & 255].map(v =>
        Math.max(0, Math.min(255, Math.round(v + (pct > 0 ? (255 - v) * pct : v * pct)))));
      return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const r = document.documentElement.style;
    r.setProperty('--gold', hex);
    r.setProperty('--gold-deep', shift(hex, -0.22));
    r.setProperty('--gold-lite', shift(hex, 0.24));
  }

  /** Anything Remodely-branded is marked data-remodely-chrome and removed in embeds. */
  function stripChrome() {
    document.querySelectorAll('[data-remodely-chrome]').forEach(el => el.remove());
    document.body.dataset.embed = '1';
    // Backstop. The tool runs inside a customer's page, so any same-origin link
    // that isn't an in-page anchor would navigate their visitor out of the shop's
    // branded frame and onto remodely.ai. Catching it here means a future tool
    // can't reintroduce the leak by adding a stray link.
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#') || /^(mailto|tel):/i.test(href)) return;
      let url;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;          // vendor links are fine
      e.preventDefault();
      const form = document.getElementById('leadForm');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.warn('[remodely] blocked in-embed navigation to', href);
    }, true);
  }

  function block(msg) {
    document.body.innerHTML =
      '<div style="max-width:34rem;margin:16vh auto;padding:0 24px;' +
      'font:400 16px/1.6 system-ui,sans-serif;color:#64748b;text-align:center">' +
      '<p style="font-size:19px;color:#0f172a;font-weight:600;margin:0 0 10px">' +
      "This tool isn't available right now.</p><p style=\"margin:0\">" + msg + '</p></div>';
    settled = true;
  }

  function settle(tenant) {
    resolved = tenant;
    settled = true;
    callbacks.splice(0).forEach(fn => { try { fn(tenant); } catch (e) { console.error('[remodely]', e); } });
  }

  const api = {
    get tenant() { return resolved; },
    get isEmbed() { return embed; },
    /** Runs immediately if the tenant is already resolved, otherwise queues. */
    ready(fn) {
      if (settled && resolved) fn(resolved);
      else if (!settled) callbacks.push(fn);
    },
    /**
     * Write a lead for the current shop. Leads are created directly in Firestore
     * (rules allow create, not read), then the delivery cron emails the shop.
     * Resolves only when the write lands — never confirm to a visitor otherwise.
     */
    async submitLead(fields) {
      const t = resolved || {};
      const doc = {
        ...fields,
        shop: t.name || null,
        shop_slug: t.slug || null,
        tool: api.toolName || document.title,
        source: api.toolSource || 'lead-tool',
        timestamp: new Date().toISOString(),
      };
      if (!global.firebase) {
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');
        global.firebase.initializeApp({
          apiKey: 'AIzaSyDJJMyA-sRoh1IYTDf84nmzt48L5RxhJec',
          authDomain: 'remodelyai-app.firebaseapp.com',
          projectId: 'remodelyai-app',
          storageBucket: 'remodelyai-app.firebasestorage.app',
          messagingSenderId: '254256003480',
          appId: '1:254256003480:web:0b5f62324a7fb09a7b13ed',
        });
      }
      await global.firebase.firestore().collection('leads').add(doc);
      return doc;
    },
  };

  function loadScript(src) {
    return new Promise((res, rej) => {
      const t = document.createElement('script');
      t.src = src; t.onload = res; t.onerror = rej;
      document.head.appendChild(t);
    });
  }

  function boot() {
    if (embed) stripChrome();
    if (accentParam) applyAccent(accentParam);
    if (!shopParam) {
      if (onEmbedPath) return block('This embed is missing its shop code. The URL needs ?shop=your-shop on the end.');
      return settle(null);   // plain Remodely-branded page
    }
    if (!SLUG_RE.test(shopParam)) {
      // Not a slug — a literal name typed into the sales-page preview.
      applyAccent(accentParam || '#c2410c');
      return settle({ slug: null, name: shopParam, preview: true, active: true, rates: [] });
    }
    // Firestore is the live source: a Stripe webhook flips `active` there the
    // moment a subscription lapses. The static JSON is a fallback so an outage
    // degrades to stale branding rather than a dead tool on a customer's site.
    const unwrap = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k,
      'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? Number(v.integerValue) : v.stringValue]));
    fetch(FS + encodeURIComponent(shopParam))
      .then(r => r.ok ? r.json().then(d => unwrap(d.fields)) : Promise.reject(new Error('not in firestore')))
      .catch(() => fetch(`/tenants/${shopParam}.json`).then(r => r.ok ? r.json() : Promise.reject(new Error('unknown shop'))))
      .then(t => {
        if (t.active === false) {
          return block("This shop's subscription is inactive. If it's your tool, contact Remodely AI to switch it back on.");
        }
        applyAccent(accentParam || t.accent || '#c2410c');
        // A shop's own services and prices, set in their dashboard. Absent or
        // empty is normal and meaningful: quote nothing rather than guess.
        let rates = [], showcase = [];
        try { rates = JSON.parse(t.rates_json || '[]'); } catch (e) { rates = []; }
        try { showcase = JSON.parse(t.showcase_json || '[]'); } catch (e) { showcase = []; }
        settle({
          slug: shopParam, name: t.name || shopParam, accent: t.accent, active: true,
          rates: Array.isArray(rates) ? rates : [],
          showcase: Array.isArray(showcase) ? showcase : [],
          serviceZips: (t.service_zips || '').split(/[^0-9A-Za-z]+/).filter(Boolean),
          phone: t.phone || '', website: t.website || '',
          serviceArea: t.service_area || '', logo: t.logo_url || '',
        });
      })
      .catch(() => {
        // An unknown slug must never fall back to OUR branding on someone else's
        // website — that would put Remodely's own copy on their page.
        block("We couldn't find that shop. Check the embed code, or contact Remodely AI.");
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.Remodely = api;
})(window);
