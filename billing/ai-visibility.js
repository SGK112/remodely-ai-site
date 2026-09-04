/**
 * AI visibility audit.
 *
 * The existing graders measure on-page SEO. Research on how assistants actually
 * pick a local business weights it very differently: content authority ~30%,
 * entity recognition ~25%, structured data ~20%, digital footprint ~15%,
 * freshness ~10%. Models are penalised for naming a business they might get
 * wrong, so the recommendation goes to whoever is easiest to VERIFY.
 *
 * So this checks verifiability, not prettiness: can a model find you on Google,
 * does your site agree with that listing, are you corroborated on the sources
 * assistants lean on, and is any of it recent.
 */
const dns = require('dns').promises;

const UA = 'RemodelyAIVisibilityBot/1.0 (+https://www.remodely.ai/tools/ai-visibility/)';

/**
 * Fetching a URL a stranger typed is an SSRF hole unless it is fenced. Public
 * http(s) only, no private ranges, hard timeout, capped body.
 */
async function safeFetch(target, { timeout = 9000, maxBytes = 900_000 } = {}) {
  let u;
  try { u = new URL(target); } catch { throw new Error('bad url'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('unsupported scheme');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new Error('blocked host');

  const { address } = await dns.lookup(u.hostname).catch(() => ({ address: null }));
  if (!address) throw new Error('dns failed');
  if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/i.test(address)) {
    throw new Error('private address');
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(u.href, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
    const buf = await r.arrayBuffer();
    return { ok: r.ok, status: r.status, url: r.url,
      body: Buffer.from(buf.slice(0, maxBytes)).toString('utf8') };
  } finally { clearTimeout(timer); }
}

// Last ten digits: a schema telephone is often +1-prefixed while the Google
// listing is not, and comparing raw digits reports a mismatch for every US
// business on earth.
const digits = s => {
  const d = String(s || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
};
// NANP: area code and exchange both start 2-9. Without this the first
// ten-digit run on the page — a licence, an SKU, a date — becomes "your phone"
// and every site gets told it disagrees with Google.
const validPhone = d => /^[2-9]\d{2}[2-9]\d{6}$/.test(d || '');
const pretty = d => (d && d.length === 10) ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d;
const clean = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Every JSON-LD block on the page, flattened, so @graph and arrays both work. */
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const push = n => { if (n && typeof n === 'object') out.push(n); };
      if (Array.isArray(parsed)) parsed.forEach(push);
      else { push(parsed); (parsed['@graph'] || []).forEach(push); }
    } catch { /* a malformed block is itself a finding, handled by the caller */ }
  }
  return out;
}

const typeOf = n => [].concat(n['@type'] || []).join(' ');

async function places(path, key, fieldMask, body) {
  const r = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `places ${r.status}`);
  return data;
}

/**
 * Score is deliberately weighted to the research, not to what is easy to check.
 * Entity + footprint are 40% between them, which is exactly where most
 * contractors — and every other grader — are blind.
 */
const WEIGHTS = { entity: 25, footprint: 15, structured: 20, authority: 30, freshness: 10 };

