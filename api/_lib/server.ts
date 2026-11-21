// Server-only helpers for /api routes. Files under api/_lib are not exposed as
// routes by Vercel. Nothing here may be imported from src/ (browser code).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ADMIN_ROLES,
  EMPLOYEE_ROLES,
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from '../../src/lib/public-config';

export const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  PUBLIC_SUPABASE_URL
).replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;

/**
 * The service-role key bypasses row-level security. It is read ONLY from the
 * server env var SUPABASE_SERVICE_ROLE_KEY — never from a VITE_ variable and
 * never from a hardcoded fallback. Missing key = the route fails closed.
 */
export function getServiceRoleKey(): string {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!key) {
    throw new HttpError(503, 'Server is not configured (SUPABASE_SERVICE_ROLE_KEY missing).');
  }
  return key;
}

let adminClient: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, getServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface StaffUser {
  id: string;
  role: string;
  isAdmin: boolean;
}

function bearerToken(req: any): string {
  const raw = String(req.headers?.authorization || req.headers?.Authorization || '');
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

/**
 * Proves the caller is a logged-in, active Saraswati Nagri employee.
 * 1. The bearer token is checked by Supabase Auth itself (not decoded locally).
 * 2. The matching profiles row must exist, be active, and hold a staff role.
 */
export async function requireStaff(req: any): Promise<StaffUser> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'Login required.');

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userErr || !userId) throw new HttpError(401, 'Session expired. Please log in again.');

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) throw new HttpError(500, 'Could not verify employee profile.');
  if (!profile || profile.is_active === false) {
    throw new HttpError(403, 'This account is not an active employee account.');
  }

  const role = String(profile.role || '').trim().toLowerCase();
  if (!EMPLOYEE_ROLES.includes(role)) {
    throw new HttpError(403, 'This role cannot use the Resale Desk.');
  }

  return { id: String(profile.id), role, isAdmin: ADMIN_ROLES.includes(role) };
}

/** Constant-time string compare, so a secret cannot be guessed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sends the error without leaking internals for unexpected failures. */
export function sendError(res: any, err: unknown, where: string) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, ok: false, error: err.message });
  }
  console.error(`[${where}]`, err);
  return res.status(500).json({ success: false, ok: false, error: 'Internal server error' });
}

/**
 * CORS for the PUBLIC website endpoints only (property feed, enquiry form).
 * Staff-only routes send no CORS headers at all: the CRM calls them from its
 * own origin, and no other site has any business calling them.
 */
export function setPublicCors(res: any, methods: string) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

export function clip(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}
