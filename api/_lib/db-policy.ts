// The rulebook for /api/db. Pure logic, no I/O, so it can be unit-tested.
//
// /api/db forwards a logged-in employee's database request to Supabase using
// the service-role key. That key ignores row-level security, so THIS FILE is
// the only thing standing between a staff login and the whole database.
// Default is deny: a table, method, column or option not listed here is refused.

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Access = 'staff' | 'admin';

interface TableRule {
  methods: Partial<Record<Method, Access>>;
  /** If set: only these columns may be selected, filtered or sorted on. `*` is refused. */
  columns?: readonly string[];
  /** One exact `select` string that is allowed to join another table. */
  allowedEmbedSelect?: string;
  /** If set: a PATCH body may only touch these columns. */
  patchColumns?: readonly string[];
  /** Overwrite created_by with the verified caller on insert. */
  stampCreatedBy?: boolean;
}

export const TABLE_RULES: Record<string, TableRule> = {
  // Staff directory. The profiles table also holds Aadhaar / bank / salary
  // fields, so only these harmless columns are ever readable from here.
  profiles: {
    methods: { GET: 'staff' },
    columns: ['id', 'full_name', 'email', 'phone', 'role', 'avatar', 'color', 'is_active', 'department'],
  },
  projects: {
    methods: { GET: 'staff' },
    allowedEmbedSelect: '*,plot_inventory(id,status)',
  },
  leads: {
    methods: { GET: 'staff', POST: 'staff', PATCH: 'staff', DELETE: 'admin' },
    patchColumns: [
      'status',
      'stage_changed_at',
      'last_contacted_at',
      'interaction_count',
      'follow_up_date',
      'site_visit_date',
      'lost_at',
      'updated_at',
    ],
    stampCreatedBy: true,
  },
  lead_interactions: {
    methods: { GET: 'staff', POST: 'staff' },
    stampCreatedBy: true,
  },
  resale_properties: {
    methods: { GET: 'staff', POST: 'staff', PATCH: 'staff', DELETE: 'admin' },
    patchColumns: ['status'],
    stampCreatedBy: true,
  },
  // Read-only here. Outbound messages are written by /api/whatsapp/send.
  whatsapp_messages: {
    methods: { GET: 'staff' },
  },
  whatsapp_sessions: {
    methods: { GET: 'staff' },
    columns: [
      'id',
      'agent_id',
      'instance_name',
      'provider',
      'phone_number',
      'status',
      'last_connected_at',
      'last_seen_at',
      'updated_at',
    ],
  },
};

const IDENT = /^[a-z_][a-z0-9_]*$/;
const UUID_EQ = /^eq\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Query keys that are options, not column filters. */
const OPTION_KEYS = new Set(['select', 'order', 'limit', 'offset', 'columns']);
const LOGIC_KEYS = new Set(['or', 'and', 'not.or', 'not.and']);

export interface PolicyInput {
  table: string;
  method: string;
  /** Parsed query string, in order, duplicates preserved. */
  query: Array<[string, string]>;
  prefer: string;
  body: unknown;
  staff: { id: string; isAdmin: boolean };
}

export type PolicyResult =
  | { ok: true; table: string; method: Method; body: Record<string, unknown> | null }
  | { ok: false; status: number; error: string };

function deny(status: number, error: string): PolicyResult {
  return { ok: false, status, error };
}

