import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createProxyFetch } from './db-proxy';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from './public-config';

// SECURITY: this file runs in the browser. It must only ever hold the PUBLIC
// anon key. The service-role key lives on the server (see api/_lib/server.ts).
//
// How data access works:
//   1. supabaseAuth  — logs the employee in and keeps their session.
//   2. supabaseDb    — looks like a normal Supabase client, but every request
//                      is sent to our own /api/db route with the employee's
//                      login token. The server checks who they are and what
//                      they may touch before talking to the database.

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabaseUrl = envUrl || PUBLIC_SUPABASE_URL;
const anonKey = envAnonKey || PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);

// 1. Auth client: employee login + session storage.
export const supabaseAuth: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// The token is cached from auth events. Calling auth.getSession() from inside
// an onAuthStateChange callback deadlocks supabase-js, so the hot path must
// not depend on it.
let cachedToken = '';
let cachedExpiresAt = 0; // unix seconds

supabaseAuth?.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token || '';
  cachedExpiresAt = session?.expires_at || 0;
});

/** The logged-in employee's access token, or '' when nobody is logged in. */
export async function getAccessToken(): Promise<string> {
  if (!supabaseAuth) return '';
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiresAt - now > 30) return cachedToken;
  // Missing or about to expire: getSession() refreshes it when needed.
  const { data } = await supabaseAuth.auth.getSession();
  cachedToken = data.session?.access_token || '';
  cachedExpiresAt = data.session?.expires_at || 0;
  return cachedToken;
}

/** fetch() to one of our own /api routes, carrying the employee's login token. */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// 2. Data client: every query goes through the server-side gate.
export const supabaseDb: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: createProxyFetch(getAccessToken) },
    })
  : null;

// Default export alias so existing data queries keep working unchanged.
export const supabase = supabaseDb;
