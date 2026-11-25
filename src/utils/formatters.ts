import { ResaleProperty } from '../types/crm';

export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${lakh % 1 === 0 ? lakh : lakh.toFixed(2)} Lakh`;
  }
  
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'Not set';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean phone number: remove non-digits
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppPostOptions {
  leadName?: string;
  agentName?: string;
  agentPhone?: string;
  includeLegalDetails?: boolean;
  includeAmenities?: boolean;
}

/**
 * Generates high-converting, professional WhatsApp property listing post
 * with emojis, structured sections, legal clearances, and call-to-actions.
 */
export function formatPropertyForWhatsAppPost(
  property: ResaleProperty,
  options?: WhatsAppPostOptions
): string {
  const code = property.propertyCode || `NP-${property.id.slice(0, 4).toUpperCase()}`;
  const transaction = property.transactionType === 'rent' ? 'FOR RENT' : 'FOR SALE / RESALE';
  const categoryTitle =
    property.category === 'plot'
      ? 'NMRDA Plotted Layout'
      : property.category === 'house_villa'
      ? 'Independent Duplex Villa'
      : property.category === 'commercial'
      ? 'Commercial Space'
      : `${property.bhk || '2/3 BHK'} Residential Flat`;

  const lines: string[] = [];

  // Salutation if sending to a specific lead
  if (options?.leadName) {
    lines.push(`Namaste ${options.leadName} ji! 🙏`);
    lines.push(`Here is an exclusive verified property matching your requirement in Nagpur:\n`);
  }

  lines.push(`🌟 *EXCLUSIVE PROPERTY ${transaction}* 🌟`);
  lines.push(`🏢 *Nagpur Properties & Saraswati Nagri Resale Desk*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🏡 *${property.title}*`);
  lines.push(`🔖 *Property Code:* ${code}`);
  lines.push(`📍 *Location:* ${property.locality}, ${property.corridor || 'Nagpur'}`);
  if (property.landmark) {
    lines.push(`📌 *Landmark:* Near ${property.landmark}`);
  }

  lines.push(`\n💰 *COMMERCIALS & PRICE:*`);
  lines.push(`• Demand: *${property.price}*`);
  if (property.ratePerSqFt) {
    lines.push(`• Rate: ₹${property.ratePerSqFt.toLocaleString('en-IN')}/sq.ft`);
  }
  if (property.owner?.negotiable) {
    lines.push(`• Price Negotiation: Open for serious table discussion`);
  }

  lines.push(`\n📐 *SPECIFICATIONS & LAYOUT:*`);
  lines.push(`• Type: *${categoryTitle}*`);
  lines.push(`• Super Built-up / Plot Area: *${property.areaSqFt} sq.ft*`);
  if (property.carpetAreaSqFt) {
    lines.push(`• Carpet Area: *${property.carpetAreaSqFt} sq.ft*`);
  }
  if (property.bhk && property.category !== 'plot') {
    lines.push(`• Configuration: *${property.bhk}*`);
  }
  if (property.facing) {
    lines.push(`• Facing: *${property.facing} Facing* (Vastu Compliant)`);
  }
  if (property.furnishing && property.category !== 'plot') {
    lines.push(`• Furnishing: *${property.furnishing}*`);
  }
  if (property.floor && property.category !== 'plot') {
    lines.push(`• Floor: *${property.floor}*`);
  }

  // Legal approvals
  const legal = property.legalStatus;
  lines.push(`\n🛡️ *LEGAL SANCTIONS & APPROVALS:*`);
  if (legal) {
    if (legal.nmrdaApproved) lines.push(`✅ NMRDA / NIT Sanctioned`);
    if (legal.rlAvailable) lines.push(`✅ RL (Release Letter) In-Hand`);
    if (legal.reraRegistered) {
      lines.push(`✅ MahaRERA Registered${legal.reraNumber ? `: ${legal.reraNumber}` : ''}`);
    }
    if (legal.clearTitle) lines.push(`✅ 7/12 & Clear Title — 100% Document Verified`);
    if (legal.loanEligible) {
      const banks = legal.eligibleBanks && legal.eligibleBanks.length > 0
        ? legal.eligibleBanks.slice(0, 3).join(', ')
        : 'SBI, HDFC, Bank of Maharashtra';
      lines.push(`✅ Bank Loan Sanctioned (80% - 90% from ${banks})`);
    }
  } else {
    lines.push(`✅ Verified Clear Title & Bank Loan Eligible`);
  }

  // Highlights & Amenities
  if (property.highlights && property.highlights.length > 0) {
    lines.push(`\n✨ *KEY HIGHLIGHTS:*`);
    property.highlights.slice(0, 4).forEach((h) => lines.push(`• ${h}`));
  }

  if (property.amenities && property.amenities.length > 0) {
    lines.push(`\n🌳 *AMENITIES:*`);
    lines.push(property.amenities.slice(0, 6).join(' • '));
  }

  lines.push(`\n━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🚗 *FREE SITE VISIT WITH COMPANY PICKUP AVAILABLE!*`);
  lines.push(`Visit anytime between 10:00 AM to 6:00 PM (Special Sunday tours).`);
  lines.push(`\n📞 *For Site Visit & Booking Inquiries:*`);
  const contactName = options?.agentName || 'Nagpur Resale Desk Executive';
  const contactPhone = options?.agentPhone || '8956040220';
  lines.push(`👤 ${contactName}`);
  lines.push(`📱 WhatsApp / Call: +91 ${contactPhone.replace(/\D/g, '').slice(-10)}`);
  lines.push(`🏢 Head Office: Saraswati Nagri Group, Nagpur`);

  return lines.join('\n');
}

export function buildPropertyPitchMessage(
  leadName: string, 
  propertyTitle: string, 
  locality: string, 
  price: string, 
  area: number,
  bhk?: string
): string {
  return `Namaste ${leadName} ji! 🙏\n\nWe have an exclusive verified property matching your requirement in *${locality}, Nagpur*:\n\n🏡 *${propertyTitle}*\n📍 *Location:* ${locality}, Nagpur\n📏 *Size:* ${area} sq.ft${bhk ? ` | ${bhk}` : ''}\n💰 *Price:* ${price}\n✅ *Legal:* NMRDA Sanctioned & Clear Title with Bank Loan\n\nWould you be comfortable for a site visit today or tomorrow?\n\n- Nagpur Properties & Saraswati Nagri Resale Desk\n📞 Helpline: +91 89560 40220`;
}

export function buildSiteVisitWhatsAppMessage(
  leadName: string,
  propertyTitle: string,
  locality: string,
  date: string,
  time: string,
  agentName: string,
  agentPhone: string
): string {
  return `Namaste ${leadName} ji! 🙏\n\nYour site visit has been scheduled successfully!\n\n📍 *Property:* ${propertyTitle} (${locality})\n📅 *Date:* ${date}\n⏰ *Time:* ${time}\n👤 *Executive:* ${agentName} (${agentPhone})\n🚗 *Pickup:* Office car available upon request\n\nOur executive will coordinate with you. Please feel free to reply if you need to adjust the timing!\n\n- Saraswati Nagri & Nagpur Properties Resale Desk`;
}