function checkSelect(rule: TableRule, select: string | null, needsSelect: boolean): string | null {
  if (select === null) {
    // No select means "all columns" for a read.
    return needsSelect && rule.columns ? 'This table needs an explicit column list.' : null;
  }
  const compact = select.replace(/\s+/g, '');
  if (rule.allowedEmbedSelect && compact === rule.allowedEmbedSelect) return null;

  // Anything that could join, rename, cast or dig into another table is refused.
  if (/[():!>\-"]/.test(compact)) return 'Joins and computed columns are not allowed.';

  for (const col of compact.split(',')) {
    if (col === '*') {
      if (rule.columns) return 'This table needs an explicit column list.';
      continue;
    }
    if (!IDENT.test(col)) return `Invalid column "${col}".`;
    if (rule.columns && !rule.columns.includes(col)) return `Column "${col}" is not available.`;
  }
  return null;
}

export function checkRequest(input: PolicyInput): PolicyResult {
  const rule = Object.prototype.hasOwnProperty.call(TABLE_RULES, input.table)
    ? TABLE_RULES[input.table]
    : undefined;
  if (!rule) return deny(403, 'This table is not available from the Resale Desk.');

  const method = String(input.method || '').toUpperCase() as Method;
  const access = rule.methods[method];
  if (!access) return deny(405, `${method} is not allowed on ${input.table}.`);
  if (access === 'admin' && !input.staff.isAdmin) {
    return deny(403, 'Only an Admin can delete records.');
  }

  // An upsert through POST could overwrite existing rows — never allowed.
  if (/resolution\s*=/i.test(input.prefer || '')) return deny(400, 'Upserts are not allowed.');

  const isWrite = method !== 'GET';
  let select: string | null = null;
  let idFilters = 0;

  for (const [key, value] of input.query) {
    if (key === 'select') {
      if (select !== null) return deny(400, 'Duplicate select.');
      select = value;
      continue;
    }
    if (key === 'on_conflict') return deny(400, 'Upserts are not allowed.');

    if (method === 'PATCH' || method === 'DELETE') {
      // Exactly one row, addressed by its id. No bulk edits or deletes.
      if (key === 'id' && UUID_EQ.test(value)) {
        idFilters++;
        continue;
      }
      return deny(400, 'Updates and deletes must target one record by id.');
    }

    if (method === 'POST') {
      if (key === 'columns') continue;
      return deny(400, `Option "${key}" is not allowed on insert.`);
    }

    // GET
    if (key === 'limit' || key === 'offset') {
      if (!/^\d{1,6}$/.test(value)) return deny(400, `Invalid ${key}.`);
      continue;
    }
    if (key === 'order') {
      for (const part of value.split(',')) {
        const col = part.split('.')[0];
        if (!IDENT.test(col)) return deny(400, 'Invalid order.');
        if (rule.columns && !rule.columns.includes(col)) return deny(400, 'Invalid order.');
      }
      continue;
    }
    if (LOGIC_KEYS.has(key)) {
      // A filter on a hidden column can leak it one guess at a time.
      if (rule.columns) return deny(400, 'Combined filters are not allowed on this table.');
      continue;
    }
    if (OPTION_KEYS.has(key)) continue;
    if (!IDENT.test(key)) return deny(400, `Invalid filter "${key}".`);
    if (rule.columns && !rule.columns.includes(key)) {
      return deny(400, `Filter "${key}" is not available.`);
    }
  }

  if ((method === 'PATCH' || method === 'DELETE') && idFilters !== 1) {
    return deny(400, 'Updates and deletes must target one record by id.');
  }

  const selectError = checkSelect(rule, select, !isWrite);
  if (selectError) return deny(400, selectError);

  if (method === 'GET' || method === 'DELETE') {
    return { ok: true, table: input.table, method, body: null };
  }

  // POST / PATCH: exactly one plain JSON object.
  const raw = input.body;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return deny(400, 'Body must be a single JSON object.');
  }
  const body: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const col of Object.keys(body)) {
    if (!IDENT.test(col)) return deny(400, `Invalid column "${col}".`);
  }

  if (method === 'PATCH') {
    if (!rule.patchColumns) return deny(405, `PATCH is not allowed on ${input.table}.`);
    const keys = Object.keys(body);
    if (keys.length === 0) return deny(400, 'Nothing to update.');
    for (const col of keys) {
      if (!rule.patchColumns.includes(col)) {
        return deny(403, `Column "${col}" cannot be changed from the Resale Desk.`);
      }
    }
  }

  if (method === 'POST' && rule.stampCreatedBy) {
    // Who did it comes from the verified login, never from the browser.
    body.created_by = input.staff.id;
  }

  return { ok: true, table: input.table, method, body };
}
