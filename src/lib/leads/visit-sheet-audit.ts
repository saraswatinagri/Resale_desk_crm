// ── Visit sheet audit — WhatsApp's written register vs the CRM ───────────────
//
// The team's real site-visit register is a paper sheet: client name, mobile,
// time, layout, area, "accompanied by", remarks. It gets photographed and sent
// on WhatsApp. The CRM is the incomplete copy of it.
//
// This module provides the exact reconciliation algorithm from Saraswati Nagri CRM.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const NO_DATE_PERIOD = 'Sheet par date nahi';
export const SHEET_MARKER = 'Time of visit';

export interface ParsedSheet {
  raw: string;
  name: string;
  mobile10: string;
  site: string;
  visitBy: string;
  day: number | null;
  month: number | null;
  year: number | null;
}

export interface LeadRef {
  id: string;
  leadNo: number | null;
  name: string | null;
  phone: string | null;
  status: string | null;
  siteVisitDate: string | null;
  assignedTo: string | null;
}

export interface AuditMissingVisit {
  sheetDate: string;
  period: string;
  client: string;
  mobile: string;
  site: string;
  visitBy: string;
  leadNo: number;
  leadId: string | null;
  owner: string;
  note?: string;
}

export interface AuditPerson {
  name: string;
  namedOn: number;
  inCrm: number;
  missing: number;
  customerNotInCrm: number;
}

export interface VisitAuditData {
  window: { from: string; to: string };
  computedAt: string;
  tally: { sheets: number; checkable: number; inCrm: number; missing: number };
  unusable: { blankSheet: number; noMobileWritten: number; mobileNotInCrm: number };
  missing: AuditMissingVisit[];
  byPerson: AuditPerson[];
}

export function last10Digits(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export const SHEET_NAME_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Vaibhav Khadse', pattern: /vaibhav/i },
  { name: 'Sanjay Deshpande', pattern: /deshpand/i },
  { name: 'Aniruddha Thakre', pattern: /anirud/i },
  { name: 'Kavya Shelare', pattern: /kavya/i },
  { name: 'Nitish Maidanwar', pattern: /nitish/i },
  { name: 'Yash Madavi', pattern: /yash|yesh/i },
  { name: 'Shivam Singh', pattern: /shivam/i },
  { name: 'Sagar Kamble', pattern: /sagar/i },
  { name: 'Prachi Ingle', pattern: /prachi|ishai/i },
];

export function parseSheetDate(dateText: string): { day: number | null; month: number | null; year: number | null } {
  const parts = dateText.split(/[/.\-]/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 3) return { day: null, month: null, year: null };
  const dayNum = Number(parts[0]);
  const monthNum = Number(parts[1]);
  let yearNum = Number(parts[2]);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return { day: null, month: null, year: null };
  if (!Number.isFinite(yearNum)) return { day: null, month: null, year: null };
  if (yearNum < 100) yearNum += 2000;
  const day = Number.isFinite(dayNum) && dayNum >= 1 && dayNum <= 31 ? dayNum : null;
  return { day, month: monthNum, year: yearNum };
}

export function parseVisitSheet(text: string): ParsedSheet {
  const t = text.replace(/\s+/g, ' ');

  const mobileRaw = /Mobile No[: ]*([0-9+‪‬ \-]{6,20})/i.exec(t)?.[1] ?? '';
  const name = (
    /\)\s*([^|]{3,45}?)\s*Mobile No/i.exec(t)?.[1]
    ?? /Name\s*[:-]?\s*([^|]{3,45}?)\s*Mobile No/i.exec(t)?.[1]
    ?? /Date\s*[:\- ]+\s*[0-9/.\-]{6,12}\s+([A-Za-z.\s]{3,45}?)\s*Mobile No/i.exec(t)?.[1]
    ?? ''
  ).trim();
  const site = (/[Ll]ayout\/[Ss]ite\/ ?[Pp]roject [Nn]ame ?:?-? ?([^|]{0,45}?)\s*Area Size/i.exec(t)?.[1] ?? '').trim();
  const visitByRaw = (/Accompanied by ?:?\s*([^|]{0,70}?)\s*Referred By/i.exec(t)?.[1] ?? '').trim();
  const visitBy = visitByRaw.replace(/^[:-]\s*/, '').trim();
  const dateText = /Date ?:?-? ?([0-9/.\-]{6,12})/i.exec(t)?.[1] ?? '';

  const { day, month, year } = parseSheetDate(dateText);
  return { raw: t, name, mobile10: last10Digits(mobileRaw), site, visitBy, day, month, year };
}

