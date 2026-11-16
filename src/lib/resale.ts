import type { LeadStage, PropertyCategory } from '../types/crm';

export const RESALE_LISTING_TYPES = [
  'Wants to Rent Out Their Property',
  'Wants to Sell Their Property (House/Villa/Farm)',
] as const;

export const RESALE_REQUIREMENT_TYPES = [
  'Wants to Rent a Property',
  'Wants to Buy a Property (Resale)',
] as const;

export const RESALE_PROPERTY_TYPES = [
  ...RESALE_LISTING_TYPES,
  ...RESALE_REQUIREMENT_TYPES,
] as const;

export type ResalePropertyType = (typeof RESALE_PROPERTY_TYPES)[number];

export const RESALE_RENT_OUT: ResalePropertyType = 'Wants to Rent Out Their Property';
export const RESALE_SELL: ResalePropertyType = 'Wants to Sell Their Property (House/Villa/Farm)';
export const RESALE_RENT_SEEK: ResalePropertyType = 'Wants to Rent a Property';
export const RESALE_BUY: ResalePropertyType = 'Wants to Buy a Property (Resale)';

export const BUY_PROPERTY_TYPES = [
  'Residential Plot',
  'Residential Villa/House',
  'Apartment/Flat',
  'Commercial Plot',
  'Commercial Shop/Showroom',
  'Commercial Office',
  'Commercial Warehouse/Godown',
  'Agricultural Land',
] as const;

export const RESALE_INTENT_OPTIONS: Array<{ label: string; value: ResalePropertyType }> = [
  { label: 'Bechna hai', value: RESALE_SELL },
  { label: 'Rent pe dena hai', value: RESALE_RENT_OUT },
  { label: 'Kharidna hai', value: RESALE_BUY },
  { label: 'Rent pe lena hai', value: RESALE_RENT_SEEK },
];

export const RESALE_OTHER = '__other__';

export const RESALE_KIND_OPTIONS: Array<{ label: string; value: string; category: PropertyCategory }> = [
  { label: 'House / Villa', value: 'House/Villa', category: 'house_villa' },
  { label: 'Flat', value: 'Flat', category: 'flat' },
  { label: 'Plot', value: 'Plot', category: 'plot' },
  { label: 'Farm / Agri', value: 'Farm/Agri', category: 'farmhouse' },
  { label: 'Shop', value: 'Shop', category: 'commercial' },
  { label: 'Commercial / Office', value: 'Commercial', category: 'commercial' },
];

export const RESALE_LOCATION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Lonara', value: 'Lonara' },
  { label: 'Koradi', value: 'Koradi' },
  { label: 'Kamptee Rd', value: 'Kamptee Road' },
  { label: 'Wardha Rd', value: 'Wardha Road' },
  { label: 'Besa', value: 'Besa' },
  { label: 'Hingna', value: 'Hingna' },
  { label: 'Umred Rd', value: 'Umred Road' },
  { label: 'Manish Nagar', value: 'Manish Nagar' },
  { label: 'Somalwada', value: 'Somalwada' },
  { label: 'Shankarpur', value: 'Shankarpur' },
  { label: 'Open / anywhere', value: 'Open — anywhere in Nagpur' },
];

export const RESALE_PRICE_OPTIONS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under ₹25 L', min: 0, max: 2_500_000 },
  { label: '₹25–50 L', min: 2_500_000, max: 5_000_000 },
  { label: '₹50 L–1 Cr', min: 5_000_000, max: 10_000_000 },
  { label: '₹1 Cr+', min: 10_000_000, max: 50_000_000 },
];

export const RESALE_RENT_OPTIONS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under ₹10k/mo', min: 0, max: 10_000 },
  { label: '₹10–20k/mo', min: 10_000, max: 20_000 },
  { label: '₹20–35k/mo', min: 20_000, max: 35_000 },
  { label: '₹35–50k/mo', min: 35_000, max: 50_000 },
  { label: '₹50k+/mo', min: 50_000, max: 200_000 },
];

export const SARASWATI_LEAD_SOURCES = [
  'Walk-in',
  'WhatsApp',
  'Facebook Ad',
  'Google Ad',
  'Instagram Ad',
  'Reference/Referral',
  'Phone Enquiry',
  'Newspaper Ad',
  'Hoarding/Banner',
  'Property Portal',
  'Site Visit',
  'JustDial',
  'Canopy',
  'Website',
  'Purana Contact',
  'Other',
] as const;

export const RESALE_BRAND = 'Nagpur Properties';
export const RESALE_TAG = 'Resale';

export function isResaleIntent(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const v = propertyType.trim().toLowerCase();
  return RESALE_PROPERTY_TYPES.some((t) => t.toLowerCase() === v);
}

export function isResaleListing(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const v = propertyType.trim().toLowerCase();
  return RESALE_LISTING_TYPES.some((t) => t.toLowerCase() === v);
}

