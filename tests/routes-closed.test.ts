// Every staff-only route must refuse a caller with no login, and the webhook
// must refuse a caller without the shared secret — even when misconfigured.
import { test } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.EVOLUTION_WEBHOOK_TOKEN;
delete process.env.INGEST_API_KEY;

async function call(mod: string, req: Record<string, unknown>) {
  const handler = (await import(mod)).default as (req: any, res: any) => Promise<unknown>;
  return await new Promise<{ status: number; body: any }>((resolve) => {
    let status = 200;
    const res = {
      setHeader: () => undefined,
      status: (s: number) => ((status = s), res),
      json: (body: unknown) => resolve({ status, body }),
      send: (body: unknown) => resolve({ status, body }),
      end: () => resolve({ status, body: null }),
    };
    void handler({ headers: {}, query: {}, url: '/x', ...req }, res);
  });
}

test('staff routes refuse anonymous callers', async () => {
  const send = await call('../api/whatsapp/send', { method: 'POST', body: { phone: '9876543210', text: 'hi' } });
  assert.equal(send.status, 401);
  const connect = await call('../api/whatsapp/connect', { method: 'GET' });
  assert.equal(connect.status, 401);
  const db = await call('../api/db', { method: 'GET', headers: { 'x-db-table': 'leads' }, url: '/api/db?select=*' });
  assert.equal(db.status, 401);
  const save = await call('../api/whatsapp/parse', { method: 'POST', body: { message: '2 BHK flat in Besa 45 lakh', autoSave: true } });
  assert.equal(save.status, 401);
});

test('reading a message without saving stays open', async () => {
  const parse = await call('../api/whatsapp/parse', { method: 'POST', body: { message: '2 BHK flat in Besa 45 lakh' } });
  assert.equal(parse.status, 200);
  assert.equal(parse.body.success, true);
});

test('webhook refuses everything without the shared secret', async () => {
  const body = { event: 'messages.upsert', data: [] };
  assert.equal((await call('../api/whatsapp/webhook', { method: 'POST', body })).status, 401);
  // a token supplied when none is configured must still be refused
  assert.equal((await call('../api/whatsapp/webhook', { method: 'POST', body, query: { token: '' } })).status, 401);

  process.env.EVOLUTION_WEBHOOK_TOKEN = 'correct-horse-battery-staple';
  assert.equal((await call('../api/whatsapp/webhook', { method: 'POST', body, query: { token: 'wrong-horse-battery-staple!' } })).status, 401);
  // right secret gets past the gate (then stops: no database key in this test)
  const ok = await call('../api/whatsapp/webhook', { method: 'POST', body, query: { token: 'correct-horse-battery-staple' } });
  assert.equal(ok.status, 503);
});

test('login gives the same answer for every kind of failure', async () => {
  const a = await call('../api/auth/login', { method: 'POST', body: { identifier: 'not-an-id', password: 'x' } });
  const b = await call('../api/auth/login', { method: 'POST', body: { identifier: '', password: '' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
  // the removed master password is just a wrong password now (no database key here = fails closed)
  const master = await call('../api/auth/login', { method: 'POST', body: { identifier: 'saraswatinagri@gmail.com', password: 'anything' } });
  assert.notEqual(master.status, 200);
});

test('public enquiry and feed fail closed when the server key is missing', async () => {
  const lead = await call('../api/leads/index', { method: 'POST', body: { name: 'A', phone: '9876543210' } });
  assert.equal(lead.status, 503);
  const feed = await call('../api/properties/index', { method: 'GET' });
  assert.equal(feed.status, 503);
  const bad = await call('../api/properties/[id]', { method: 'GET', query: { id: 'x,status.eq.sold' } });
  assert.equal(bad.status, 400);
});
