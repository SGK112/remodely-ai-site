#!/usr/bin/env node
/**
 * The sitemap was hand-maintained and had drifted badly: it listed the ten free
 * graders — which sell nothing — while every page that sells the product (the
 * widget landing pages, the widget tools, pricing) was missing. Generate it from
 * what is actually on disk so it can't drift again.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://www.remodely.ai';

// Pages that exist to be used, not found: the dashboard is behind a magic link,
// embeds are for other people's sites, legal pages don't need crawl budget.
const EXCLUDE = /^\/(dashboard|embed|home-preview|admin)/;

const priority = url => {
  if (url === '/') return '1.0';
  if (url.startsWith('/pricing')) return '0.9';
  if (url.startsWith('/widgets')) return '0.9';   // these are what we sell
  if (url.startsWith('/tools')) return '0.7';     // free, top of funnel
  return '0.5';
};

const urls = new Set(['/']);
const walk = dir => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const rel = `${dir}/${e.name}`.replace(/^\/+/, '/');
    if (e.isDirectory()) { walk(rel); continue; }
    if (!e.name.endsWith('.html')) continue;
    let url = e.name === 'index.html' ? rel.replace(/index\.html$/, '') : rel;
    if (url.length > 1) url = url.replace(/\/$/, '/');
    if (EXCLUDE.test(url)) continue;
    // Don't advertise a page that tells crawlers to ignore it.
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (/<meta[^>]+noindex/i.test(html)) continue;
    urls.add(url);
  }
};
walk('');

const today = new Date().toISOString().slice(0, 10);
const body = [...urls].sort().map(u => `  <url>
    <loc>${ORIGIN}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority(u)}</priority>
  </url>`).join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`sitemap.xml: ${urls.size} URLs`);
