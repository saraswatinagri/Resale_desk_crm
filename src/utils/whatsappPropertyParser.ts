import { PropertyCategory, TransactionType, ResaleProperty, LegalAudit } from '../types/crm';
import { NAGPUR_LOCALITIES } from '../data/constants';

export interface ParsedPropertyFromWhatsApp {
  rawText: string;
  confidenceScore: number;
  extractedFields: {
    title?: string;
    category?: PropertyCategory;
    transactionType?: TransactionType;
    locality?: string;
    corridor?: string;
    address?: string;
    areaSqFt?: number;
    price?: string;
    priceNumeric?: number;
    ratePerSqFt?: number;
    bhk?: string;
    facing?: ResaleProperty['facing'];
    furnishing?: ResaleProperty['furnishing'];
    status?: ResaleProperty['status'];
    ownerName?: string;
    ownerPhone?: string;
    legalStatus?: Partial<LegalAudit>;
    highlights?: string[];
  };
}

/**
 * Intelligent WhatsApp Property Message Parser
 * Parses forwarded messages, owner listings, broker broadcasts, and seller chat messages.
 */
export function parseWhatsAppPropertyMessage(messageText: string): ParsedPropertyFromWhatsApp {
  if (!messageText || typeof messageText !== 'string') {
    return { rawText: '', confidenceScore: 0, extractedFields: {} };
  }

  const text = messageText.trim();
  const lower = text.toLowerCase();
  const extracted: ParsedPropertyFromWhatsApp['extractedFields'] = {};
  let score = 0;

  // 1. Transaction Type: Resale vs Rent
  if (
    lower.includes('for rent') ||
    lower.includes('to let') ||
    lower.includes('available for lease') ||
    lower.includes('rent:') ||
    lower.includes('/month') ||
    lower.includes('per month') ||
    lower.includes('bhadya ne') ||
    lower.includes('kiraye pe')
  ) {
    extracted.transactionType = 'rent';
    score += 15;
  } else {
    extracted.transactionType = 'resale';
    score += 10;
  }

  // 2. Property Category (plot, flat, house_villa, commercial, farmhouse)
  if (
    lower.includes('plot') ||
    lower.includes('layout') ||
    lower.includes('khadan') ||
    lower.includes('open land') ||
    lower.includes('residential plot') ||
    lower.includes('commercial plot')
  ) {
    extracted.category = 'plot';
    score += 25;
  } else if (
    lower.includes('flat') ||
    lower.includes('apartment') ||
    lower.includes('bhk') ||
    lower.includes('society') ||
    lower.includes('multistory') ||
    lower.includes('wing')
  ) {
    extracted.category = 'flat';
    score += 25;
  } else if (
    lower.includes('villa') ||
    lower.includes('row house') ||
    lower.includes('bungalow') ||
    lower.includes('house') ||
    lower.includes('independent house') ||
    lower.includes('duplex')
  ) {
    extracted.category = 'house_villa';
    score += 25;
  } else if (
    lower.includes('commercial') ||
    lower.includes('shop') ||
    lower.includes('office') ||
    lower.includes('godown') ||
    lower.includes('warehouse') ||
    lower.includes('showroom')
  ) {
    extracted.category = 'commercial';
    score += 25;
  } else if (lower.includes('farm') || lower.includes('agricultural') || lower.includes('farmhouse') || lower.includes('shet')) {
    extracted.category = 'farmhouse';
    score += 25;
  } else {
    extracted.category = 'plot'; // Default in Nagpur
  }

  // 3. BHK Preference (for flats and houses)
  const bhkMatch = text.match(/\b([1-6])\s*(?:bhk|rk|bed|bedroom)\b/i);
  if (bhkMatch) {
    extracted.bhk = `${bhkMatch[1]} BHK`;
    score += 15;
  }

  // 4. Area in Sq.Ft
  // Matches e.g.: "1500 sqft", "1200 sq ft", "2400 sq.ft", "area: 1800", "size: 30x50 = 1500"
  const areaMatch = text.match(
    /(?:area|size|dimension|plot size)?[:\s]*(\d{3,5})\s*(?:sqft|sq\.ft|sq\s*ft|sq\s*feet|square\s*feet|sft)?\b/i
  );
  if (areaMatch) {
    const parsedArea = parseInt(areaMatch[1], 10);
    if (parsedArea >= 200 && parsedArea <= 50000) {
      extracted.areaSqFt = parsedArea;
      score += 20;
    }
  }

  // Also check dimensions e.g. "30*50", "30x50", "40 x 60"
  const dimMatch = text.match(/\b(\d{2})\s*[x*×]\s*(\d{2,3})\b/i);
  if (dimMatch && !extracted.areaSqFt) {
    const l = parseInt(dimMatch[1], 10);
    const w = parseInt(dimMatch[2], 10);
    if (l && w) {
      extracted.areaSqFt = l * w;
      score += 20;
    }
  }

  // 5. Price & Numeric Price in INR
  // Matches: "45 Lakhs", "45 Lacs", "45 L", "45,00,000", "1.2 Cr", "4500000"
  let priceNumeric: number | undefined;
  let priceDisplay: string | undefined;

  const croreMatch = text.match(/(?:price|demand|rate|cost|asking)?[:\s]*₹?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  const lakhMatch = text.match(/(?:price|demand|rate|cost|asking)?[:\s]*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/i);
  const numericMatch = text.match(/(?:price|demand|cost)?[:\s]*₹?\s*(\d{1,2}[,]\d{2}[,]\d{3}|\d{6,8})\b/i);

  if (croreMatch) {
    const val = parseFloat(croreMatch[1]);
    priceNumeric = Math.round(val * 10000000);
    priceDisplay = `₹${val} Cr`;
    score += 25;
  } else if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]);
    priceNumeric = Math.round(val * 100000);
    priceDisplay = `₹${val} Lakh`;
    score += 25;
  } else if (numericMatch) {
    const rawNum = numericMatch[1].replace(/,/g, '');
    const val = parseInt(rawNum, 10);
    if (val >= 100000) {
      priceNumeric = val;
      const l = (val / 100000).toFixed(1).replace(/\.0$/, '');
      priceDisplay = `₹${l} Lakh`;
      score += 20;
    }
  }

  if (priceNumeric) {
    extracted.priceNumeric = priceNumeric;
    extracted.price = priceDisplay;
    if (extracted.areaSqFt && extracted.areaSqFt > 0) {
      extracted.ratePerSqFt = Math.round(priceNumeric / extracted.areaSqFt);
    }
  }

  // 6. Locality (Matches against verified Nagpur localities)
  let foundLocality: (typeof NAGPUR_LOCALITIES)[number] | undefined;
  for (const loc of NAGPUR_LOCALITIES) {
    const regex = new RegExp(`\\b${loc.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundLocality = loc;
      break;
    }
  }

  if (foundLocality) {
    extracted.locality = foundLocality.name;
    extracted.corridor = foundLocality.corridor;
    score += 20;
  } else {
    // Check general landmarks or areas like "Wardha Road", "Mihan", "Besa", "Manish Nagar", "Hingna"
    const generalKeywords = [
      'Besa', 'Manish Nagar', 'Wardha Road', 'Hingna', 'Katol Road', 'Koradi',
      'Mihan', 'Jamtha', 'Beltarodi', 'Shankarpur', 'Pipla', 'Hudkeshwar',
      'Trimurti Nagar', 'Pratap Nagar', 'Dharampeth', 'Civil Lines', 'Somalwada'
    ];
    for (const gk of generalKeywords) {
      if (lower.includes(gk.toLowerCase())) {
        extracted.locality = gk;
        extracted.corridor = 'South Nagpur';
        score += 15;
        break;
      }
    }
  }

  // 7. Owner Name and Contact Phone Number
  // 10 or 12 digit phone number (e.g. 9823123456, +919823123456, 919823123456, 9823-123456)
  const phoneMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  if (phoneMatch) {
    extracted.ownerPhone = `+91 ${phoneMatch[1]}`;
    score += 20;
  }

  // Owner Name extraction (matches lines like "Owner: Rajesh Sharma", "Contact: Nitin", "Name - ...")
  const ownerNameMatch = text.match(/(?:owner|contact|call|person|name|mr\.?|shri)?[:\s-]+([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?)/i);
  if (ownerNameMatch && !['Plot', 'Flat', 'House', 'Price', 'Ready', 'East', 'West', 'Near'].includes(ownerNameMatch[1])) {
    extracted.ownerName = ownerNameMatch[1].trim();
    score += 10;
  }

  // 8. Facing Direction
  const facingOptions: Array<ResaleProperty['facing']> = ['East', 'North', 'North-East', 'West', 'South'];
  for (const f of facingOptions) {
    if (new RegExp(`\\b${f}\\s*(?:facing|face)?\\b`, 'i').test(text)) {
      extracted.facing = f;
      score += 5;
      break;
    }
  }

  // 9. Furnishing
  if (lower.includes('fully furnished') || lower.includes('full furnished')) {
    extracted.furnishing = 'Fully Furnished';
    score += 5;
  } else if (lower.includes('semi furnished') || lower.includes('semi-furnished')) {
    extracted.furnishing = 'Semi-Furnished';
    score += 5;
  } else if (lower.includes('unfurnished') || lower.includes('raw')) {
    extracted.furnishing = 'Unfurnished';
  }

  // 10. Legal Audit flags
  const legalStatus: Partial<LegalAudit> = {
    nmrdaApproved: lower.includes('nmrda') || lower.includes('rl'),
    rlAvailable: lower.includes('rl') || lower.includes('release letter'),
    reraRegistered: lower.includes('rera'),
    nitApproved: lower.includes('nit'),
    clearTitle: lower.includes('clear title') || lower.includes('clear') || lower.includes('registry ready'),
    loanEligible: lower.includes('loan') || lower.includes('bank loan') || lower.includes('sbi loan'),
    eligibleBanks: lower.includes('sbi') ? ['SBI', 'HDFC Bank'] : ['HDFC Bank', 'ICICI Bank', 'SBI'],
  };
  extracted.legalStatus = legalStatus;

  // 11. Highlights & Title generation
  const highlights: string[] = [];
  if (legalStatus.rlAvailable) highlights.push('RL Sanctioned');
  if (legalStatus.nmrdaApproved) highlights.push('NMRDA Approved');
  if (legalStatus.clearTitle) highlights.push('100% Clear Title');
  if (extracted.facing) highlights.push(`${extracted.facing} Facing`);
  if (extracted.bhk) highlights.push(extracted.bhk);
  if (lower.includes('road') || text.match(/\b\d{2}\s*ft\s*road\b/i)) {
    const roadMatch = text.match(/\b(\d{2}\s*ft\s*road)\b/i);
    highlights.push(roadMatch ? roadMatch[1] : 'Wide Tar Road');
  }
  extracted.highlights = highlights;

  // 12. Smart Title
  const areaPart = extracted.areaSqFt ? `${extracted.areaSqFt} Sq.Ft ` : '';
  const bhkPart = extracted.bhk ? `${extracted.bhk} ` : '';
  const categoryPart =
    extracted.category === 'plot'
      ? 'Plot'
      : extracted.category === 'flat'
        ? 'Apartment'
        : extracted.category === 'house_villa'
          ? 'Independent House / Villa'
          : 'Commercial Property';
  const localityPart = extracted.locality ? `in ${extracted.locality}` : 'in Nagpur';

  extracted.title = `${areaPart}${bhkPart}${categoryPart} ${localityPart}`.trim();

  // Address
  extracted.address = extracted.locality ? `${extracted.locality}, Nagpur, Maharashtra` : 'Nagpur, Maharashtra';

  return {
    rawText: text,
    confidenceScore: Math.min(100, Math.max(15, score)),
    extractedFields: extracted,
  };
}
