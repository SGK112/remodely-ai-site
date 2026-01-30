# Launch Playbook Enhancement Setup Guide

This guide walks you through setting up cloud sync, browser notifications, and email digests for the Launch Playbook.

## Overview

The enhanced playbook includes:
- **Cloud Sync**: Real-time sync across devices via Supabase
- **Due Dates**: Add due dates to tasks with visual indicators
- **Browser Notifications**: Get reminded before tasks are due
- **Email Digests**: Daily summary emails via Resend

---

## Phase 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New project"
3. Choose your organization and enter:
   - **Name**: `remodely-playbook` (or your preference)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-west-1` for Phoenix)
4. Click "Create new project" and wait for setup (~2 minutes)

### 1.2 Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `scripts/supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to create all tables and policies

### 1.3 Enable Authentication Providers

1. Go to **Authentication** → **Providers**
2. **Email (Magic Link)**: Already enabled by default
3. **Google** (optional):
   - Toggle on Google
   - Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add your Supabase callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Enter Client ID and Client Secret in Supabase

### 1.4 Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1.5 Update launch-playbook.html

Open `launch-playbook.html` and find these lines (around line 445):

```javascript
var SUPABASE_URL = 'YOUR_SUPABASE_URL';
var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual values:

```javascript
var SUPABASE_URL = 'https://abcdefghijk.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Phase 2: Email Digest Setup (Resend)

### 2.1 Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email

### 2.2 Verify Your Domain

1. In Resend dashboard, go to **Domains**
2. Click "Add Domain" and enter `remodely.ai`
3. Add the DNS records Resend provides to your domain:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (usually 5-15 minutes)

### 2.3 Get Your API Key

1. Go to **API Keys** in Resend
2. Click "Create API Key"
3. Name it `playbook-digest`
4. Copy the key (starts with `re_`)

### 2.4 Deploy the Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd /path/to/remodely-ai-site
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Set the Resend API key as a secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy send-digest
   ```

### 2.5 Set Up Daily Cron Job

In Supabase SQL Editor, run:

```sql
-- Enable pg_cron extension (may need to contact Supabase support)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily digest at 9 AM UTC
SELECT cron.schedule(
  'daily-email-digest',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Note**: Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with your actual values. The service role key is found in Settings → API.

---

## Phase 3: Browser Notifications

Browser notifications work automatically once enabled:

1. User clicks "Notifications" button
2. User clicks "Enable Notifications"
3. Browser prompts for permission
4. If granted, notifications are scheduled based on due dates

The Service Worker (`sw-notifications.js`) handles background notifications.

---

## Verification Checklist

### Due Dates
- [ ] Click calendar icon next to any task
- [ ] Set a due date and save
- [ ] Refresh the page - due date should persist
- [ ] Check visual indicator colors (overdue = red, due soon = yellow)

### Cloud Sync
- [ ] Click "Sign In" and enter your email
- [ ] Check email for magic link
- [ ] Click link to sign in
- [ ] Complete a task
- [ ] Open playbook in incognito/private window
- [ ] Sign in with same email
- [ ] Verify task is still marked complete

### Browser Notifications
- [ ] Click "Notifications" button
- [ ] Click "Enable Notifications"
- [ ] Accept browser permission prompt
- [ ] Set a task due date for tomorrow
- [ ] Tomorrow, you should receive a notification

### Email Digest
- [ ] Sign in to playbook
- [ ] Click "Notifications"
- [ ] Enable "Send daily email digest"
- [ ] Set your preferred time and timezone
- [ ] Next morning, check email for digest

---

## Troubleshooting

### "Cloud sync not configured"
- Make sure you replaced `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` in launch-playbook.html

### Magic link not arriving
- Check spam folder
- Verify email is correct
- Check Supabase Auth logs for errors

### Notifications not showing
- Make sure browser has notification permission
- Check if "Do Not Disturb" is enabled
- Notifications only work on HTTPS or localhost

### Email digest not sending
- Check Resend dashboard for errors
- Verify domain is verified
- Check Edge Function logs in Supabase

---

## Security Notes

1. **Never commit API keys to Git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Row Level Security**
   - All tables have RLS enabled
   - Users can only access their own data

3. **Service Role Key**
   - Only use server-side (Edge Functions)
   - Never expose in client-side code

---

## Cost Estimates (Free Tier)

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Supabase | 500MB DB, 50K auth users, 500K Edge Function calls | Well under limits |
| Resend | 3,000 emails/month | ~90 emails/month per user |

For a small team (5 users), you'll stay comfortably within free tiers.
