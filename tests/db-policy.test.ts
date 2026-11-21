import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRequest, type PolicyInput } from '../api/_lib/db-policy';
import { scrubDescription, safeSearchTerm, toPublicProperty } from '../api/_lib/public-property';

const STAFF = { id: '11111111-1111-4111-8111-111111111111', isAdmin: false };
const ADMIN = { id: '22222222-2222-4222-8222-222222222222', isAdmin: true };
const ID = 'eq.33333333-3333-4333-8333-333333333333';

function req(over: Partial<PolicyInput>): PolicyInput {
  return { table: 'leads', method: 'GET', query: [], prefer: '', body: undefined, staff: STAFF, ...over };
}
const q = (s: string): Array<[string, string]> => [...new URLSearchParams(s).entries()];

// ── every query the app really sends must still pass ───────────────────────
test('app queries are allowed', () => {
  const ok = (r: Partial<PolicyInput>) => assert.equal(checkRequest(req(r)).ok, true, JSON.stringify(r));
  ok({ table: 'profiles', query: q('select=id,full_name,email,phone,role,avatar,color,is_active,department&id=eq.x') });
  ok({ table: 'profiles', query: q('select=id,full_name,email,phone,role,avatar,color,is_active,department&is_active=eq.true&order=full_name.asc') });
  ok({ table: 'profiles', query: q('select=id,full_name') });
  ok({ table: 'projects', query: q('select=*,plot_inventory(id,status)&order=created_at.desc') });
  ok({ query: q('select=id,lead_no,name,phone&order=created_at.desc&limit=1500&property_type=in.("Wants to Buy a Property (Resale)")') });
  ok({ query: q('select=id,name,status,lead_no&phone=eq.9876543210&entity=eq.Saraswati Nagri&status=not.in.("Not Interested","Converted")&limit=1') });
  ok({ table: 'lead_interactions', query: q('select=id,lead_id,type&lead_id=in.(a,b)&order=created_at.desc') });
  ok({ table: 'whatsapp_messages', query: q('select=*&order=message_timestamp.asc&limit=100&or=(lead_id.eq.x,chat_jid.ilike.*98*)') });
  ok({ table: 'whatsapp_sessions', query: q('select=id,agent_id,instance_name,provider,phone_number,status,last_connected_at,last_seen_at,updated_at&order=updated_at.desc') });
  ok({ method: 'POST', query: q('select=*'), prefer: 'return=representation', body: { name: 'A', phone: '9' } });
  ok({ method: 'PATCH', query: [['id', ID]], body: { status: 'Follow-up', stage_changed_at: 'x' } });
  ok({ table: 'resale_properties', method: 'PATCH', query: [['id', ID]], body: { status: 'sold' } });
  ok({ table: 'lead_interactions', method: 'POST', body: { lead_id: 'x', type: 'call' } });
});

// ── the attacks ────────────────────────────────────────────────────────────
test('tables outside the allowlist are refused', () => {
  for (const table of ['payments', 'staff_documents', 'rpc/anything', 'profiles?x', '', '__proto__', 'constructor']) {
    assert.equal(checkRequest(req({ table })).ok, false, table);
  }
});

test('staff private columns cannot be read from profiles', () => {
  const bad = ['select=*', 'select=id,aadhaar_number', 'select=id,bank_account', '', 'select=id,phone::text', 'select=id,x:aadhaar_number'];
  for (const s of bad) assert.equal(checkRequest(req({ table: 'profiles', query: q(s) })).ok, false, s);
});

test('hidden profile columns cannot be probed through filters or sorting', () => {
  const bad = [
    'select=id&aadhaar_number=like.1*',
    'select=id&or=(aadhaar_number.like.1*)',
    'select=id&order=salary.desc',
    'select=id&and=(pan.eq.X)',
  ];
  for (const s of bad) assert.equal(checkRequest(req({ table: 'profiles', query: q(s) })).ok, false, s);
});

