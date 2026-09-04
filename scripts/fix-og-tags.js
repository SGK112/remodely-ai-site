#!/usr/bin/env node
/**
 * Twenty-one pages had no og:image at all and the rest pointed at a file that
 * 404'd, so every link shared from this site unfurled bare. Give every page a
 * real card, picked by what the page is.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://www.remodely.ai';

const cardFor = rel =>
  rel.startsWith('widgets/') ? 'og-widgets' :
  rel.startsWith('tools/')   ? 'og-tools'   : 'og';

const titleOf = html => (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || 'Remodely AI';
const descOf  = html => (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || '';

let fixed = 0, already = 0;
const walk = dir => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!e.name.endsWith('.html')) continue;

    const file = path.join(ROOT, rel);
    let html = fs.readFileSync(file, 'utf8');
    const img = `${ORIGIN}/images/${cardFor(rel)}.png`;

    // A page that already declares an image just needs it pointed somewhere real.
    if (/og:image/i.test(html)) {
      const before = html;
      html = html.replace(/(<meta[^>]+property=["']og:image["'][^>]+content=["'])[^"']*/gi, `$1${img}`)
                 .replace(/(<meta[^>]+name=["']twitter:image["'][^>]+content=["'])[^"']*/gi, `$1${img}`);
      if (html !== before) { fs.writeFileSync(file, html); fixed++; } else already++;
      continue;
    }

    const t = titleOf(html).replace(/"/g, '&quot;');
    const d = descOf(html).replace(/"/g, '&quot;');
    const url = ORIGIN + '/' + rel.replace(/index\.html$/, '');
    const block = `<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
`;
    const i = html.search(/<\/head>/i);
    if (i < 0) continue;
    fs.writeFileSync(file, html.slice(0, i) + block + html.slice(i));
    fixed++;
  }
};
walk('');
console.log(`og tags: ${fixed} files written, ${already} already correct`);
