#!/usr/bin/env node
/**
 * The blog.
 *
 * Our own audit weights content authority at 30% — the single biggest factor in
 * whether an assistant will name a business — and remodely.ai published nothing
 * at all. This is the site taking its own advice.
 *
 * Posts are written from work actually done, with imagery captured from the
 * live product (scripts/capture-media.js). Generated so the markup, schema and
 * social cards stay consistent.
 *
 *   node scripts/build-blog.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.remodely.ai';

const POSTS = [
  {
    slug: 'what-ai-assistants-check-before-recommending-a-contractor',
    title: 'What AI assistants check before they recommend a contractor',
    dek: 'They are penalised for naming a business they might get wrong. So the recommendation goes to whoever is easiest to verify — and that is a checklist, not a mystery.',
    date: '2026-09-04',
    read: 6,
    tag: 'AI visibility',
    hero: { img: '/images/product/report.png', alt: 'An AI visibility report showing a score of 27 out of 100 with five weighted areas and ranked fixes' },
    body: `
<p class="lede">A homeowner asks ChatGPT who should redo their kitchen. The model has to name someone. If it names a business that turns out not to exist, or gets the phone number wrong, that is a bad answer — and models are tuned away from bad answers. So it does the safe thing: it names whoever it can <em>verify</em>.</p>

<p>That single pressure explains almost everything about why one contractor gets mentioned and another does not. It is not about keywords, and it is mostly not about your website's copy. It is about whether an independent source agrees that you are real.</p>

<h2>The weighting</h2>
<p>Across the way assistants surface local businesses, five things carry the weight:</p>

<figure class="stat-grid">
  <div><b>30%</b><span>Content authority</span></div>
  <div><b>25%</b><span>Entity recognition</span></div>
  <div><b>20%</b><span>Structured data</span></div>
  <div><b>15%</b><span>Digital footprint</span></div>
  <div><b>10%</b><span>Freshness</span></div>
</figure>

<p>Most site graders check the 20% — schema markup, meta descriptions, alt text — because that part is easy to read off a page. Almost none of them check entity recognition or digital footprint, which are 40% between them and are exactly where most contractors are invisible.</p>

<h2>Entity recognition: can anything confirm you exist?</h2>
<p>This is the foundation. A model looking you up wants a record it did not get from you. Your Google Business Profile is the main one, and three things about it matter more than anything on your website:</p>
<ul>
  <li><b>The listing exists and is complete.</b> No listing, no verification, no recommendation.</li>
  <li><b>Your website and your listing agree.</b> A phone number on your site that differs from the one on Google is the fastest way to become un-verifiable. We see this constantly, and it is usually an old number nobody remembered to change.</li>
  <li><b>They point at each other.</b> Your listing should link to your site. Otherwise the two records are not obviously the same business.</li>
</ul>

<h2>Digital footprint: the sources that get cited</h2>
<p>For trades, the directory that keeps turning up in citations is BuildZoom, because it ties a business to permit history and a state licence — things a model can check against an authoritative record. Your licence number printed in your own footer is worth more than a page of marketing copy, for the same reason.</p>

<h2>Authority: being the safer choice</h2>
<p>When a model has to pick between two businesses that both check out, it takes the better-corroborated one. Review volume is the proxy. This is the least glamorous item on the list and usually the one with the most room in it — most contractors have a fraction of the reviews of the shop down the road, and closing that gap moves the number more than any technical fix.</p>

<h2>What to actually do</h2>
<ol>
  <li>Claim your Google Business Profile and add your website to it.</li>
  <li>Make your phone number identical on your site, your listing and every directory.</li>
  <li>Claim your BuildZoom listing. Search your business name there — it may already exist under a slug you would not guess.</li>
  <li>Put your licence number in your footer.</li>
  <li>Add LocalBusiness schema with your name, address, phone and hours.</li>
  <li>Ask every finished customer for a review. Every one.</li>
</ol>

<p>None of that is clever. It is just verifiable, which is the whole point.</p>
`,
  },
  {
    slug: 'we-audited-our-own-shop-and-found-a-page-we-didnt-know-about',
    title: 'We audited our own shop and found a listing we did not know existed',
    dek: 'A guessed URL said we were absent from the directory AI assistants cite most. We were not. The lesson is about how you search, and it applies to your business too.',
    date: '2026-09-04',
    read: 4,
    tag: 'Field notes',
    hero: { video: '/images/product/audit-demo.webm', poster: '/images/product/grader-start.png', alt: 'The AI visibility audit running against a contractor website' },
    body: `
<p class="lede">While building the audit, we ran it against our own countertop shop. It reported that we had no BuildZoom listing — the directory that shows up most often when an assistant cites a source for a trade. That looked like a real gap, and an easy afternoon's work to fix.</p>

<p>It was wrong. We did have a page. The check had guessed a URL from the business name — <code>surprise-granite-marble-and-quartz</code> — got a 404, and concluded absence. The actual page is at <code>surprise-granite</code>: the trading name, without the legal suffixes. It has been there for years, carrying our current licence number and our real phone number.</p>

<figure class="pull">
  <p>A guessed URL that 404s tells you nothing about whether a listing exists. It tells you your guess was wrong.</p>
</figure>

<h2>Why this matters for you</h2>
<p>If you have ever concluded you are not on a directory because you could not find yourself, check again, and search the short version of your name. Directories slugify aggressively. <em>Anderson Plumbing &amp; Heating LLC</em> is probably filed as <code>anderson-plumbing</code>. An unclaimed page that already carries your licence and phone is doing real work for you — and claiming it is a much faster job than creating one from scratch.</p>

<h2>The other half of the lesson</h2>
<p>A 200 response is not proof either. While fixing this we found that a page under a business's name can belong to an entirely different company — there is an Alba Construction in Pennsylvania and another in New York, and a page carries stray state names in its boilerplate, so matching on location alone credits the wrong business.</p>

<p>The audit now proves the page is yours before it counts it: the licence number or the phone number has to match. When it cannot prove it either way, it says so rather than guessing. A report that confidently tells you something false about your own business is worse than one that admits what it does not know.</p>

<h2>Run it on yourself</h2>
<p>The audit is free, takes about fifteen seconds, and does not ask you to sign up. It checks your Google listing, whether your site agrees with it, your directory presence, your licence, and how your review count compares to the shops nearest you.</p>
`,
  },
  {
    slug: 'your-phone-number-is-probably-why-ai-cannot-verify-you',
    title: 'Your phone number is probably why AI cannot verify you',
    dek: 'The most common failure we find is not technical. It is an old number nobody updated, quietly telling every assistant that your website and your listing are two different businesses.',
    date: '2026-09-04',
    read: 3,
    tag: 'AI visibility',
    hero: { img: '/images/product/grader-start.png', alt: 'The free AI visibility checker, asking for a website address' },
    body: `
<p class="lede">When we compare a contractor's website against their Google listing, the detail that disagrees most often is the phone number. Not the address, not the business name — the phone.</p>

<p>It is almost always innocent. A tracking number went on the website for a campaign that ended. The shop moved from a cell to a landline. Somebody rebuilt the site and copied an old footer. None of it feels important, because a human visitor just calls whichever number they see and gets through.</p>

<p>A model cannot do that. It sees two records that claim to be the same business and disagree on the one detail that should be unambiguous, and it has no way to tell which is right. The safe response is to not name you.</p>

<h2>Where to check</h2>
<p>Make the number identical, character for character, in all of these:</p>
<ul>
  <li>Your website footer and contact page</li>
  <li>Your <code>LocalBusiness</code> schema, if you have it</li>
  <li>Your Google Business Profile</li>
  <li>Your directory listings, BuildZoom included</li>
  <li>Your social profiles</li>
</ul>

<p>Formatting differences are fine — <code>(602) 833-3189</code> and <code>+1 602-833-3189</code> are the same number, and anything reading them properly will normalise that. It is the digits that have to match.</p>

<h2>While you are in there</h2>
<p>The same logic applies to your business name and address. Pick one form of each and use it everywhere. <em>Anderson Plumbing &amp; Heating</em> and <em>Anderson Plumbing and Heating LLC</em> look like one business to you and two records to everything else.</p>

<p>This is the cheapest fix in AI visibility. It costs an hour and it removes the specific reason an assistant would decline to name you.</p>
`,
  },
];

/* ---------------------------------------------------------------- template */
const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US',
  { year: 'numeric', month: 'long', day: 'numeric' });

