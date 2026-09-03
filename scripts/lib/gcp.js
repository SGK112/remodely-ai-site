/**
 * Minimal Google service-account auth + Firestore REST, with no dependencies.
 *
 * This repo has no package.json, and the delivery job is the only thing that needs
 * server-side Firestore. Signing the JWT with node's crypto is ~30 lines and keeps
 * the deploy a plain `node scripts/...` with nothing to install.
 *
 * Credentials come from either:
 *   FIREBASE_SA_JSON  the whole service-account JSON, as one env var (Render)
 *   FIREBASE_SA_FILE  path to the JSON file (defaults to ~/.remodely-firebase.json, local)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SCOPE = 'https://www.googleapis.com/auth/datastore';

function loadCredentials() {
  if (process.env.FIREBASE_SA_JSON) {
    try { return JSON.parse(process.env.FIREBASE_SA_JSON); }
    catch (e) { throw new Error(`FIREBASE_SA_JSON is not valid JSON: ${e.message}`); }
  }
  const file = process.env.FIREBASE_SA_FILE || path.join(os.homedir(), '.remodely-firebase.json');
  if (!fs.existsSync(file)) {
    throw new Error(`No credentials. Set FIREBASE_SA_JSON, or put the key at ${file}.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const b64url = buf => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cached = null;
async function accessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const sa = loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const signature = b64url(
    crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key)
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${body.error_description || body.error}`);
  cached = { token: body.access_token, expires: Date.now() + body.expires_in * 1000, project: sa.project_id };
  return cached.token;
}

function projectId() {
  return process.env.FIREBASE_PROJECT_ID || loadCredentials().project_id;
}

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;

async function call(url, init = {}) {
  const token = await accessToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Firestore ${init.method || 'GET'} ${res.status}: ${body.error?.message || 'unknown'}`);
  return body;
}

/** Firestore's typed values -> plain JS. Only the types our documents actually use. */
function decode(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('timestampValue' in v) out[k] = v.timestampValue;
    else if ('nullValue' in v) out[k] = null;
    else if ('mapValue' in v) out[k] = decode(v.mapValue.fields);
    else if ('arrayValue' in v) out[k] = (v.arrayValue.values || []).map(x => decode({ x }).x);
  }
  return out;
}
const encode = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k,
  v === null || v === undefined ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : { stringValue: String(v) }]));

async function listDocs(collection, pageSize = 300) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${base()}/${collection}?pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const body = await call(url);
    for (const d of body.documents || []) {
      docs.push({ id: d.name.split('/').pop(), path: d.name, ...decode(d.fields) });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function getDoc(collection, id) {
  try {
    const d = await call(`${base()}/${collection}/${id}`);
    return { id, ...decode(d.fields) };
  } catch (e) {
    if (/ 404:/.test(e.message)) return null;
    throw e;
  }
}

/** Merge-patch: only the named fields are touched, the rest of the doc is left alone. */
async function patchDoc(collection, id, obj) {
  const mask = Object.keys(obj).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  return call(`${base()}/${collection}/${id}?${mask}`, {
    method: 'PATCH', body: JSON.stringify({ fields: encode(obj) }),
  });
}

async function setDoc(collection, id, obj) {
  return call(`${base()}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: 'POST', body: JSON.stringify({ fields: encode(obj) }),
  }).catch(async e => {
    if (!/ 409:/.test(e.message)) throw e;
    return patchDoc(collection, id, obj);   // already exists
  });
}

async function deleteDoc(collection, id) {
  return call(`${base()}/${collection}/${id}`, { method: 'DELETE' });
}

module.exports = { accessToken, projectId, listDocs, getDoc, patchDoc, setDoc, deleteDoc };
