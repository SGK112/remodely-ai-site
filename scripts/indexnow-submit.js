#!/usr/bin/env node
/**
 * Tell Bing (and therefore ChatGPT's search) what exists here. The sitemap had
 * been missing every product page, so none of them had ever been announced.
 * Reads the generated sitemap so the two can't disagree.
 */
const fs = require('fs'), path = require('path');
const KEY = 'a7f8e2c1b9d4a6e3f5c8b2d7e9a1f4c6';
const HOST = 'www.remodely.ai';

const xml = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const only = process.argv.slice(2);
const urls = only.length ? urlList.filter(u => only.some(o => u.includes(o))) : urlList;

(async () => {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  // 200 and 202 both mean accepted; anything else needs to be seen, not swallowed.
  console.log(`IndexNow ${res.status} ${res.statusText} — ${urls.length} URLs`);
  if (![200, 202].includes(res.status)) { console.error(await res.text()); process.exit(1); }
})();
