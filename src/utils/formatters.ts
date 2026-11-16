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

export function buildPropertyPitchMessage(
  leadName: string, 
  propertyTitle: string, 
  locality: string, 
  price: string, 
  area: number,
  bhk?: string
): string {
  return `Hello ${leadName},\n\nWe have an exclusive property matching your requirement in *${locality}, Nagpur*:\n\n🏡 *${propertyTitle}*\n📍 Location: ${locality}\n📏 Size: ${area} sq.ft${bhk ? ` | ${bhk}` : ''}\n💰 Price: ${price}\n✅ Clear Title & Verified Documents\n\nWould you be available for a site visit today or tomorrow?\n\n- Nagpur Properties & Saraswati Nagri Resale Desk`;
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
  return `Hello ${leadName},\n\nYour site visit is scheduled!\n\n📍 Property: *${propertyTitle}* (${locality})\n📅 Date: ${date}\n⏰ Time: ${time}\n👤 Executive: ${agentName} (${agentPhone})\n\nOur executive will coordinate with you. Please feel free to reply if you need any assistance!\n\n- Resale Desk Team`;
}