const HEAD = (p, url, ogImage) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${p.title} · Remodely AI</title>
<meta name="description" content="${p.dek.replace(/"/g, '&quot;')}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/images/remodely-house-logo.svg">
<meta property="og:title" content="${p.title.replace(/"/g, '&quot;')}">
<meta property="og:description" content="${p.dek.replace(/"/g, '&quot;')}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${p.title.replace(/"/g, '&quot;')}">
<meta name="twitter:description" content="${p.dek.replace(/"/g, '&quot;')}">
<meta name="twitter:image" content="${ogImage}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">
<link rel="stylesheet" href="/blog/blog.css?v=1">`;

const SCHEMA = (p, url, ogImage) => `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: p.title,
  description: p.dek,
  image: ogImage,
  datePublished: p.date,
  dateModified: p.date,
  author: { '@type': 'Organization', name: 'Remodely AI', url: SITE + '/' },
  publisher: {
    '@type': 'Organization', name: 'Remodely AI',
    logo: { '@type': 'ImageObject', url: SITE + '/images/remodely-house-logo.svg' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': url },
})}</script>`;

const MARK = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="mark">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#4285F4"/><stop offset="25%" stop-color="#EA4335"/>
  <stop offset="50%" stop-color="#FBBC05"/><stop offset="100%" stop-color="#34A853"/></linearGradient></defs>
  <path d="M3 21V10l9-7 9 7v11" stroke="url(#bg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 21h-7" stroke="#34A853" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const NAV = `<header class="nav"><a class="brand" href="/">${MARK}<b>remodely<i>.ai</i></b></a>
  <nav><a href="/work/">Work</a><a href="/blog/">Blog</a><a href="/tools/ai-visibility/">Free audit</a><a href="/widgets/">Widgets</a><a class="cta" href="/pricing/">Pricing</a></nav></header>`;

const FOOT = `<footer class="foot"><div class="wrap">
  <p><b>Remodely AI</b> — lead tools and AI visibility reporting for remodeling contractors.</p>
  <p><a href="/tools/ai-visibility/">Run a free audit</a> · <a href="/widgets/">Widgets</a> ·
     <a href="/pricing/">Pricing</a> · <a href="/blog/">Blog</a></p>
