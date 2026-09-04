/**
 * "Put this on your own website" bar, shown inside every tool.
 *
 * People decide while they're using the thing, not on a pricing page they have to
 * go and find — so the buy action lives in the tool. Deliberately standalone
 * rather than part of _tenant.js: the edge visualizer carries its own tenant
 * logic, and every tool needs this regardless of how it resolves a shop.
 *
 * It must NEVER render when the tool is embedded on a customer's site or branded
 * for a shop — our sales pitch has no business on their page.
 *
 *   <script src="/tools/_buybar.js"></script>
 */
(function () {
  const q = new URLSearchParams(location.search);
  const hasShop = !!(q.get('shop') || '').trim();
  const isEmbed = q.get('embed') === '1' || location.pathname.startsWith('/embed/');
  const framed = window.top !== window.self;
  if (hasShop || isEmbed || framed) return;

  try { if (sessionStorage.getItem('rl-buybar-dismissed') === '1') return; } catch (e) {}

  function mount() {
    if (document.getElementById('rl-buybar')) return;
    const css = document.createElement('style');
    css.textContent = `
      #rl-buybar{position:fixed;left:0;right:0;bottom:0;z-index:99999;
        background:rgba(10,15,26,.97);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
        border-top:1px solid rgba(255,255,255,.14);
        padding:11px 16px calc(11px + env(safe-area-inset-bottom));
        display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap;
        font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
      #rl-buybar p{margin:0;color:#cbd5e1;font-size:14px;line-height:1.4}
      #rl-buybar b{color:#fff}
      #rl-buybar .rl-go{background:linear-gradient(135deg,#fb923c,#ea580c);color:#fff;
        text-decoration:none;font-weight:700;font-size:15px;padding:11px 20px;border-radius:10px;white-space:nowrap}
      #rl-buybar .rl-go:hover{filter:brightness(1.07)}
      #rl-buybar .rl-x{background:none;border:0;color:#7c8798;font-size:22px;cursor:pointer;line-height:1;padding:2px 6px}
      #rl-buybar .rl-x:hover{color:#fff}
      body{padding-bottom:104px}
      @media (max-width:600px){
        #rl-buybar{gap:8px;padding-inline:12px}
        #rl-buybar p{font-size:13px;flex:1 1 100%;text-align:center;order:1}
        #rl-buybar .rl-go{order:2;flex:1 1 auto;text-align:center}
        #rl-buybar .rl-x{order:3}
        body{padding-bottom:132px}
      }
    `;
    document.head.appendChild(css);

    const bar = document.createElement('div');
    bar.id = 'rl-buybar';
    bar.innerHTML =
      '<p><b>Want this on your own website?</b> Nothing to download &mdash; you paste one line.</p>' +
      '<a class="rl-go" href="/pricing/">Add to my site &mdash; $49/mo &rarr;</a>' +
      '<button class="rl-x" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(bar);

    bar.querySelector('.rl-x').addEventListener('click', function () {
      bar.remove();
      document.body.style.paddingBottom = '';
      try { sessionStorage.setItem('rl-buybar-dismissed', '1'); } catch (e) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
