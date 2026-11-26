/**
 * Phone + inbound matching rules copied from the live Saraswati Nagri CRM
 * (src/lib/whatsapp + api/whatsapp/webhook). Keep this file free of
 * import.meta so Vercel API routes can import it.
 */

export const RESALE_HEAD_PROFILE_ID = 'a342167a-c988-49cc-b304-29aed3fc81b4';
export const RESALE_HEAD_NAME = 'Sagar Madhukar kamble';

/** Last-10 staff / office numbers — never auto-create these as buyer leads. */
export const STAFF_PHONE_LAST10 = new Set([
  '8956040220',
  '9494942894',
  '9823388866',
  '7888028866',
  '8857801966',
]);

export const CLOSED_LEAD_STATUSES = new Set(['Converted', 'Not Interested', 'Invalid']);

export function digitsOnly(raw?: string | null): string {
  return String(raw || '').replace(/\D/g, '');
}

export function last10(raw?: string | null): string {
  const digits = digitsOnly(raw);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Canonical leads.phone form used by Saraswati Nagri (last 10 digits). */
export function normalizeLeadPhone(raw?: string | null): string | null {
  const phone = last10(raw);
  return phone.length === 10 ? phone : null;
}

export function e164India(raw?: string | null): string {
  const phone = last10(raw);
  return phone ? `91${phone}` : '';
}

export function isStaffNumber(raw?: string | null): boolean {
  const phone = last10(raw);
  return Boolean(phone && STAFF_PHONE_LAST10.has(phone));
}

export function looksLikeVisitSlip(text?: string | null): boolean {
  const t = String(text || '').toLowerCase();
  return t.includes('time of visit') || t.includes('visit slip') || t.includes('site visit done');
}

export function shouldArchiveGroupMessage(isGroup: boolean, chatJid: string, text: string): boolean {
  if (!isGroup) return true;
  return chatJid === '120363430117638169@g.us' || looksLikeVisitSlip(text);
}

export function displayMessageBody(text: string, mediaType?: string | null, fileName?: string | null): string {
  if (!mediaType) return text || '';
  const label = fileName ? `[${mediaType}: ${fileName}]` : `[${mediaType}]`;
  return text ? `${label} ${text}` : label;
}

export interface LeadMatchCandidate {
  id: string;
  phone?: string | null;
  whatsapp?: string | null;
  status?: string | null;
  updated_at?: string | null;
}

/** Prefer an open lead, then the most recently updated exact last-10 match. */
export function pickBestLeadMatch<T extends LeadMatchCandidate>(candidates: T[], fromNumber: string): T | null {
  const target = last10(fromNumber);
  if (target.length < 10) return null;

  const exact = candidates.filter(
    (lead) => last10(lead.phone) === target || last10(lead.whatsapp) === target
  );
  if (exact.length === 0) return null;

  exact.sort((left, right) => {
    const leftClosed = CLOSED_LEAD_STATUSES.has(left.status || '') ? 1 : 0;
    const rightClosed = CLOSED_LEAD_STATUSES.has(right.status || '') ? 1 : 0;
    if (leftClosed !== rightClosed) return leftClosed - rightClosed;
    return new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime();
  });
  return exact[0];
}

export function isAiAutoReplyEnabled(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): boolean {
  const raw = String(env.WHATSAPP_AI_AUTO_REPLY || env.VITE_WHATSAPP_AI_AUTO_REPLY || '').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'on';
}