export function isResaleRentIntent(propertyType?: string | null): boolean {
  if (!propertyType) return false;
  const v = propertyType.trim().toLowerCase();
  return v === RESALE_RENT_OUT.toLowerCase() || v === RESALE_RENT_SEEK.toLowerCase();
}

export function resalePriceOptionsFor(propertyType?: string | null) {
  return isResaleRentIntent(propertyType) ? RESALE_RENT_OPTIONS : RESALE_PRICE_OPTIONS;
}

export function resalePriceFieldLabel(propertyType?: string | null): string {
  const v = String(propertyType ?? '').trim().toLowerCase();
  if (v === RESALE_RENT_OUT.toLowerCase()) return 'Rent expected';
  if (v === RESALE_RENT_SEEK.toLowerCase()) return 'Rent budget';
  if (v === RESALE_BUY.toLowerCase()) return 'Budget';
  return 'Asking / expected';
}

export function propertyTypeLabel(propertyType?: string | null): string {
  if (!propertyType) return 'Looking for: not captured';
  const hit = RESALE_INTENT_OPTIONS.find((o) => o.value.toLowerCase() === propertyType.trim().toLowerCase());
  return hit ? `${hit.label} · ${propertyType}` : propertyType;
}

export function leadCodeFor(leadNo: unknown, id: string): string {
  const n = Number(leadNo);
  if (Number.isFinite(n) && n > 0) return `L-${Math.trunc(n)}`;
  if (!id) return 'L-NEW';
  return `LD-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function dbStatusToLeadStage(status?: string | null): LeadStage {
  const s = (status || '').trim();
  switch (s) {
    case 'New':
    case 'New Inquiry':
    case 'WhatsApp Inbound':
      return 'new';
    case 'Follow-up':
      return 'contacted';
    case 'Site Visit Scheduled':
      return 'visit_scheduled';
    case 'Site Visit Done':
      return 'visit_done';
    case 'Negotiation':
      return 'negotiation';
    case 'Token Paid':
    case 'Token Pending Verification':
    case 'Booked':
      return 'token_received';
    case 'Agreement Done':
    case 'Registry Done':
    case 'Converted':
      return 'closed';
    case 'Not Interested':
    case 'Requirement Closed':
      return 'lost';
    default:
      return 'new';
  }
}

export function leadStageToDbStatus(stage: LeadStage): string {
  switch (stage) {
    case 'new':
      return 'New Inquiry';
    case 'contacted':
      return 'Follow-up';
    case 'visit_scheduled':
      return 'Site Visit Scheduled';
    case 'visit_done':
      return 'Site Visit Done';
    case 'negotiation':
      return 'Negotiation';
    case 'token_received':
      return 'Token Paid';
    case 'closed':
      return 'Converted';
    case 'lost':
      return 'Not Interested';
  }
}

export function stageShortLabel(status: string): string {
  const map: Record<string, string> = {
    All: 'All',
    'New Inquiry': 'New',
    'Follow-up': 'Follow-up',
    'Site Visit Scheduled': 'Visit Booked',
    'Site Visit Done': 'Visit Done',
    Negotiation: 'Negotiation',
    'Token Paid': 'Token Paid',
    'Agreement Done': 'Agreement',
    'Registry Done': 'Registry',
    Converted: 'Converted',
    'Not Interested': 'Not Interested',
    'Requirement Closed': 'Closed',
  };
  return map[status] ?? status;
}

export function plotInterestToCategory(plotInterest?: string | null): PropertyCategory | 'any' {
  const v = (plotInterest || '').trim().toLowerCase();
  if (!v) return 'any';
  if (v.includes('flat') || v.includes('apartment')) return 'flat';
  if (v.includes('house') || v.includes('villa')) return 'house_villa';
  if (v.includes('plot') || v.includes('land')) return 'plot';
  if (v.includes('farm') || v.includes('agri')) return 'farmhouse';
  if (v.includes('shop') || v.includes('commercial') || v.includes('office')) return 'commercial';
  return 'any';
}

export function categoryToPlotInterest(cat: PropertyCategory | 'any'): string {
  switch (cat) {
    case 'flat':
      return 'Flat';
    case 'house_villa':
      return 'House/Villa';
    case 'plot':
      return 'Plot';
    case 'farmhouse':
      return 'Farm/Agri';
    case 'commercial':
      return 'Commercial';
    default:
      return 'Flat';
  }
}

export function formatBudgetShort(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
    if (n >= 1_000) return `₹${Math.round(n / 1_000)}k`;
    return `₹${n.toLocaleString('en-IN')}`;
  };
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  if (min && min > 0) return `${fmt(min)}+`;
  if (max && max > 0) return `Up to ${fmt(max)}`;
  return 'Budget missing';
}

export function daysSinceIso(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

