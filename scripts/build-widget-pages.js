#!/usr/bin/env node
/**
 * Build a landing page per widget at /widgets/<slug>/.
 *
 * This is the acquisition engine, not decoration. A catalogue with no page per
 * item ranks for nothing — Elfsight gets its customers from ~90 widget pages
 * matching search intent like "instagram feed widget for wordpress". Each page
 * here targets one intent, demos the live widget in an iframe, and shows the
 * install steps and the price.
 *
 *   node scripts/build-widget-pages.js
 *
 * The tool pages under /tools/ stay as the bare working widget; these wrap them
 * with the copy a stranger arriving from a search engine needs.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'widgets');
const SITE = 'https://www.remodely.ai';

const toolPath = w => w.tool || w.slug;

const WIDGETS = [
  {
    slug: 'ai-audit',
    tool: 'ai-visibility',
    name: 'AI Visibility Audit',
    intent: 'White-Label AI Visibility Audit Tool for Marketing Agencies',
    hook: 'Give prospects a reason to hand you their website.',
    lede: 'A free audit on your own site, under your own name. A local business types in their address and gets a scored report on whether AI assistants can verify them — Google listing, directory presence, licence, review standing — and <em>you</em> get the lead and the branded report to follow up with.',
    who: 'Marketing agencies, web designers and SEO consultants selling to contractors and local trades.',
    points: [
      ['The report carries your brand', 'Your name, your logo, your colour, your contact details. Send it to a prospect and nothing on it says Remodely.'],
      ['It finds real problems, not meta tags', 'Unclaimed directory listings, a phone that disagrees with Google, no licence on the page, review counts behind every competitor nearby.'],
      ['Every run is a lead', 'The business, their site, their score and exactly what they failed — in your inbox, with a report link you can send straight back.'],
    ],
    height: 1250,
  },
  {
    slug: 'quote-calculator',
    name: 'Instant Quote Calculator',
    intent: 'Instant Quote Calculator Widget for Contractor Websites',
    hook: 'Visitors want a number before they call.',
    lede: 'Put your own services and rates on your website and let a visitor price their own job in about thirty seconds. You get the lead with everything they configured, priced against <em>your</em> numbers — never anybody else\'s.',
    who: 'Any trade that prices by area, unit or job: countertops, flooring, roofing, painting, tile, concrete.',
    points: [
      ['Your rates, not a generic table', 'You set every service and price range in your dashboard. Leave it blank and it collects the job without quoting.'],
      ['Any unit you actually use', 'Per square foot, per square, per room, per linear foot, per job — your wording, your maths.'],
      ['The lead arrives already qualified', 'Service, size and the estimate they saw, in your inbox within minutes.'],
    ],
    height: 1150,
  },
  {
    slug: 'service-area',
    name: 'Service Area Checker',
    intent: 'Service Area ZIP Code Checker Widget for Your Website',
    hook: '"Do you come to me?" is why most visitors leave.',
    lede: 'They type a postcode and get a straight answer in one step, instead of leaving to call somebody who might not cover them either. The ones in range become leads.',
    who: 'Anyone with a travel radius: remodelers, plumbers, HVAC, roofers, landscapers, mobile services.',
    points: [
      ['One field, one answer', 'No form, no phone call, no waiting for someone to get back to them.'],
      ['Out of area still asks', 'A bigger job is often worth the drive, so a near miss offers to ask rather than dead-ending someone who wants to pay you.'],
      ['Never a false no', 'If you have not set your ZIPs, it takes their details instead of turning anyone away.'],
    ],
    height: 820,
  },
  {
    slug: 'before-after',
    name: 'Before &amp; After Slider',
    intent: 'Before and After Photo Slider Widget for Contractors',
    hook: 'You have the photos. Almost nobody shows them properly.',
    lede: 'Drag-to-compare on your own jobs. The single most persuasive thing on a contractor\'s website is the work, and a gallery of thumbnails buries it.',
    who: 'Every trade that changes how something looks: remodeling, painting, roofing, flooring, landscaping, restoration.',
    points: [
      ['Your photos', 'Paste the image URLs from your own site. Caption each job.'],
      ['Works by keyboard too', 'The slider is a real range input, so it is operable and readable to a screen reader, not just draggable.'],
      ['Captures the interest', 'A visitor who drags the handle and likes what they see gets asked, right there.'],
    ],
    height: 900,
  },
  {
    slug: 'reviews',
    name: 'Google Reviews Widget',
    intent: 'Google Reviews Widget for Your Website',
    hook: 'Your reviews are on Google. Your buyers are on your website.',
    lede: 'Pull your real Google rating and reviews onto your own pages, kept current automatically. Nothing hand-picked, nothing edited — which is exactly why people believe it.',
    who: 'Any business with a Google Business Profile and reviews worth showing.',
    points: [
      ['Live from Google', 'Connect your Place ID once. New reviews appear on their own.'],
      ['Never fabricated', 'If the lookup fails it says nothing rather than inventing a rating — social proof you made up is worse than none.'],
      ['Rating, count and the words', 'The score people scan for, and the reviews that actually persuade.'],
    ],
    height: 760,
  },
  {
    slug: 'financing',
    name: 'Monthly Payment Calculator',
    intent: 'Financing and Monthly Payment Calculator Widget',
    hook: 'A big number is why people stall on a big job.',
    lede: 'Show the monthly version on your own financing terms. The same $18,000 kitchen reads very differently at $814 a month, and the visitor who was going to think about it books a call instead.',
    who: 'Anyone selling work over a few thousand dollars: remodeling, roofing, HVAC, windows, solar, hardscape.',
    points: [
      ['Your APR and your terms', 'Set the rate and the lengths you actually offer. No terms set means no calculator, never an invented rate.'],
      ['Proper amortisation', 'Standard monthly payment maths, with 0% handled exactly because a 0% offer is a real one.'],
      ['Leads that name a budget', 'You learn the project size and the term they picked before you speak.'],
    ],
    height: 900,
  },
  {
    slug: 'callback',
    name: 'Request a Callback',
    intent: 'Request a Callback Widget for Contractor Websites',
    hook: 'Most people will not wait on hold, and will not call twice.',
    lede: 'They leave a number and a time that suits them. You call back when you can actually talk, instead of losing them to whoever picked up first.',
    who: 'Any business where the phone is how work gets booked.',
    points: [
      ['A time that suits them', 'This morning, this afternoon, tomorrow — you call when they are ready to talk.'],
      ['Only promises what you set', 'It quotes the response time you configured, or none at all. It will not promise an hour on your behalf.'],
      ['Honest confirmations', 'It never says "done" unless the request genuinely saved.'],
    ],
    height: 820,
  },
  {
    slug: 'edge-visualizer',
    name: 'Countertop Edge Visualizer',
    intent: '3D Countertop Edge Profile Visualizer for Fabricator Websites',
    hook: 'Your customers cannot name the edge they want.',
    lede: 'Eased, ogee, half bullnose, mitered — those are your words, not theirs. Let them spin twelve profiles in real 3D on actual stone and point at the one they like.',
    who: 'Countertop fabricators, stone yards and kitchen dealers.',
    points: [
      ['True 3D on real stone', 'Face, top, cut ends and underside, on photographed slabs rather than drawings.'],
      ['2cm and 3cm shown properly', 'Including how a laminated build-up edge is actually made, because that is the question that follows.'],
      ['They tell you what they want', 'The lead names the profile, the thickness and the stone.'],
    ],
    height: 1250,
  },
  {
    slug: 'design-gallery',
    name: 'Design Gallery',
    intent: 'Kitchen and Bath Design Gallery Widget',
    hook: 'A slab on a rack sells nothing.',
    lede: 'The same stone in a finished kitchen sells itself. Browse rooms by the material in them, filter by space, and capture the visitor who has just found the look they want.',
    who: 'Countertop fabricators, tile and stone showrooms, kitchen and bath dealers.',
    points: [
      ['Browsable by material', 'Granite, quartzite, marble and quartz shown installed, not on a rack.'],
      ['Filter by room', 'Kitchen, bath or living space, so people find their own project.'],
      ['Captures the favourite', 'The lead records which stone they were looking at.'],
    ],
    height: 1000,
  },
];

const esc = s => String(s).replace(/&(?!\w+;)/g, '&amp;');

const page = w => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${w.name.replace(/&amp;/g, '&')}</title>
<meta name="description" content="${w.hook} ${w.lede.replace(/<[^>]+>/g, '').slice(0, 120)}">
<link rel="canonical" href="${SITE}/widgets/${w.slug}/">
<link rel="icon" type="image/svg+xml" href="/images/remodely-house-logo.svg">
<meta property="og:title" content="${w.intent}">
<meta property="og:description" content="${w.hook}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}/widgets/${w.slug}/">
<meta property="og:image" content="${SITE}/images/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SoftwareApplication",
 "name":"${w.name.replace(/&amp;/g, '&')}",
 "applicationCategory":"BusinessApplication","operatingSystem":"Web browser",
 "description":"${w.hook}",
 "url":"${SITE}/widgets/${w.slug}/",
 "offers":{"@type":"Offer","price":"49","priceCurrency":"USD",
   "priceSpecification":{"@type":"UnitPriceSpecification","price":"49","priceCurrency":"USD","billingDuration":1,"billingIncrement":1,"unitText":"MONTH"}},
 "provider":{"@type":"Organization","name":"Remodely AI","url":"${SITE}"}}
</script>
<style>
  :root{--paper:#eef1f5;--sheet:#fff;--ink:#0e141c;--ink-2:#3d4b59;--steel:#5a6b7a;
        --rule:#cdd6de;--rule-soft:#e2e8ee;--accent:#f97316;--accent-deep:#c2410c;
        --accent-wash:rgba(249,115,22,.09);--ok:#15803d;
        --display:"Archivo",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,sans-serif;
        --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
        --shadow:0 1px 2px rgba(14,20,28,.05),0 12px 32px -18px rgba(14,20,28,.28)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --paper:#0a0f1a;--sheet:#121a26;--ink:#e9eef4;--ink-2:#a7b4c2;--steel:#8497a8;
    --rule:#26313f;--rule-soft:#1b2532;--accent:#fb923c;--accent-deep:#fdba74;
    --accent-wash:rgba(251,146,60,.12);--ok:#4ade80;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 16px 40px -20px rgba(0,0,0,.7)}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.62;-webkit-font-smoothing:antialiased}
  a{color:var(--accent-deep)}
  h1,h2,h3{font-family:var(--display);margin:0;letter-spacing:-.017em;text-wrap:balance}
  p{margin:0}
  .wrap{max-width:1000px;margin:0 auto;padding:0 24px}
  .top{border-bottom:1px solid var(--rule);background:var(--sheet)}
  .top .wrap{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-block:13px}
  .logo{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:700;font-size:15px}
  .logo b{color:var(--accent-deep)}
  .top nav{display:flex;gap:16px;font-size:13.5px}
  .top nav a{color:var(--steel);text-decoration:none}
  .top nav a.cta{color:#fff;background:var(--accent);padding:8px 14px;border-radius:4px;font-weight:600}
  .tag{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--steel);
       display:flex;align-items:center;gap:10px;margin:0 0 13px}
  .tag::after{content:"";flex:1;height:1px;background:var(--rule)}
  section{padding-block:52px}
  section+section{border-top:1px solid var(--rule-soft)}
  .hero{padding-top:46px;padding-bottom:24px}
  h1{font-size:clamp(1.9rem,4.4vw,3rem);line-height:1.05;font-weight:700;max-width:18ch}
  .lede{color:var(--ink-2);max-width:58ch;margin-top:15px;font-size:clamp(1rem,1.5vw,1.15rem)}
  .lede em{font-style:normal;color:var(--ink);font-weight:600}
  .row{display:flex;gap:11px;flex-wrap:wrap;margin-top:24px;align-items:center}
  .btn{font-family:var(--display);font-weight:600;font-size:15.5px;padding:12px 19px;border-radius:4px;
       text-decoration:none;display:inline-block;border:1px solid var(--rule);color:var(--ink);background:var(--sheet)}
  .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
  .btn:hover{filter:brightness(1.05)}
  .price{font-family:var(--mono);font-size:12.5px;color:var(--steel)}
  .demo{background:var(--sheet);border:1px solid var(--rule);border-radius:5px;box-shadow:var(--shadow);
        overflow:hidden;margin-top:30px}
  .demo .bar{font-family:var(--mono);font-size:11.5px;color:var(--steel);padding:10px 16px;
             background:var(--accent-wash);border-bottom:1px solid var(--rule-soft)}
  .demo iframe{display:block;width:100%;border:0;height:${w.height}px}
  .points{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
  @media (max-width:800px){.points{grid-template-columns:1fr;gap:18px}}
  .points h3{font-size:1.02rem;font-weight:600;margin-bottom:6px}
  .points p{color:var(--ink-2);font-size:15px}
  .steps{counter-reset:s;list-style:none;margin:22px 0 0;padding:0}
  .steps li{counter-increment:s;position:relative;padding:13px 0 13px 42px;border-bottom:1px solid var(--rule-soft);color:var(--ink-2)}
  .steps li:last-child{border-bottom:0}
  .steps li::before{content:counter(s);position:absolute;left:0;top:13px;width:26px;height:26px;border-radius:50%;
    background:var(--accent-wash);color:var(--accent-deep);font-family:var(--mono);font-size:12px;
    display:flex;align-items:center;justify-content:center;font-weight:600}
  .steps b{color:var(--ink)}
  code.embed{display:block;font-family:var(--mono);font-size:13px;line-height:1.7;background:var(--sheet);
    border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:4px;padding:15px 17px;
    margin-top:18px;overflow-x:auto;white-space:pre;color:var(--ink)}
  .who{background:var(--sheet);border:1px solid var(--rule);border-left:3px solid var(--steel);
       border-radius:4px;padding:18px 20px;margin-top:26px}
  .who b{display:block;margin-bottom:4px}
  .who p{color:var(--ink-2);font-size:15px}
  .more{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:22px}
  .more a{background:var(--sheet);border:1px solid var(--rule);border-radius:4px;padding:14px 16px;
          text-decoration:none;color:var(--ink);font-weight:600;font-size:15px}
  .more a:hover{border-color:var(--accent)}
  .more a span{display:block;font-weight:400;font-size:13px;color:var(--steel);margin-top:3px}
  footer.foot{border-top:1px solid var(--rule);padding-block:24px;font-family:var(--mono);font-size:12px;color:var(--steel)}
  footer.foot .wrap{display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:space-between}
  footer.foot a{color:var(--steel)}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <defs><linearGradient id="rh" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4285F4"/><stop offset="33%" stop-color="#EA4335"/>
        <stop offset="66%" stop-color="#FBBC05"/><stop offset="100%" stop-color="#34A853"/></linearGradient></defs>
      <path d="M3 21V10l9-7 9 7v11" stroke="url(#rh)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 21h-7" stroke="#34A853" stroke-width="3" stroke-linecap="round"/></svg>
    REMODELY<b>.AI</b>
  </a>
  <nav>
    <a href="/widgets/">All widgets</a>
    <a href="/pricing/" class="cta">Get the widgets</a>
  </nav>
</div></header>

<section class="hero"><div class="wrap">
  <p class="tag">${w.name} &middot; widget</p>
  <h1>${w.hook}</h1>
  <p class="lede">${w.lede}</p>
  <div class="row">
    <a class="btn primary" href="/pricing/">Add to my site &mdash; $49/mo &rarr;</a>
    <a class="btn" href="/tools/${toolPath(w)}/">Open it full size</a>
    <span class="price">All eight widgets included &middot; cancel anytime</span>
  </div>

  <div class="demo">
    <p class="bar">Live widget &mdash; not a screenshot. Use it exactly as your visitor would.</p>
    <iframe src="/tools/${toolPath(w)}/" title="${w.name} demo" loading="lazy"></iframe>
  </div>

  <div class="who"><b>Who it's for</b><p>${w.who}</p></div>
</div></section>

<section><div class="wrap">
  <p class="tag">Why it works</p>
  <div class="points">
    ${w.points.map(([h, b]) => `<div><h3>${h}</h3><p>${b}</p></div>`).join('\n    ')}
  </div>
</div></section>

<section><div class="wrap">
  <p class="tag">Putting it on your site</p>
  <h2 style="font-size:clamp(1.4rem,2.4vw,1.9rem);font-weight:600;max-width:22ch">Nothing to download. One line to paste.</h2>
  <ol class="steps">
    <li><b>Sign up</b> and set your name, colours and details. About a minute.</li>
    <li><b>Copy the line</b> we give you on the next screen. We email it too.</li>
    <li><b>Paste it</b> into your page where you want the widget to appear. Works on WordPress, Wix, Squarespace, GoDaddy &mdash; anything that takes an embed.</li>
    <li><b>Leads arrive</b> in your inbox with everything the visitor picked.</li>
  </ol>
  <code class="embed">&lt;iframe src="${SITE}/embed/${toolPath(w)}?shop=<span style="color:var(--accent-deep)">your-shop</span>"
        width="100%" height="${w.height}" style="border:0"&gt;&lt;/iframe&gt;</code>
</div></section>

<section><div class="wrap">
  <p class="tag">The other widgets</p>
  <div class="more">
    ${WIDGETS.filter(x => x.slug !== w.slug).map(x =>
      `<a href="/widgets/${x.slug}/">${x.name}<span>${x.hook}</span></a>`).join('\n    ')}
  </div>
</div></section>

<footer class="foot"><div class="wrap">
  <span>&copy; <span id="yr"></span> Remodely AI</span>
  <span><a href="/widgets/">All widgets</a> &middot; <a href="/pricing/">Pricing</a> &middot;
    <a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a></span>
</div></footer>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>
</body>
</html>
`;

const index = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Website Widgets for Contractors</title>
<meta name="description" content="Eight embeddable widgets that turn a contractor's website visitors into leads — quote calculator, service area checker, before and after slider, Google reviews and more. Your branding, your rates, your leads.">
<link rel="canonical" href="${SITE}/widgets/">
<link rel="icon" type="image/svg+xml" href="/images/remodely-house-logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--paper:#eef1f5;--sheet:#fff;--ink:#0e141c;--ink-2:#3d4b59;--steel:#5a6b7a;
        --rule:#cdd6de;--rule-soft:#e2e8ee;--accent:#f97316;--accent-deep:#c2410c;
        --display:"Archivo",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,sans-serif;
        --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
        --shadow:0 1px 2px rgba(14,20,28,.05),0 12px 32px -18px rgba(14,20,28,.28)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --paper:#0a0f1a;--sheet:#121a26;--ink:#e9eef4;--ink-2:#a7b4c2;--steel:#8497a8;
    --rule:#26313f;--rule-soft:#1b2532;--accent:#fb923c;--accent-deep:#fdba74;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 16px 40px -20px rgba(0,0,0,.7)}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.62}
  a{color:var(--accent-deep)}
  h1,h2,h3{font-family:var(--display);margin:0;letter-spacing:-.017em;text-wrap:balance}
  p{margin:0}
  .wrap{max-width:1000px;margin:0 auto;padding:0 24px}
  .top{border-bottom:1px solid var(--rule);background:var(--sheet)}
  .top .wrap{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-block:13px}
  .logo{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:700;font-size:15px}
  .logo b{color:var(--accent-deep)}
  .top nav a.cta{color:#fff;background:var(--accent);padding:8px 14px;border-radius:4px;font-weight:600;text-decoration:none;font-size:13.5px}
  .tag{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--steel);
       display:flex;align-items:center;gap:10px;margin:0 0 13px}
  .tag::after{content:"";flex:1;height:1px;background:var(--rule)}
  main{padding-block:48px 70px}
  h1{font-size:clamp(2rem,4.6vw,3rem);line-height:1.05;font-weight:700;max-width:17ch}
  .lede{color:var(--ink-2);max-width:58ch;margin-top:15px;font-size:clamp(1rem,1.5vw,1.16rem)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:34px}
  .card{background:var(--sheet);border:1px solid var(--rule);border-radius:5px;box-shadow:var(--shadow);
        padding:20px;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:7px}
  .card:hover{border-color:var(--accent)}
  .card h2{font-size:1.08rem;font-weight:600}
  .card p{color:var(--ink-2);font-size:14.5px}
  .card span{font-family:var(--mono);font-size:11.5px;color:var(--accent-deep);margin-top:auto;padding-top:8px}
  footer.foot{border-top:1px solid var(--rule);padding-block:24px;font-family:var(--mono);font-size:12px;color:var(--steel)}
  footer.foot .wrap{display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:space-between}
  footer.foot a{color:var(--steel)}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <defs><linearGradient id="rh2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4285F4"/><stop offset="33%" stop-color="#EA4335"/>
        <stop offset="66%" stop-color="#FBBC05"/><stop offset="100%" stop-color="#34A853"/></linearGradient></defs>
      <path d="M3 21V10l9-7 9 7v11" stroke="url(#rh2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 21h-7" stroke="#34A853" stroke-width="3" stroke-linecap="round"/></svg>
    REMODELY<b>.AI</b>
  </a>
  <nav><a href="/pricing/" class="cta">Get the widgets</a></nav>
</div></header>

<main><div class="wrap">
  <p class="tag">Widgets for contractor websites</p>
  <h1>Eight ways to stop losing the visitor.</h1>
  <p class="lede">Each one goes on your own website under your name and colours, runs on your own
    numbers, and sends every lead to your inbox. One subscription covers all of them, and there is
    nothing to download &mdash; you paste one line.</p>
  <div class="grid">
    ${WIDGETS.map(w => `<a class="card" href="/widgets/${w.slug}/">
      <h2>${w.name}</h2>
      <p>${w.hook}</p>
      <span>See how it works &rarr;</span>
    </a>`).join('\n    ')}
  </div>
</div></main>

<footer class="foot"><div class="wrap">
  <span>&copy; <span id="yr"></span> Remodely AI</span>
  <span><a href="/pricing/">Pricing</a> &middot; <a href="/tools/">All tools</a> &middot;
    <a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a></span>
</div></footer>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
for (const w of WIDGETS) {
  const dir = path.join(OUT, w.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(w));
  console.log(`  /widgets/${w.slug}/`);
}
fs.writeFileSync(path.join(OUT, 'index.html'), index());
console.log(`  /widgets/  (index of ${WIDGETS.length})`);
