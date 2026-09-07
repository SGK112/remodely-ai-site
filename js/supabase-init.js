/**
 * Supabase Single Client Initialization
 * This script MUST load immediately after the Supabase library
 * and BEFORE any other auth-related scripts.
 *
 * Uses centralized configuration from /js/config.js
 */
(function() {
  'use strict';

  // Suppress AbortError from Supabase (known localhost issue, non-critical)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.name === 'AbortError') {
      event.preventDefault();
      console.debug('Supabase AbortError suppressed');
    }
  });

  // Only create if not already created
  if (window._remodelySupabaseClient) {
    return;
  }

  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded');
    return;
  }

  // Use centralized config or fallback to defaults
  const config = window.REMODELY_CONFIG || {};
  const SUPABASE_URL = config.SUPABASE_URL || 'https://cpnqippzgcezidoorwry.supabase.co';
  const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY || 'sb_publishable_CNuuG7ZWQqdyws0UJAKBAw_U11KanGP';
  const STORAGE_KEY = config.SUPABASE_STORAGE_KEY || 'remodely-auth-token';
  const LEGACY_STORAGE_KEY = config.SUPABASE_STORAGE_KEY_LEGACY || 'sg-auth-token';

  // Carry a session across the rename. supabase-js only ever looks at
  // STORAGE_KEY, so without this every signed-in user would come back to a
  // login screen the moment the key changed. Copy rather than move: if this
  // build gets rolled back, the old key still holds a valid session.
  try {
    if (STORAGE_KEY !== LEGACY_STORAGE_KEY && !localStorage.getItem(STORAGE_KEY)) {
      const carried = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (carried) {
        localStorage.setItem(STORAGE_KEY, carried);
        console.debug('Supabase: carried session from', LEGACY_STORAGE_KEY, 'to', STORAGE_KEY);
      }
    }
  } catch (e) {
    // Private mode, disabled storage — the user signs in again, nothing breaks.
    console.debug('Supabase: session carry-over skipped:', e.message);
  }

  const { createClient } = window.supabase;

  // ROOT-CAUSE FIX for the recurring CRM hangs ("Saving..." forever, "Loading
  // timed out", any tab that silently never loads): supabase-js attaches the
  // session token to EVERY request, and to do so it acquires a navigator.locks
  // Web Lock (sb-<ref>-auth-token) shared with the auto-refresh timer. If that
  // lock is ever held and not released — a crashed/closed tab, a stalled refresh,
  // Safari's flaky LockManager — every subsequent .from()/.rpc()/.auth call waits
  // on it forever. supabase-js@2.39.3 lets us swap the lock; a pass-through lock
  // removes the cross-tab mutex (worst case: two tabs refresh redundantly, which
  // is harmless) and eliminates the deadlock for all ~166 call sites at once.
  const lockFree = (_name, _acquireTimeout, fn) => fn();

  // Simple storage wrapper to avoid lock issues
  const simpleStorage = {
    getItem: (key) => {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    setItem: (key, value) => {
      try { localStorage.setItem(key, value); } catch {}
    },
    removeItem: (key) => {
      try { localStorage.removeItem(key); } catch {}
    }
  };

  try {
    window._remodelySupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: simpleStorage,
        storageKey: STORAGE_KEY,
        flowType: 'implicit',
        debug: false,
        lock: lockFree
      }
    });

    // Store config for reference by other scripts
    window._remodelySupabaseConfig = {
      url: SUPABASE_URL,
      storageKey: STORAGE_KEY
    };

    // Old names, aliased to the same client so a second one is never created.
    window._sgSupabaseClient = window._remodelySupabaseClient;
    window._sgSupabaseConfig = window._remodelySupabaseConfig;

  } catch (e) {
    console.warn('Supabase init error, retrying without locks:', e.message);
    // Fallback: minimal options, but keep the lock-free auth lock so this path
    // can't reintroduce the deadlock we just removed above.
    try {
      window._remodelySupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { lock: lockFree }
      });
    } catch (e2) {
      console.error('Supabase init failed completely:', e2);
    }
  }
})();
