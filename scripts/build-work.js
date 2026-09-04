#!/usr/bin/env node
/**
 * /work/ — the studio portfolio.
 *
 * remodely.ai read as a one-product widget shop. It is the studio behind a
 * voice-AI CRM with shipped mobile apps, a website builder, delivered client
 * builds and a countertop business running on its own software.
 *
 * Every entry here is live and screenshotted from production
 * (scripts/capture-portfolio.js). Work that is not shipped is described as what
 * it is — a page arguing that AI recommends whoever it can verify cannot itself
 * claim products that do not exist.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.remodely.ai';

const WORK = [
  {
    name: 'VoiceNow CRM',
    tag: 'Product · Voice AI',
    url: 'https://www.voicenowcrm.com/',
    img: '/images/work/voicenow.png',
    lede: 'An AI voice agent that answers the phone, qualifies the caller, books the job and writes it into the CRM — with the CRM underneath it.',
    detail: 'Live telephony over LiveKit with streaming speech, a tool-calling agent that quotes real jobs from a real price book, SMS and email follow-up, estimates and invoices with Stripe, and a scheduling layer. Shipped as a web app and as native iOS and Android builds.',
    stack: ['LiveKit', 'Deepgram', 'Claude', 'Stripe', 'MongoDB', 'Expo / React Native'],
    facts: ['iOS + Android, v1.2.0', 'Answers live calls', 'Quotes from a real price book'],
  },
  {
    name: 'Remodely Design Pro',
    tag: 'Product · Kitchen design & fabrication',
    url: 'https://www.surprisegranite.com/tools/room-designer/',
    img: '/images/work/design-pro.png',
    lede: 'Draw the room, lay the cabinets, pick the stone, and get a fabrication plan and a priced item list out the other end.',
    detail: '2D plan and 3D view, a searchable element library with real cabinet catalogues, slab layout against actual inventory, cut lists and cutouts on the fabrication plan, building-standards validation, and a quick quote that toggles between retail and cost. Runs in the browser with an offline-capable service worker, and it is what the countertop shop designs jobs in.',
    stack: ['Canvas + WebGL', 'Slab layout engine', 'Stone price book', 'Supabase', 'PWA'],
    facts: ['2D plan + 3D view', 'Fabrication plans with cut lists', 'Live retail and cost pricing'],
  },
  {
    name: 'Blueprint Takeoff',
    tag: 'Product · Estimating',
    url: 'https://www.surprisegranite.com/tools/blueprint-takeoff/',
    img: '/images/work/blueprint-takeoff.png',
    lede: 'Upload the plan set, get a quantity takeoff, a priced estimate and a proposal out the far end.',
    detail: 'Five steps — upload, pick the sheets, extract materials, price the estimate, send the proposal. Reads the drawings, holds your own catalogues and rates rather than generic ones, saves projects between sessions, and hands back a document a customer can accept.',
    stack: ['Plan extraction', 'Catalogues + rate cards', 'Canvas', 'Node API'],
    facts: ['Plans to proposal in five steps', 'Your catalogues and your rates', 'Saved projects'],
  },
  {
    name: 'Webstew',
    tag: 'Product · AI website builder',
    url: 'https://www.webstew.net/',
    img: '/images/work/webstew.png',
    lede: 'Describe the business, get a working site — then keep editing it in plain language.',
    detail: 'An AI website builder with a CMS, integration actions and a built-in site grader, driven conversationally rather than through a page of settings.',
    stack: ['Node', 'Claude', 'CMS', 'Cloudflare'],
    facts: ['Conversational editing', 'CMS + integrations', 'Built-in site grading'],
  },
  {
    name: 'Remodely lead tools',
    tag: 'Product · Lead capture & reporting',
    url: '/widgets/',
    img: '/images/work/widgets.png',
    lede: 'Drop-in tools that turn a contractor’s traffic into quote requests, plus AI visibility reporting on whether assistants can verify the business at all.',
    detail: 'Eight white-label widgets — instant quote calculator, service-area check, callback request, financing, before/after, live Google reviews, edge visualiser, design gallery — each branded to the shop and installed with one line. Alongside them, an audit that checks the off-site signals other graders miss and tracks each site’s standing month to month.',
    stack: ['Firestore', 'Stripe', 'Google Places', 'Zero-dependency Node'],
    facts: ['8 branded widgets', 'White-label reports', 'One line to install'],
  },
  {
    name: 'Scottsdale Handyman Solutions',
    tag: 'Client build',
    url: 'https://scottsdalehandyman.com/',
    img: '/images/work/handyman.png',
    lede: 'A full delivery for a home-services company: public site, technician portal and the API behind both.',
    detail: 'Booking and lead capture on the front, a pro portal for the people doing the work, and a service API joining them — designed, built and hosted.',
    stack: ['Static front end', 'Node API', 'Portal', 'Render'],
    facts: ['Site + portal + API', 'Live in production'],
  },
  {
    name: 'Surprise Granite',
    tag: 'Owned business · Proving ground',
    url: 'https://www.surprisegranite.com/',
    img: '/images/work/surprise.png',
    lede: 'A working countertop company running on this software — which is why the tools handle the awkward parts.',
    detail: 'Thousands of catalogue products with live vendor pricing and stock, a slab and remnant feed, an itemised estimating engine, a countertop visualiser, and the voice agent taking calls. Everything here was built against a real business with real customers, not a demo.',
    stack: ['Vendor sync', 'Estimating engine', 'Catalog API', 'Aria voice'],
    facts: ['Live catalogue + pricing', 'Real customers', 'Where the tools get tested'],
  },
];

const CAPABILITIES = [
  ['Advanced AI systems', 'Tool-calling agents that do real work — quote a job, read a price book, answer a call, audit a site — not chat wrappers. Voice pipelines with streaming speech and interruption handling.'],
  ['Mobile apps', 'Native iOS and Android delivery through Expo and EAS, shipped to the stores from the same codebase as the web app.'],
  ['Web platforms', 'APIs, CMSs, billing on Stripe, subscription and usage models, dashboards, and the unglamorous plumbing — webhooks, idempotency, retries — that keeps them honest.'],
  ['Security & infrastructure', 'Cloudflare in front, secrets kept out of public repos, tokened access, rate limiting and SSRF fencing on anything that fetches a URL a stranger typed.'],
  ['Data & integrations', 'Vendor catalogues, price books, Google Places, Gmail, Stripe, Firestore, Mongo — synced, reconciled and kept current on a schedule.'],
  ['AI visibility', 'The off-site work that decides whether an assistant will name a business: listings, licences, NAP consistency, directory presence, review standing.'],
];

const MARK = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="mark">
  <defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#4285F4"/><stop offset="25%" stop-color="#EA4335"/>
  <stop offset="50%" stop-color="#FBBC05"/><stop offset="100%" stop-color="#34A853"/></linearGradient></defs>
  <path d="M3 21V10l9-7 9 7v11" stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 21h-7" stroke="#34A853" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const page = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Work · Remodely AI</title>
<meta name="description" content="The studio behind VoiceNow CRM, Webstew, the Remodely lead tools and delivered client builds — voice AI, mobile apps, web platforms and the infrastructure under them.">
<link rel="canonical" href="${SITE}/work/">
<link rel="icon" type="image/svg+xml" href="/images/remodely-house-logo.svg">
<meta property="og:title" content="Work · Remodely AI">
<meta property="og:description" content="Voice AI, mobile apps, web platforms and client builds — all live, all screenshotted from production.">
<meta property="og:url" content="${SITE}/work/">
<meta property="og:image" content="${SITE}/images/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Work · Remodely AI">
<meta name="twitter:description" content="Voice AI, mobile apps, web platforms and client builds — all live, all screenshotted from production.">
<meta name="twitter:image" content="${SITE}/images/og.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">
<link rel="stylesheet" href="/blog/blog.css?v=1">
<link rel="stylesheet" href="/work/work.css?v=1">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Work — Remodely AI',
  url: SITE + '/work/',
  about: WORK.map(w => ({ '@type': 'SoftwareApplication', name: w.name,
    applicationCategory: 'BusinessApplication', description: w.lede,
    url: w.url.startsWith('http') ? w.url : SITE + w.url })),
})}</script>
</head>
<body>
<header class="nav"><a class="brand" href="/">${MARK}<b>remodely<i>.ai</i></b></a>
  <nav><a href="/work/">Work</a><a href="/blog/">Blog</a><a href="/tools/ai-visibility/">Free audit</a><a class="cta" href="/pricing/">Pricing</a></nav></header>

<div class="wrap narrow blog-head">
  <p class="kicker"><span class="tag">The studio</span></p>
  <h1>We build the software, then run our own business on it.</h1>
  <p class="dek">Voice agents that answer real calls, apps in both stores, platforms with billing
    underneath them, and a countertop company that has been the test bed for all of it. Every
    project below is live — the screenshots are production, taken today.</p>
</div>

<section class="wrap projects">
  ${WORK.map((w, i) => `<article class="proj${i === 0 ? ' lead' : ''}">
    <a class="shot" href="${w.url}"${w.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>
      <img src="${w.img}" alt="${w.name} — live product screenshot" loading="${i === 0 ? 'eager' : 'lazy'}" width="1280" height="800">
    </a>
    <div class="txt">
      <span class="tag">${w.tag}</span>
      <h2>${w.name}</h2>
      <p class="lede">${w.lede}</p>
      <p class="detail">${w.detail}</p>
      <ul class="facts">${w.facts.map(f => `<li>${f}</li>`).join('')}</ul>
      <p class="stack">${w.stack.join(' · ')}</p>
      <a class="visit" href="${w.url}"${w.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Visit ${w.name} &rarr;</a>
    </div>
  </article>`).join('\n  ')}
</section>

<section class="capbox"><div class="wrap">
  <p class="kicker"><span class="tag">What we do</span></p>
  <h2 class="caph">The parts we actually build</h2>
  <div class="caps">
    ${CAPABILITIES.map(([h, d]) => `<div class="cap"><h3>${h}</h3><p>${d}</p></div>`).join('\n    ')}
  </div>
</div></section>

<section class="wrap narrow">
  <aside class="cta-box">
    <h2>Have something to build?</h2>
    <p>Tell us what the business needs to do. If it is a fit we will say so, and if it is not we
       will say that too.</p>
    <a class="btn" href="mailto:support@remodely.ai?subject=Project%20enquiry">Start a conversation &rarr;</a>
  </aside>
</section>

<footer class="foot"><div class="wrap">
  <p><b>Remodely AI</b> — software studio. Voice AI, mobile, web platforms and the infrastructure under them.</p>
  <p><a href="/work/">Work</a> · <a href="/blog/">Blog</a> · <a href="/tools/ai-visibility/">Free audit</a> ·
     <a href="/widgets/">Widgets</a> · <a href="/pricing/">Pricing</a></p>
</div></footer>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'work'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'work', 'index.html'), page());
console.log(`  /work/  (${WORK.length} projects, ${CAPABILITIES.length} capabilities)`);
