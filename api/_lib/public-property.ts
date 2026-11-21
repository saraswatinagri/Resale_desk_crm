// What the PUBLIC website may see of a resale property.
//
// The owner's name and phone, and who in the team holds the listing, are the
// brokerage's private data: publishing them lets a buyer go around the desk.
// So the public feed selects only these columns and scrubs phone numbers out
// of the free-text description.

export const PUBLIC_PROPERTY_COLUMNS = [
  'id',
  'property_code',
  'title',
  'transaction_type',
  'category',
  'locality',
  'corridor',
  'address',
  'landmark',
  'maps_url',
  'price',
  'price_numeric',
  'rate_per_sqft',
  'maintenance_monthly',
  'area_sqft',
  'carpet_area_sqft',
  'bhk',
  'bathrooms',
  'balconies',
  'floor',
  'furnishing',
  'facing',
  'age_of_property',
  'status',
  'is_verified',
  'verification_badge',
  'legal_status',
  'amenities',
  'highlights',
  'images',
  'description',
  'created_at',
  'updated_at',
].join(', ');

const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g;

export function scrubDescription(text: unknown): string {
  const raw = typeof text === 'string' ? text : '';
  // Auto-registered listings embed the sender's raw message (name + number).
  if (/^Auto-registered/i.test(raw.trim())) return '';
  return raw.replace(PHONE, '').trim();
}

export function toPublicProperty<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row, description: scrubDescription(row.description) };
  delete copy.owner;
  delete copy.assigned_to;
  delete copy.created_by;
  return copy as T;
}

/** Strips characters that have meaning inside a PostgREST `or=(...)` filter. */
export function safeSearchTerm(value: unknown): string {
  return String(value ?? '')
    .replace(/[^\p{L}\p{N} .\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}
