// Drives the REAL supabase-js client through the browser proxy and the real
// /api/db handler, with Supabase itself faked. Proves that what reaches the
// database is exactly what the app asked for — and nothing when not logged in.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createProxyFetch } from '../src/lib/db-proxy';

const STAFF_ID = '11111111-1111-4111-8111-111111111111';
const SERVICE_KEY = 'test-service-key-not-real';
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;

let role = 'Sales Agent';
let active = true;
const upstream: Array<{ method: string; url: string; headers: Headers; body: string }> = [];
let handler: (req: any, res: any) => Promise<unknown>;

before(async () => {
  // Fake Supabase: auth check, staff profile lookup, then the data API.
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(typeof input === 'string' ? input : input.url);
    const headers = new Headers(init.headers || {});
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

    if (url.includes('/auth/v1/user')) {
      return headers.get('authorization') === 'Bearer good-token'
        ? json(200, { id: STAFF_ID, aud: 'authenticated', email: 'a@b.c' })
        : json(401, { message: 'invalid JWT' });
    }
    assert.equal(headers.get('apikey'), SERVICE_KEY, 'data API must be called with the server key');
    const u = new URL(url);
    // requireStaff()'s own lookup of the caller's profile
    if (u.pathname === '/rest/v1/profiles' && u.searchParams.get('select') === 'id,role,is_active' && u.searchParams.get('id') === `eq.${STAFF_ID}`) {
      return json(200, [{ id: STAFF_ID, role, is_active: active }]);
    }
    upstream.push({ method: init.method || 'GET', url, headers, body: String(init.body || '') });
    return json(200, [{ id: 'row-1' }]);
  }) as typeof fetch;

  handler = (await import('../api/db')).default as any;
});

/** Sends a browser request into the serverless handler and returns its reply. */
function callHandler(): typeof fetch {
  return (async (input: any, init: any = {}) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers || {}).forEach((v, k) => (headers[k] = v));
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    return await new Promise<Response>((resolve) => {
      const out: Record<string, string> = {};
      let status = 200;
      const res = {
        setHeader: (k: string, v: string) => void (out[k] = v),
        status: (s: number) => ((status = s), res),
        send: (text: string) => resolve(new Response(text, { status, headers: out })),
        json: (obj: unknown) => resolve(new Response(JSON.stringify(obj), { status, headers: { ...out, 'Content-Type': 'application/json' } })),
      };
      void handler({ method: init.method || 'GET', url: String(input), headers, body }, res);
    });
  }) as typeof fetch;
}

function client(token: string) {
  return createClient('https://ignored.example', 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createProxyFetch(async () => token, callHandler()) },
  });
}

test('a logged-in employee query arrives at the database unchanged', async () => {
  upstream.length = 0;
  role = 'Sales Agent';
  active = true;
  const db = client('good-token');

  const read = await db
    .from('leads')
    .select('id, name, phone')
    .in('property_type', ['Wants to Buy a Property (Resale)', 'Wants to Rent a Property'])
    .not('status', 'in', '("Not Interested","Converted")')
    .order('created_at', { ascending: false })
    .limit(1500);
  assert.equal(read.error, null);
  assert.deepEqual(read.data, [{ id: 'row-1' }]);

  const sent = new URL(upstream[0].url);
  assert.equal(sent.origin + sent.pathname, 'https://db.test/rest/v1/leads');
  assert.equal(sent.searchParams.get('select'), 'id,name,phone');
  assert.equal(sent.searchParams.get('property_type'), 'in.("Wants to Buy a Property (Resale)",Wants to Rent a Property)');
  assert.equal(sent.searchParams.get('status'), 'not.in.("Not Interested","Converted")');
  assert.equal(sent.searchParams.get('order'), 'created_at.desc');
  assert.equal(sent.searchParams.get('limit'), '1500');
  assert.equal(upstream[0].headers.get('authorization'), `Bearer ${SERVICE_KEY}`);

  const ins = await db.from('lead_interactions').insert({ lead_id: 'x', type: 'call', created_by: 'someone-else' });
  assert.equal(ins.error, null);
  assert.equal(upstream[1].method, 'POST');
  assert.equal(JSON.parse(upstream[1].body).created_by, STAFF_ID, 'author comes from the login');

  const upd = await db.from('leads').update({ status: 'Follow-up' }).eq('id', '33333333-3333-4333-8333-333333333333');
  assert.equal(upd.error, null);
  assert.equal(upstream[2].method, 'PATCH');
  assert.equal(new URL(upstream[2].url).searchParams.get('id'), 'eq.33333333-3333-4333-8333-333333333333');
});

test('nothing reaches the database without a valid employee login', async () => {
  upstream.length = 0;
  for (const token of ['', 'forged-token']) {
    const { data, error } = await client(token).from('leads').select('id');
    assert.equal(data, null);
    assert.ok(error, `token "${token}" must be refused`);
  }

  active = false; // real login, but the employee was deactivated
  assert.ok((await client('good-token').from('leads').select('id')).error);
  active = true;
  role = 'Referral Partner'; // real login, not a staff role
  assert.ok((await client('good-token').from('leads').select('id')).error);
  role = 'Sales Agent';

  // real staff login, forbidden things
  const db = client('good-token');
  assert.ok((await db.from('profiles').select('*')).error);
  assert.ok((await db.from('payments').select('id')).error);
  assert.ok((await db.from('leads').delete().eq('id', '33333333-3333-4333-8333-333333333333')).error);
  assert.ok((await db.from('leads').update({ assigned_to: STAFF_ID }).eq('status', 'New Inquiry')).error);

  assert.equal(upstream.length, 0, 'none of the refused requests may touch the data API');
});