function sheetDateLabel(s: ParsedSheet): string {
  if (!s.month || !s.year) return '—';
  const short = MONTH_SHORT[s.month - 1];
  return s.day ? `${s.day} ${short}` : short;
}

function periodLabel(s: ParsedSheet): string {
  if (!s.month || !s.year) return NO_DATE_PERIOD;
  return `${MONTH_LONG[s.month - 1]} ${s.year}`;
}

function periodRank(s: ParsedSheet): number {
  if (!s.month || !s.year) return -1;
  return s.year * 12 + s.month;
}

export interface BuildVisitAuditInput {
  sheets: ParsedSheet[];
  leadsByLast10: Map<string, LeadRef>;
  leadIdsWithVisitEntry: Set<string>;
  ownerNameById: Map<string, string>;
  window: { from: string; to: string };
  computedAt: string;
}

export function buildVisitAudit(input: BuildVisitAuditInput): VisitAuditData {
  const { sheets, leadsByLast10, leadIdsWithVisitEntry, ownerNameById } = input;

  let blankSheet = 0;
  let noMobileWritten = 0;
  let mobileNotInCrm = 0;
  const missing: (AuditMissingVisit & { _rank: number; _day: number })[] = [];

  const people = new Map<string, AuditPerson>(
    SHEET_NAME_PATTERNS.map(p => [p.name, { name: p.name, namedOn: 0, inCrm: 0, missing: 0, customerNotInCrm: 0 }]),
  );

  for (const sheet of sheets) {
    const lead = sheet.mobile10 ? leadsByLast10.get(sheet.mobile10) : undefined;
    const recorded = Boolean(lead && (lead.siteVisitDate || leadIdsWithVisitEntry.has(lead.id)));

    if (!sheet.mobile10) {
      if (!sheet.name) blankSheet += 1; else noMobileWritten += 1;
    } else if (!lead) {
      mobileNotInCrm += 1;
    } else if (!recorded) {
      missing.push({
        sheetDate: sheetDateLabel(sheet),
        period: periodLabel(sheet),
        client: sheet.name || lead.name || '(naam likha nahi)',
        mobile: sheet.mobile10,
        site: sheet.site || 'sheet par likha nahi',
        visitBy: sheet.visitBy || 'sheet par likha nahi',
        leadNo: lead.leadNo ?? 0,
        leadId: lead.id,
        owner: lead.assignedTo ? (ownerNameById.get(lead.assignedTo) ?? 'unassigned') : 'unassigned',
        note: sheet.name ? undefined : 'sheet par naam khaali',
        _rank: periodRank(sheet),
        _day: sheet.day ?? 0,
      });
    }

    const acc = sheet.visitBy.toLowerCase();
    for (const { name, pattern } of SHEET_NAME_PATTERNS) {
      if (!pattern.test(acc)) continue;
      const row = people.get(name)!;
      row.namedOn += 1;
      if (!sheet.mobile10 || !lead) row.customerNotInCrm += 1;
      else if (recorded) row.inCrm += 1;
      else row.missing += 1;
    }
  }

  missing.sort((a, b) => (b._rank - a._rank) || (b._day - a._day) || a.client.localeCompare(b.client));

  const checkable = sheets.filter(s => s.mobile10 && leadsByLast10.has(s.mobile10)).length;
  const missingCount = missing.length;

  return {
    window: input.window,
    computedAt: input.computedAt,
    tally: {
      sheets: sheets.length,
      checkable,
      inCrm: checkable - missingCount,
      missing: missingCount,
    },
    unusable: { blankSheet, noMobileWritten, mobileNotInCrm },
    missing: missing.map(({ _rank: _r, _day: _d, ...row }) => row),
    byPerson: [...people.values()].sort((a, b) => b.namedOn - a.namedOn || a.name.localeCompare(b.name)),
  };
}

export function dedupeSheetTexts(texts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of texts) {
    if (!raw) continue;
    const key = raw.replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}