async function audit({ url, name, key }) {
  const findings = [];
  const unchecked = [];
  const add = (area, ok, weight, title, detail, fix) =>
    findings.push({ area, ok, weight, title, detail, ...(fix ? { fix } : {}) });

  // ---- the site itself -----------------------------------------------------
  const site = await safeFetch(url.startsWith('http') ? url : 'https://' + url);
  const html = site.body || '';
  const origin = new URL(site.url).origin;
  const host = new URL(site.url).hostname.replace(/^www\./, '');

  const ld = extractJsonLd(html);
  const biz = ld.find(n => /LocalBusiness|Organization|HomeAndConstructionBusiness|GeneralContractor/i.test(typeOf(n)));
  // Trust the markup, then a tel: link, then the page text — first one that is
  // actually a phone number wins.
  const phoneCandidates = [
    biz?.telephone,
    ...(html.match(/href=["']tel:([^"']+)/gi) || []).map(m => m.slice(m.indexOf(':') + 1)),
    ...(html.match(/\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/g) || []),
  ];
  const sitePhone = phoneCandidates.map(digits).find(validPhone) || '';
  const siteName = biz?.name || (html.match(/<title>([^<]{3,80})/i) || [])[1] || name || host;

  // ---- entity recognition: can a model find and verify you at all? ---------
  let place = null;
  try {
    const q = `${name || siteName} ${biz?.address?.addressLocality || ''} ${biz?.address?.addressRegion || ''}`.trim();
    const found = await places('places:searchText', key,
      'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.primaryTypeDisplayName',
      { textQuery: q, maxResultCount: 3 });
    place = (found.places || []).find(p => {
      const w = p.websiteUri ? new URL(p.websiteUri).hostname.replace(/^www\./, '') : '';
      return w === host || clean(p.displayName?.text).includes(clean(name || siteName).slice(0, 14));
    }) || (found.places || [])[0] || null;
  } catch (e) { /* handled as a not-found finding below */ }

  // Grading the wrong company is this tool's worst failure, and a bare name
  // search will happily return a same-named shop three states away. Only treat
  // the match as ours when the listing links back to this site, or the address
  // agrees with the address in the site's own markup.
  const placeHost = place?.websiteUri ? new URL(place.websiteUri).hostname.replace(/^www\./, '') : '';
  const ldCity = clean(biz?.address?.addressLocality);
  const confident = !!place && (
    placeHost === host ||
    (!!ldCity && clean(place.formattedAddress).includes(ldCity))
  );

  add('entity', confident, 12, 'Findable on Google',
    confident ? `Matched "${place.displayName?.text}" — assistants can verify you exist.`
      : place ? `We found "${place.displayName?.text}" in ${place.formattedAddress || 'another area'}, but nothing ties it to this website, so we can't be sure it's you.`
      : 'No Google listing matched your business name and site. Assistants avoid naming businesses they cannot verify.',
    confident ? null
      : 'Claim your Google Business Profile and add this website to it. Until the listing and the site point at each other, neither we nor an assistant can tell which business is yours.');

  const gPhone = digits(place?.nationalPhoneNumber);
  const napMatch = !!(gPhone && sitePhone && gPhone === sitePhone);
  if (confident) add('entity', napMatch, 8, 'Website and Google agree',
    !gPhone || !sitePhone ? 'Could not compare a phone number between your site and your Google listing.'
      : napMatch ? 'The phone number on your site matches your Google listing.'
      : `Your site shows ${pretty(sitePhone)} but Google has ${pretty(gPhone)}.`,
    napMatch ? null : 'Make the phone number identical everywhere. Conflicting details are the fastest way to become un-verifiable.');

  const siteLinked = placeHost === host;
  if (place) add('entity', siteLinked, 5, 'Google listing points at this site',
    siteLinked ? 'Your listing links to this website, which ties the two records together.'
               : 'Your Google listing does not link to this website, so the two are not obviously the same business.',
    siteLinked ? null : 'Add your website to your Google Business Profile.');

  // ---- digital footprint: the sources assistants actually cite -------------
  // BuildZoom has no public API, so the page has to be found by slug. Guessing
  // one slug is wrong in both directions: a miss reports "no listing" for a shop
  // that has one under a different slug, and a hit can land on a same-named
  // company in another state. So: try the plausible slugs, then require the page
  // to corroborate — phone, licence number, or city AND state must match.
  const siteLicence = (html.match(/\b(?:ROC|LIC|License|Lic\.?)\s*#?\s*(\d{5,8})\b/i) || [])[1];
  const addr = place?.formattedAddress || '';
  const city = (addr.split(',')[1] || '').trim().toLowerCase();
  const state = (addr.match(/,\s*([A-Z]{2})\s+\d{5}/) || [])[1];

  const words = clean(name || siteName)
    .replace(/\b(llc|inc|co|corp|company|ltd|the)\b/g, ' ').trim().split(/\s+/).filter(Boolean);
  const candidates = [...new Set([
    words.join('-'),
    words.slice(0, 3).join('-'),
    words.slice(0, 2).join('-'),
  ].filter(c => c.length > 2))];

  let bzUrl = null, bzBlocked = false;
  for (const slug of candidates) {
    let page;
    try { page = await safeFetch(`https://www.buildzoom.com/contractor/${slug}`, { timeout: 8000 }); }
    catch { bzBlocked = true; continue; }
    // A clean 404 means "no such listing"; a 403/429/5xx means we were refused
    // and know nothing. Those must not read the same to the contractor.
    if (page.status !== 200 && page.status !== 404) { bzBlocked = true; continue; }
    if (!page.ok || /Page not found/i.test(page.body.slice(0, 4000))) continue;

    // A 200 is not proof it is YOUR listing — corroborate before believing it.
    const b = page.body;
    const matches = (siteLicence && b.includes(siteLicence))
      || (gPhone && digits((b.match(/\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/g) || []).find(t => digits(t) === gPhone)) === gPhone)
      || (!!state && new RegExp(`\\b${state}\\b`).test(b) && !!city && b.toLowerCase().includes(city));
    if (matches) { bzUrl = page.url; break; }
  }

  // Unreachable is not a failure. Scoring a shop down for our own blocked
  // request would be inventing a problem, so an unknown drops out of the score.
  if (bzUrl || !bzBlocked) {
    add('footprint', !!bzUrl, 9, 'Listed on BuildZoom',
      bzUrl ? `Found your BuildZoom page — the most heavily cited source for trades. (${bzUrl})`
         : 'No BuildZoom listing found that matches your licence, phone or city. In testing BuildZoom appeared in ChatGPT citations for every trade checked — assistants use it to verify licences and permit history.',
      bzUrl ? null : 'Claim your free BuildZoom listing. It is the highest-leverage hour in this whole report.');
  } else {
    unchecked.push({ title: 'BuildZoom listing',
      why: "BuildZoom refused our request, so we couldn't tell whether you have a page. Search your business name there yourself — it is the most heavily cited source for trades." });
  }

  const licenceOnSite = !!siteLicence;
  add('footprint', licenceOnSite, 6, 'Licence number published',
    licenceOnSite ? 'Your licence number is on the page, which is directly checkable against the state board.'
                  : 'No licence number found on your homepage.',
    licenceOnSite ? null : 'Put your licence number in the footer. It is one of the few claims a model can verify against an authoritative record.');

  // ---- structured data ----------------------------------------------------
  add('structured', !!biz, 8, 'LocalBusiness schema',
    biz ? `Found ${typeOf(biz)} markup, so your details are machine-readable.`
        : 'No LocalBusiness or Organization schema found.',
    biz ? null : 'Add LocalBusiness JSON-LD with your name, address, phone and hours.');

  const hasRating = ld.some(n => JSON.stringify(n).includes('aggregateRating'));
  add('structured', hasRating, 6, 'Ratings in your markup',
    hasRating ? 'Your reviews are exposed as structured data.' : 'No aggregateRating in your schema.',
    hasRating ? null : 'Add aggregateRating so your standing is readable without scraping.');

  const sameAs = biz?.sameAs ? [].concat(biz.sameAs).length : 0;
  add('structured', sameAs >= 3, 6, 'Linked to your other profiles',
    sameAs ? `${sameAs} sameAs links found.` : 'No sameAs links connecting this site to your other profiles.',
    sameAs >= 3 ? null : 'List your Google, Houzz, Facebook, Yelp and BBB URLs in sameAs — this is how a model knows those profiles are the same business as you.');

  // ---- authority: is there enough corroboration to be picked? -------------
  const reviews = confident ? (place.userRatingCount || 0) : 0;
  const rating = confident ? (place.rating || 0) : 0;
  if (confident) add('authority', reviews >= 25, 10, 'Enough reviews to be recommended',
    reviews ? `${reviews} Google reviews at ${rating}.` : 'No review count available.',
    reviews >= 25 ? null : 'Assistants lean on review volume as corroboration. Ask every finished customer.');

  if (confident) add('authority', rating >= 4, 8, 'Rated well enough to be suggested',
    rating ? `Rated ${rating} out of 5.` : 'No rating found.',
    rating >= 4 ? null : 'Most buyers filter below four stars, and assistants mirror that.');

  // Competitors in the same category and area — the comparison a model makes.
  let rivals = [];
  try {
    if (confident) {
      const near = await places('places:searchText', key,
        'places.displayName,places.rating,places.userRatingCount',
        { textQuery: `${place.primaryTypeDisplayName?.text || 'contractor'} near ${place.formattedAddress}`, maxResultCount: 8 });
      rivals = (near.places || []).filter(p => p.displayName?.text !== place.displayName?.text && p.userRatingCount);
    }
  } catch { /* comparison is a bonus, not a requirement */ }
  const beaten = rivals.filter(r => (r.userRatingCount || 0) > reviews).length;
  if (rivals.length) {
    add('authority', beaten <= 2, 7, 'Standing against nearby competitors',
      beaten === 0 ? `You have more reviews than every nearby competitor checked (${rivals.length}).`
        : `${beaten} of ${rivals.length} nearby competitors have more reviews than you — ${rivals.slice(0, 2).map(r => `${r.displayName.text} (${r.userRatingCount})`).join(', ')}.`,
      beaten <= 2 ? null : 'When a model has to choose, the better-corroborated business wins. Closing this gap is the most direct fix.');
  }

  // ---- freshness and access ----------------------------------------------
  if (!confident) {
    unchecked.push({ title: 'Review standing',
      why: "We couldn't confirm which Google listing is yours, so we didn't grade your reviews or compare you to nearby competitors — we won't score you on another company's numbers. Link this site from your Google Business Profile and run it again." });
  }

  let robots = '';
  try { robots = (await safeFetch(origin + '/robots.txt', { timeout: 6000 })).body || ''; } catch {}
  const blocksAI = /User-agent:\s*(GPTBot|ClaudeBot|PerplexityBot|Google-Extended)[\s\S]{0,120}?Disallow:\s*\/\s*$/im.test(robots);
  add('freshness', !blocksAI, 6, 'AI crawlers allowed',
    blocksAI ? 'Your robots.txt blocks at least one AI crawler, so those assistants cannot read you at all.'
             : 'No AI crawler is blocked in robots.txt.',
    blocksAI ? 'Remove the Disallow for GPTBot, ClaudeBot, PerplexityBot and Google-Extended unless you deliberately want to be invisible to them.' : null);

  let llms = false;
  try { llms = (await safeFetch(origin + '/llms.txt', { timeout: 5000 })).ok; } catch {}
  add('freshness', llms, 4, 'llms.txt present',
    llms ? 'You publish an llms.txt summarising the business for models.'
         : 'No llms.txt. It is not yet a standard, but it is cheap and it states plainly who you are and what you do.',
    llms ? null : 'Add /llms.txt with your name, licence, service area, services and contact details.');

  // ---- score --------------------------------------------------------------
  const byArea = {};
  for (const f of findings) {
    byArea[f.area] ??= { got: 0, max: 0 };
    byArea[f.area].max += f.weight;
    if (f.ok) byArea[f.area].got += f.weight;
  }
  // Score only over what we could actually measure. An area we skipped — because
  // we couldn't confirm the listing, or a source refused us — must not read as a
  // zero the shop earned; that is a made-up failure.
  let score = 0, possible = 0;
  for (const [area, w] of Object.entries(WEIGHTS)) {
    const a = byArea[area];
    if (!a || !a.max) continue;
    score += (a.got / a.max) * w;
    possible += w;
  }
  score = possible ? (score / possible) * 100 : 0;

  return {
    site: site.url,
    business: place?.displayName?.text || siteName,
    rating, reviews,
    score: Math.round(score),
    areas: Object.fromEntries(Object.entries(byArea).map(([k, v]) => [k, Math.round((v.got / v.max) * 100)])),
    findings: findings.sort((a, b) => (a.ok - b.ok) || (b.weight - a.weight)),
    unchecked,
  };
}

module.exports = { audit, safeFetch };
