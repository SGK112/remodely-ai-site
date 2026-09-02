#!/usr/bin/env node
/**
 * Send a one-off email through Resend, as a remodely.ai address.
 *
 * The only other Resend caller in this repo is supabase/functions/send-digest, which is
 * scheduled and sends as playbook@remodely.ai. This is the manual path — replying to an
 * inbound lead, sending a demo link — so it lives here rather than in an edge function.
 *
 * THIS REPO IS PUBLIC. The key is read from the environment and is never written to disk,
 * echoed, or included in output. Do not add it to a file here, even a gitignored one.
 *
 *   export RESEND_API_KEY=re_...
 *   node scripts/send-email.js --to brad@example.com --subject "Re: visualizers" \
 *        --body-file /tmp/reply.txt
 *
 *   --from       defaults to "Remodely AI <support@remodely.ai>"
 *   --reply-to   defaults to the from address
 *   --html       treat the body as HTML instead of plain text
 *   --dry-run    print exactly what would be sent, call nothing
 */
const fs = require('fs');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : fallback;
}
const flag = name => process.argv.includes(`--${name}`);

const to = arg('to');
const subject = arg('subject');
const bodyFile = arg('body-file');
const body = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : arg('body');
const from = arg('from', 'Remodely AI <support@remodely.ai>');
const replyTo = arg('reply-to', from.match(/<(.+)>/)?.[1] || from);
const dryRun = flag('dry-run');

if (!to || !subject || !body) {
  console.error('Usage: send-email.js --to <addr> --subject <text> (--body <text> | --body-file <path>)');
  console.error('       [--from <addr>] [--reply-to <addr>] [--html] [--dry-run]');
  process.exit(2);
}

const payload = {
  from,
  to: to.split(',').map(s => s.trim()),
  reply_to: replyTo,
  subject,
  [flag('html') ? 'html' : 'text']: body,
};

if (dryRun) {
  console.log('--- DRY RUN, nothing sent ---');
  console.log(JSON.stringify({ ...payload, [flag('html') ? 'html' : 'text']: '(body below)' }, null, 2));
  console.log('---');
  console.log(body);
  process.exit(0);
}

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error('RESEND_API_KEY is not set. Export it in this shell — never commit it, this repo is public.');
  process.exit(2);
}

(async () => {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Surface Resend's own message — "domain not verified" and "from not allowed" both land here.
    console.error(`Resend rejected the send (HTTP ${r.status}): ${data.message || JSON.stringify(data)}`);
    process.exit(1);
  }
  console.log(`Sent. Resend id: ${data.id}`);
  console.log(`  from: ${from}\n  to:   ${to}\n  subj: ${subject}`);
})();