test('joins into other tables are refused', () => {
  const bad = ['select=*,profiles(*)', 'select=id,assigned:profiles!assigned_to(aadhaar_number)', 'select=id,profiles!inner(id)', 'select=data->secret'];
  for (const s of bad) assert.equal(checkRequest(req({ query: q(s) })).ok, false, s);
  assert.equal(checkRequest(req({ table: 'projects', query: q('select=*,profiles(*)') })).ok, false);
});

test('read-only tables cannot be written', () => {
  for (const table of ['profiles', 'projects', 'whatsapp_messages', 'whatsapp_sessions']) {
    for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) {
      assert.equal(checkRequest(req({ table, method, query: [['id', ID]], body: { role: 'Super Admin' }, staff: ADMIN })).ok, false, `${method} ${table}`);
    }
  }
});

test('updates and deletes must hit exactly one row by id', () => {
  const body = { status: 'Not Interested' };
  const bad: Array<Array<[string, string]>> = [
    [],
    [['status', 'eq.New Inquiry']],
    [['id', 'neq.x']],
    [['id', 'in.(a,b)']],
    [['id', ID], ['id', ID]],
    [['id', ID], ['or', '(id.neq.x)']],
    [['id', `${ID},status.eq.x`]],
  ];
  for (const query of bad) {
    assert.equal(checkRequest(req({ method: 'PATCH', query, body })).ok, false, JSON.stringify(query));
    assert.equal(checkRequest(req({ method: 'DELETE', query, staff: ADMIN })).ok, false, JSON.stringify(query));
  }
});

test('only whitelisted lead columns can be changed', () => {
  for (const body of [{ assigned_to: 'me' }, { phone: '1' }, { status: 'x', created_by: 'y' }, {}, [{ status: 'x' }], 'status']) {
    assert.equal(checkRequest(req({ method: 'PATCH', query: [['id', ID]], body })).ok, false, JSON.stringify(body));
  }
  assert.equal(checkRequest(req({ table: 'resale_properties', method: 'PATCH', query: [['id', ID]], body: { owner: {} } })).ok, false);
});

test('only admins can delete', () => {
  for (const table of ['leads', 'resale_properties']) {
    assert.equal(checkRequest(req({ table, method: 'DELETE', query: [['id', ID]] })).ok, false);
    assert.equal(checkRequest(req({ table, method: 'DELETE', query: [['id', ID]], staff: ADMIN })).ok, true);
  }
  assert.equal(checkRequest(req({ table: 'lead_interactions', method: 'DELETE', query: [['id', ID]], staff: ADMIN })).ok, false);
});

test('inserts cannot overwrite rows or fake the author', () => {
  const body = { name: 'A', created_by: ADMIN.id };
  assert.equal(checkRequest(req({ method: 'POST', body, prefer: 'resolution=merge-duplicates' })).ok, false);
  assert.equal(checkRequest(req({ method: 'POST', body, query: [['on_conflict', 'id']] })).ok, false);
  assert.equal(checkRequest(req({ method: 'POST', body: [body, body] })).ok, false);
  const res = checkRequest(req({ method: 'POST', body }));
  assert.equal(res.ok && res.body?.created_by, STAFF.id);
});

// ── public property feed ───────────────────────────────────────────────────
test('public feed never carries the owner or a phone number', () => {
  const pub = toPublicProperty({
    id: '1',
    owner: { name: 'Ramesh', phone: '9890123456' },
    assigned_to: 'u',
    created_by: 'u',
    description: 'Nice flat. Call 98901 23456 or +91 9890123456 today',
  });
  assert.equal('owner' in pub, false);
  assert.equal('assigned_to' in pub, false);
  assert.doesNotMatch(JSON.stringify(pub), /9890|23456/);
  assert.equal(scrubDescription('Auto-registered from WhatsApp message by Ramesh (+91 9890123456):\nraw'), '');
  assert.equal(safeSearchTerm('besa%,owner->>phone.ilike.*9*)'), 'besa owner- phone.ilike. 9');
});
