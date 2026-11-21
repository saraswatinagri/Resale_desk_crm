// /api/db — the ONLY way the browser reaches the database.
//
// Browser  → sends the employee's own login token + the query it wants.
// Here     → 1. Supabase Auth confirms the token, 2. the profile must be an
//               active employee, 3. api/_lib/db-policy.ts decides whether this
//               table / method / column is allowed.
// Supabase ← only then is the request forwarded with the service-role key,
//            which never leaves the server.

import { checkRequest } from './_lib/db-policy';
import { HttpError, SUPABASE_URL, getServiceRoleKey, requireStaff, sendError } from './_lib/server';

function header(req: any, name: string): string {
  const value = req.headers?.[name];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const staff = await requireStaff(req);

    const table = header(req, 'x-db-table').trim();
    const rawQuery = String(req.url || '').split('?')[1] || '';
    const params = new URLSearchParams(rawQuery);
    const query: Array<[string, string]> = [];
    params.forEach((value, key) => query.push([key, value]));

    let body: unknown = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {
        throw new HttpError(400, 'Body must be valid JSON.');
      }
    }

    const prefer = header(req, 'prefer');
    const verdict = checkRequest({ table, method: req.method, query, prefer, body, staff });
    if (!verdict.ok) throw new HttpError(verdict.status, verdict.error);

    const key = getServiceRoleKey();
    const forwardHeaders: Record<string, string> = {
      apikey: key,
      Authorization: `Bearer ${key}`,
    };
    const accept = header(req, 'accept');
    if (accept) forwardHeaders.Accept = accept;
    if (prefer) forwardHeaders.Prefer = prefer;
    const range = header(req, 'range');
    if (range) forwardHeaders.Range = range;
    if (verdict.body) forwardHeaders['Content-Type'] = 'application/json';

    // Forward exactly the query that was validated (re-serialised, not the raw string).
    const qs = params.toString();
    const upstream = await fetch(`${SUPABASE_URL}/rest/v1/${verdict.table}${qs ? `?${qs}` : ''}`, {
      method: verdict.method,
      headers: forwardHeaders,
      body: verdict.body ? JSON.stringify(verdict.body) : undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type');
    const contentRange = upstream.headers.get('content-range');
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    return res.status(upstream.status).send(text);
  } catch (err) {
    if (err instanceof HttpError) {
      // Same shape as a PostgREST error so the Supabase client surfaces the message.
      return res.status(err.status).json({ message: err.message, code: `RD${err.status}` });
    }
    return sendError(res, err, 'api/db');
  }
}