</div></footer>`;

const hero = p => {
  if (p.hero?.video) {
    return `<figure class="hero-media">
    <video autoplay muted loop playsinline poster="${p.hero.poster}" aria-label="${p.hero.alt}">
      <source src="${p.hero.video}" type="video/webm">
    </video>
    <figcaption>${p.hero.alt}</figcaption>
  </figure>`;
  }
  return `<figure class="hero-media">
    <img src="${p.hero.img}" alt="${p.hero.alt}" loading="eager" width="1160" height="820">
    <figcaption>${p.hero.alt}</figcaption>
  </figure>`;
};

const postPage = p => {
  const url = `${SITE}/blog/${p.slug}/`;
  const ogImage = `${SITE}/images/og-report.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
${HEAD(p, url, ogImage)}
${SCHEMA(p, url, ogImage)}
</head>
<body>
${NAV}
<article class="post">
  <div class="wrap narrow">
    <p class="kicker"><span class="tag">${p.tag}</span> ${fmtDate(p.date)} · ${p.read} min read</p>
    <h1>${p.title}</h1>
    <p class="dek">${p.dek}</p>
  </div>
  <div class="wrap">${hero(p)}</div>
  <div class="wrap narrow body">${p.body.trim()}</div>

  <div class="wrap narrow">
    <aside class="cta-box">
      <h2>See where you stand</h2>
      <p>The free audit checks your Google listing, your directory presence, your licence and your
         review standing against the shops nearest you. Fifteen seconds, no signup.</p>
      <a class="btn" href="/tools/ai-visibility/">Run the free audit &rarr;</a>
    </aside>
  </div>
</article>

<section class="wrap narrow more">
  <h2 class="more-h">More from the blog</h2>
  <div class="cards">
    ${POSTS.filter(x => x.slug !== p.slug).map(x => `<a class="card" href="/blog/${x.slug}/">
      <span class="tag">${x.tag}</span>
      <b>${x.title}</b>
      <span class="d">${x.dek}</span>
    </a>`).join('\n    ')}
  </div>
</section>
${FOOT}
</body>
</html>
`;
};

const indexPage = () => {
  const [lead, ...rest] = POSTS;
  return `<!DOCTYPE html>
<html lang="en">
<head>
${HEAD({ title: 'Blog', dek: 'How AI assistants decide which contractor to recommend — and what to do about it. Field notes from building the audit.' },
  `${SITE}/blog/`, `${SITE}/images/og-tools.png`).replace('<title>Blog · Remodely AI</title>', '<title>Blog · Remodely AI</title>')}
</head>
<body>
${NAV}
<div class="wrap narrow blog-head">
  <p class="kicker"><span class="tag">Blog</span></p>
  <h1>How assistants pick a contractor</h1>
  <p class="dek">Field notes from building the AI visibility audit — what actually decides whether
    ChatGPT names your business, and the fixes that move it.</p>
</div>

<div class="wrap">
  <a class="lead-card" href="/blog/${lead.slug}/">
    <div class="lead-media">${lead.hero.video
      ? `<video autoplay muted loop playsinline poster="${lead.hero.poster}"><source src="${lead.hero.video}" type="video/webm"></video>`
      : `<img src="${lead.hero.img}" alt="${lead.hero.alt}" loading="eager">`}</div>
    <div class="lead-text">
      <span class="tag">${lead.tag}</span>
      <h2>${lead.title}</h2>
      <p>${lead.dek}</p>
      <span class="meta">${fmtDate(lead.date)} · ${lead.read} min read</span>
    </div>
  </a>
</div>

<section class="wrap cards-wide">
  ${rest.map(p => `<a class="card big" href="/blog/${p.slug}/">
    <div class="card-media">${p.hero.video
      ? `<video muted loop playsinline poster="${p.hero.poster}"><source src="${p.hero.video}" type="video/webm"></video>`
      : `<img src="${p.hero.img}" alt="${p.hero.alt}" loading="lazy">`}</div>
    <span class="tag">${p.tag}</span>
    <b>${p.title}</b>
    <span class="d">${p.dek}</span>
    <span class="meta">${fmtDate(p.date)} · ${p.read} min read</span>
  </a>`).join('\n  ')}
</section>
${FOOT}
</body>
</html>
`;
};

for (const p of POSTS) {
  const dir = path.join(ROOT, 'blog', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), postPage(p));
  console.log(`  /blog/${p.slug}/`);
}
fs.writeFileSync(path.join(ROOT, 'blog', 'index.html'), indexPage());
console.log(`  /blog/  (${POSTS.length} posts)`);
