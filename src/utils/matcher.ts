import { ResaleLead, ResaleProperty, MatchScore } from '../types/crm';

/**
 * Calculates match score (0 - 100) between a buyer/tenant lead and an inventory property
 */
export function calculateMatchScore(lead: ResaleLead, property: ResaleProperty): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Transaction Type Check
  const isLeadRent = lead.intent === 'Wants to Rent a Property' || lead.intent === 'Wants to Rent Out Their Property';
  const isPropRent = property.transactionType === 'rent';

  if (isLeadRent !== isPropRent) {
    return { property, score: 0, reasons: ['Transaction type mismatch (Buy vs Rent)'] };
  }

  // 2. Locality Matching (Strong weight: +35 points)
  const normPropLocality = property.locality.toLowerCase().trim();
  const matchedLocality = lead.preferredLocalities.some(loc => {
    const l = loc.toLowerCase().trim();
    return normPropLocality.includes(l) || l.includes(normPropLocality);
  });

  if (matchedLocality) {
    score += 35;
    reasons.push(`Exact location match (${property.locality})`);
  } else if (lead.preferredLocalities.length === 0 || lead.preferredLocalities.includes('Open — anywhere in Nagpur')) {
    score += 20;
    reasons.push('Location is flexible');
  }

  // 3. Category Matching (+25 points)
  if (lead.propertyCategory === 'any' || lead.propertyCategory === property.category) {
    score += 25;
    reasons.push(`Matching category (${property.category})`);
  }

  // 4. BHK / Configuration Matching (+20 points)
  if (property.bhk && lead.bhkPreference && lead.bhkPreference.length > 0) {
    const hasBhkMatch = lead.bhkPreference.some(b => 
      b.toLowerCase().trim() === property.bhk?.toLowerCase().trim()
    );
    if (hasBhkMatch) {
      score += 20;
      reasons.push(`BHK matches requirement (${property.bhk})`);
    }
  } else if (!property.bhk || lead.bhkPreference.length === 0) {
    score += 15;
  }

  // 5. Budget Fit (+20 points)
  const propPrice = property.priceNumeric;
  if (propPrice > 0) {
    const min = lead.budgetMin ?? 0;
    const max = lead.budgetMax ?? Infinity;

    if (propPrice >= min && propPrice <= max) {
      score += 20;
      reasons.push(`Within exact budget (${property.price})`);
    } else if (propPrice <= max * 1.15 && propPrice >= min * 0.85) {
      score += 10;
      reasons.push(`Close to budget (within 15%)`);
    }
  } else {
    score += 10;
  }

  return {
    property,
    score: Math.min(100, score),
    reasons
  };
}

/**
 * Returns properties sorted by best match for a given lead
 */
export function getMatchingPropertiesForLead(lead: ResaleLead, properties: ResaleProperty[]): MatchScore[] {
  return properties
    .filter(p => p.status === 'available' || p.status === 'under_discussion')
    .map(p => calculateMatchScore(lead, p))
    .filter(match => match.score >= 30)
    .sort((a, b) => b.score - a.score);
}

/**
 * Returns leads sorted by best match for a given property
 */
export function getMatchingLeadsForProperty(property: ResaleProperty, leads: ResaleLead[]): { lead: ResaleLead; score: number; reasons: string[] }[] {
  return leads
    .filter(l => l.stage !== 'closed' && l.stage !== 'lost')
    .map(l => {
      const match = calculateMatchScore(l, property);
      return {
        lead: l,
        score: match.score,
        reasons: match.reasons
      };
    })
    .filter(match => match.score >= 30)
    .sort((a, b) => b.score - a.score);
}

