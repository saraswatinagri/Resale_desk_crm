// /api/auth/login — employee login by email OR phone number.
//
// The phone → email lookup needs the staff directory, which the browser may not
// read before login. So the whole login happens here and only the resulting
// session is returned. Every failure gives the SAME message, so this route can
// not be used to find out which phone numbers or emails belong to staff.

import { createClient } from '@supabase/supabase-js';
import { EMPLOYEE_ROLES } from '../../src/lib/public-config';
import {
  HttpError,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  clip,
  getAdminClient,
  sendError,
} from '../_lib/server';

const GENERIC_FAILURE = 'Wrong phone / email or password, or this account cannot use the Resale Desk.';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const identifier = clip(req.body?.identifier, 200).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!identifier || !password || password.length > 200) throw new HttpError(401, GENERIC_FAILURE);

    const digits = identifier.replace(/\D/g, '');
    const looksLikeEmail = identifier.includes('@');
    const isPhone =
      !looksLikeEmail &&
      (digits.length === 10 ||
        (digits.length === 12 && digits.startsWith('91')) ||
        (digits.length === 11 && digits.startsWith('0')));
    const phone10 = isPhone ? digits.slice(-10) : '';
    if (!isPhone && !looksLikeEmail) throw new HttpError(401, GENERIC_FAILURE);

    const admin = getAdminClient();
    let lookup = admin.from('profiles').select('id, email, role, is_active');
    lookup = isPhone ? lookup.ilike('phone', `%${phone10}`) : lookup.eq('email', identifier);
    const { data: matches, error: lookupErr } = await lookup.limit(5);
    if (lookupErr) throw new HttpError(500, 'Login is temporarily unavailable.');

    // One phone can sit on more than one profile; try each active staff profile.
    const candidates = (matches || []).filter(
      (p: any) =>
        p.is_active !== false &&
        p.email &&
        EMPLOYEE_ROLES.includes(String(p.role || '').trim().toLowerCase())
    );
    if (candidates.length === 0) throw new HttpError(401, GENERIC_FAILURE);

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    for (const profile of candidates) {
      const { data, error } = await anon.auth.signInWithPassword({
        email: String(profile.email),
        password,
      });
      // The login must belong to the very profile that passed the checks above.
      if (!error && data?.session && data.user?.id === profile.id) {
        return res.status(200).json({
          success: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    }

    throw new HttpError(401, GENERIC_FAILURE);
  } catch (err) {
    return sendError(res, err, 'api/auth/login');
  }
}
