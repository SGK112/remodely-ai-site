/**
 * The shared "get my quote" form for every embeddable tool.
 *
 * A calculator that only shows a number is a giveaway, not a lead tool — this is
 * the part that turns a visitor into something the shop can call. It reuses the
 * tools' existing design tokens (--gold, --panel, --line) so it inherits whatever
 * accent the tenant is branded with.
 *
 *   Remodely.mountLeadForm({
 *     after:   '.stage',              // element to insert after (default: main content end)
 *     heading: 'Get your exact price',
 *     context: () => 'Hardwood · 240 sq ft',   // what they configured
 *   });
 */
(function (global) {
  const CSS = `
  .rl-form{background:var(--panel,#fff);border:1px solid var(--line,#e2e8f0);border-radius:18px;
    padding:22px;margin-top:20px;box-shadow:var(--shadow,0 18px 44px -18px rgba(15,23,42,.28))}
  .rl-form h3{font-size:19px;margin:0 0 6px;color:var(--ink,#0f172a);font-weight:700;letter-spacing:-.01em}
  .rl-form p.rl-sub{margin:0 0 16px;color:var(--mut,#64748b);font-size:14.5px;line-height:1.55}
  .rl-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media (max-width:560px){.rl-fields{grid-template-columns:1fr}}
  .rl-fields input{font:inherit;font-size:15px;padding:11px 13px;border:1px solid var(--line,#e2e8f0);
    border-radius:10px;background:transparent;color:var(--ink,#0f172a);width:100%}
  .rl-fields input:focus{outline:2px solid var(--gold,#f97316);outline-offset:1px;border-color:transparent}
  .rl-fields .rl-wide{grid-column:1/-1}
  .rl-form button{font:inherit;font-weight:700;font-size:15px;cursor:pointer;margin-top:12px;width:100%;
    padding:13px 16px;border:0;border-radius:11px;color:#fff;
    background:linear-gradient(135deg,var(--gold-lite,#fb923c),var(--gold-deep,#ea580c))}
  .rl-form button:disabled{opacity:.6;cursor:default}
  .rl-when{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:11px}
  .rl-when-l{font-size:12px;font-weight:700;color:var(--mut,#64748b);letter-spacing:.06em;text-transform:uppercase;margin-right:2px}
  .rl-when button{font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:7px 12px;border-radius:999px;
    border:1px solid var(--line,#e2e8f0);background:transparent;color:var(--mut,#64748b)}
  .rl-when button.on{border-color:var(--gold,#f97316);background:var(--gold,#f97316);color:#fff}
  .rl-fine{font-size:11.5px;color:var(--mut,#64748b);text-align:center;margin:10px 0 0}
  .rl-note{display:none;margin-top:12px;padding:13px 15px;border-radius:11px;font-size:14px;line-height:1.5}
  .rl-note.show{display:block}
  .rl-note.ok{background:rgba(21,128,61,.10);border:1px solid rgba(21,128,61,.45);color:var(--ink,#0f172a)}
  .rl-note.bad{background:rgba(220,38,38,.09);border:1px solid rgba(220,38,38,.4);color:var(--ink,#0f172a)}
  .rl-ctx{font-size:12.5px;color:var(--mut,#64748b);margin:0 0 14px;font-weight:600}`;

  function mount(opts = {}) {
    if (document.getElementById('leadForm')) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const shop = (global.Remodely && global.Remodely.tenant) || null;
    // Without a tenant the sentence has to read "we will", not "us will".
    const who = shop && shop.name ? shop.name : null;
    const subject = who || 'we';
    const object = who || 'us';

    const wrap = document.createElement('form');
    wrap.className = 'rl-form';
    wrap.id = 'leadForm';
    wrap.noValidate = true;
    wrap.innerHTML = `
      <h3>${opts.heading || 'Get your exact price'}</h3>
      <p class="rl-sub">Send this over and ${escapeHtml(subject)} will follow up with a real number for your project — measured, not estimated.</p>
      <p class="rl-ctx" id="rlCtx"></p>
      <div class="rl-fields">
        <input name="name" placeholder="Your name" autocomplete="name" required>
        <input name="email" type="email" placeholder="Email" autocomplete="email" required>
        <input name="phone" placeholder="Phone (optional)" autocomplete="tel">
        <input name="zip" placeholder="ZIP code" inputmode="numeric" autocomplete="postal-code" required>
      </div>
      <div class="rl-when" role="group" aria-label="When do you want this done">
        <span class="rl-when-l">When?</span>
        ${['ASAP', '1-3 months', '3-6 months', 'Just planning'].map((w, i) =>
          `<button type="button" data-w="${w}"${i === 0 ? ' class="on"' : ''}>${w}</button>`).join('')}
      </div>
      <button type="submit">Send my details →</button>
      <p class="rl-fine">No obligation · your details go straight to ${escapeHtml(object)}.</p>
      <div class="rl-note" id="rlNote"></div>`;

    let timeline = 'ASAP';
    wrap.querySelectorAll('.rl-when button').forEach(b => b.addEventListener('click', () => {
      timeline = b.dataset.w;
      wrap.querySelectorAll('.rl-when button').forEach(o => o.classList.toggle('on', o === b));
    }));

    const anchor = opts.after && document.querySelector(opts.after);
    (anchor ? anchor.parentNode : document.body).insertBefore(
      wrap, anchor ? anchor.nextSibling : null);

    const ctxEl = wrap.querySelector('#rlCtx');
    const refreshCtx = () => {
      const c = typeof opts.context === 'function' ? opts.context() : opts.context;
      ctxEl.textContent = c ? `Your selection: ${c}` : '';
    };
    refreshCtx();
    document.addEventListener('click', () => setTimeout(refreshCtx, 60));
    document.addEventListener('input', () => setTimeout(refreshCtx, 60));

    wrap.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = wrap.querySelector('button');
      const note = wrap.querySelector('#rlNote');
      const f = e.target;
      const name = f.name.value.trim(), email = f.email.value.trim(), zip = f.zip.value.trim();
      if (!name || !zip || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { f.reportValidity && f.reportValidity(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        await global.Remodely.submitLead({
          name, email, zip, phone: f.phone.value.trim(), timeline,
          context: typeof opts.context === 'function' ? opts.context() : (opts.context || ''),
        });
      } catch (err) {
        // A confirmation we can't back up loses the shop a customer.
        console.error('[remodely] lead failed', err);
        btn.disabled = false; btn.textContent = 'Try again →';
        note.className = 'rl-note bad show';
        note.textContent = "That didn't send. Check your connection and try once more.";
        return;
      }
      wrap.querySelectorAll('.rl-fields,.rl-fine,.rl-when,button').forEach(el => el.style.display = 'none');
      note.className = 'rl-note ok show';
      note.innerHTML = `✓ Thanks, ${escapeHtml(name.split(' ')[0])}. ${escapeHtml(subject[0].toUpperCase()+subject.slice(1))} will be in touch at <b>${escapeHtml(email)}</b>.`;
    });

    // Any CTA marked data-lead-jump scrolls here instead of a dead link.
    document.querySelectorAll('[data-lead-jump],a[href="#leadForm"]').forEach(a =>
      a.addEventListener('click', ev => {
        ev.preventDefault();
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => wrap.querySelector('input[name=name]').focus(), 380);
      }));
  }

  const escapeHtml = s => String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const attach = () => { if (global.Remodely) global.Remodely.mountLeadForm = mount; };
  attach();
  document.addEventListener('DOMContentLoaded', attach);
})(window);
