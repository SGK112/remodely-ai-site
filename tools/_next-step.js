/**
 * The free graders are the top of the funnel and every one of them dead-ended:
 * a contractor ran a tool, learned their site was failing, and had no path to
 * the thing we sell. This appends one honest next step to every grader.
 *
 * Not the floating "add this to your site" buy bar — that belongs on the
 * embeddable widgets and reads as nonsense on a grader. This is a footer that
 * follows from what the grader just told them.
 */
(function () {
  if (window.top !== window.self) return;                       // never inside an embed
  if (new URLSearchParams(location.search).has('shop')) return;  // never on a customer's branded page

  var css = document.createElement('style');
  css.textContent = [
    '.rns{max-width:820px;margin:44px auto 0;padding:0 20px 60px;',
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.rns__in{background:linear-gradient(160deg,#131c2e,#0a0f1a);border:1px solid rgba(255,255,255,.06);',
      'border-radius:20px;padding:30px 28px;color:#f1f5f9;box-shadow:0 20px 50px -20px rgba(0,0,0,.55)}',
    '.rns__eye{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#fb923c;font-weight:700;margin:0}',
    '.rns__h{font-size:clamp(20px,3.4vw,27px);line-height:1.15;letter-spacing:-.02em;margin:8px 0 10px;',
      'font-weight:700;color:#fff;text-wrap:balance}',
    '.rns__p{font-size:15.5px;line-height:1.6;color:rgba(241,245,249,.72);margin:0 0 20px;max-width:56ch}',
    '.rns__row{display:flex;gap:11px;flex-wrap:wrap;align-items:center}',
    '.rns__a{display:inline-block;font-size:15px;font-weight:700;text-decoration:none;padding:13px 22px;',
      'border-radius:12px;color:#fff;background:linear-gradient(135deg,#fb923c,#ea580c)}',
    '.rns__a:hover{filter:brightness(1.07)}',
    '.rns__b{display:inline-block;font-size:15px;font-weight:600;text-decoration:none;padding:13px 20px;',
      'border-radius:12px;color:#f1f5f9;border:1px solid rgba(255,255,255,.22)}',
    '.rns__b:hover{border-color:#fb923c;color:#fff}',
    '.rns__fine{font-size:12.5px;color:rgba(241,245,249,.45);margin:15px 0 0}'
  ].join('');
  document.head.appendChild(css);

  var s = document.createElement('section');
  s.className = 'rns';
  s.innerHTML =
    '<div class="rns__in">' +
      '<p class="rns__eye">Next step</p>' +
      '<h2 class="rns__h">Being found is only half of it.</h2>' +
      '<p class="rns__p">The visitors you already get mostly leave without calling. Remodely gives you ' +
        'the pieces that catch them — an instant quote calculator, a service-area check, a callback ' +
        'request, your real Google reviews — branded to your business and dropped into your site with ' +
        'one line of code.</p>' +
      '<div class="rns__row">' +
        '<a class="rns__a" href="/widgets/">See the widgets &rarr;</a>' +
        '<a class="rns__b" href="/pricing/">Pricing</a>' +
      '</div>' +
      '<p class="rns__fine">Every tool on this page stays free.</p>' +
    '</div>';

  (document.body || document.documentElement).appendChild(s);
})();
