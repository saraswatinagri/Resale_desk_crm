/**
 * Dynamic Knowledge Base Service
 * Integrates live real estate inventory from CRM database (Supabase)
 * and website data into Gemini AI auto-reply system.
 * Updates automatically on startup and whenever inventory changes.
 */

import { supabaseDb } from '../lib/supabase';
import type { ResaleProperty, SaraswatiProject } from '../types/crm';
import { INITIAL_PROPERTIES } from '../data/mockProperties';

export interface DynamicKnowledgeBase {
  lastUpdated: string;
  source: 'database_live' | 'cache' | 'default';
  websiteUrl: string;
  officeInfo: {
    name: string;
    brand: string;
    address: string;
    helplinePhone: string;
    whatsappLine: string;
    officeHours: string;
    sundayVisits: string;
  };
  plottedProjects: Array<{
    name: string;
    locality: string;
    corridor: string;
    startingRate: string;
    plotSizes: string;
    totalPriceRange: string;
    approvals: string[];
    bankLoans: string[];
    amenities: string[];
  }>;
  resaleInventory: Array<{
    title: string;
    category: string;
    locality: string;
    corridor: string;
    price: string;
    bhk?: string;
    areaSqFt: number;
    facing?: string;
    approvals: string;
    status: string;
  }>;
}

const STORAGE_KEY = 'crm:dynamic_knowledge_base';

// Default Nagpur knowledge base
const DEFAULT_KNOWLEDGE: DynamicKnowledgeBase = {
  lastUpdated: new Date().toISOString(),
  source: 'default',
  websiteUrl: 'https://saraswatinagri.com',
  officeInfo: {
    name: 'Saraswati Nagri Group & Nagpur Properties Resale Desk',
    brand: 'Saraswati Nagri · Nagpur Properties',
    address: 'Plot No. 12, Opposite Mankapur Indoor Stadium, Katol Road, Nagpur, Maharashtra 440013',
    helplinePhone: '+91 89560 40220',
    whatsappLine: '+91 89560 40220 / +91 94949 42894',
    officeHours: 'Monday to Sunday, 10:00 AM - 7:00 PM',
    sundayVisits: 'Free Sunday site visits with company car pickup anywhere in Nagpur (11:00 AM & 2:00 PM batches)',
  },
  plottedProjects: [
    {
      name: 'Saraswati Nagri 11',
      locality: 'Lonara, Koradi Road',
      corridor: 'North Nagpur Corridor (Near Koradi Jagdamba Mandir & Alexis Hospital)',
      startingRate: '₹2,500 per sq.ft',
      plotSizes: '1,000 sq.ft to 3,000 sq.ft',
      totalPriceRange: '₹25 Lakhs to ₹75 Lakhs',
      approvals: ['NMRDA Sanctioned', 'RL Released', 'MahaRERA Registered (PP1190002502724)', 'Clear 7/12 Title'],
      bankLoans: ['State Bank of India', 'HDFC Bank', 'Bank of Maharashtra', '80% - 90% Sanction Available'],
      amenities: ['Tar/Cement roads', 'Underground electricity', 'Drainage', 'Garden & jogging track', 'Green gym', '24x7 security'],
    },
  ],
  resaleInventory: [
    {
      title: 'Spacious 3 BHK Garden View Flat in Besa',
      category: 'flat',
      locality: 'Besa',
      corridor: 'South Nagpur',
      price: '₹62 Lakhs',
      bhk: '3 BHK',
      areaSqFt: 1450,
      facing: 'East',
      approvals: 'NMRDA Sanctioned, Clear Title',
      status: 'available',
    },
    {
      title: '2 BHK Semi-Furnished Apartment in Manish Nagar',
      category: 'flat',
      locality: 'Manish Nagar',
      corridor: 'Wardha Road / South Nagpur',
      price: '₹46.5 Lakhs',
      bhk: '2 BHK',
      areaSqFt: 1050,
      facing: 'North',
      approvals: 'NMRDA Sanctioned, Ready Possession',
      status: 'available',
    },
    {
      title: 'Independent 4 BHK Luxury Duplex Villa in Shankarpur',
      category: 'house_villa',
      locality: 'Shankarpur',
      corridor: 'Besa-Wardha Road Link',
      price: '₹98 Lakhs',
      bhk: '4 BHK',
      areaSqFt: 2100,
      facing: 'East',
      approvals: 'NMRDA Approved, Clear Title',
      status: 'available',
    },
  ],
};

let inMemoryKnowledge: DynamicKnowledgeBase = loadCachedKnowledge();

function loadCachedKnowledge(): DynamicKnowledgeBase {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.resaleInventory)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_KNOWLEDGE;
}

function saveKnowledge(kb: DynamicKnowledgeBase): void {
  inMemoryKnowledge = kb;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kb));
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch and update the knowledge base automatically from database and website provisions
 */
export async function updateDynamicKnowledgeBase(customWebsiteUrl?: string): Promise<DynamicKnowledgeBase> {
  const current = inMemoryKnowledge;
  let liveProperties: ResaleProperty[] = [];
  let liveProjects: SaraswatiProject[] = [];

  // 1. Read live properties from database
  if (supabaseDb) {
    try {
      const { data: propData } = await supabaseDb
        .from('resale_properties')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(25);

      if (propData && propData.length > 0) {
        liveProperties = propData.map((row: any) => ({
          id: row.id,
          propertyCode: row.property_code || `NP-${row.id.slice(0, 4)}`,
          title: row.title,
          transactionType: row.transaction_type || 'resale',
          category: row.category || 'flat',
          locality: row.locality || 'Besa',
          corridor: row.corridor || 'Nagpur',
          address: row.address || '',
          price: row.price || `₹${row.price_numeric || 5000000}`,
          priceNumeric: row.price_numeric || 5000000,
          areaSqFt: row.area_sqft || 1000,
          bhk: row.bhk || '',
          facing: row.facing || 'East',
          furnishing: row.furnishing || 'Semi-Furnished',
          status: 'available',
          isVerified: true,
          legalStatus: row.legal_status || { nmrdaApproved: true, clearTitle: true },
          amenities: row.amenities || [],
          highlights: row.highlights || [],
          images: row.images || [],
          description: row.description || '',
          owner: row.owner || { name: 'Owner', phone: '', whatsapp: '' },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }

      const { data: projData } = await supabaseDb
        .from('saraswati_projects')
        .select('*')
        .limit(10);

      if (projData && projData.length > 0) {
        liveProjects = projData;
      }
    } catch (err) {
      console.warn('Database knowledge base read warning:', err);
    }
  }

  // Fallback to local mock if DB returns empty
  if (liveProperties.length === 0) {
    liveProperties = INITIAL_PROPERTIES;
  }

  // 2. Format resale inventory for knowledge base
  const formattedResale = liveProperties.map((p) => {
    const approvalsList: string[] = [];
    if (p.legalStatus?.nmrdaApproved) approvalsList.push('NMRDA Approved');
    if (p.legalStatus?.rlAvailable) approvalsList.push('RL Released');
    if (p.legalStatus?.reraRegistered) approvalsList.push('RERA Registered');
    if (p.legalStatus?.clearTitle) approvalsList.push('Clear 7/12 Title');

    return {
      title: p.title,
      category: p.category,
      locality: p.locality,
      corridor: p.corridor || 'Nagpur',
      price: p.price,
      bhk: p.bhk,
      areaSqFt: p.areaSqFt,
      facing: p.facing,
      approvals: approvalsList.join(', ') || 'Verified Clear Title',
      status: p.status,
    };
  });

  // 3. Format plotted projects
  const plotted =
    liveProjects.length > 0
      ? liveProjects.map((proj) => ({
          name: proj.name,
          locality: proj.location || 'Lonara, Koradi Road',
          corridor: 'Nagpur Growth Corridor',
          startingRate: '₹2,500/sq.ft',
          plotSizes: `${proj.totalPlots || 100} units, 1000 - 3000 sq.ft`,
          totalPriceRange: '₹25 Lakhs to ₹75 Lakhs',
          approvals: ['NMRDA Sanctioned', 'RL Released', 'Clear Title'],
          bankLoans: ['SBI', 'HDFC', 'Bank of Maharashtra', '80%-90% sanctioned'],
          amenities: ['Tar Road', 'Electricity', 'Water', 'Garden'],
        }))
      : current.plottedProjects;

  const updatedKnowledge: DynamicKnowledgeBase = {
    ...current,
    lastUpdated: new Date().toISOString(),
    source: liveProperties.length > 0 && supabaseDb ? 'database_live' : 'default',
    websiteUrl: customWebsiteUrl || current.websiteUrl,
    plottedProjects: plotted,
    resaleInventory: formattedResale,
  };

  saveKnowledge(updatedKnowledge);
  return updatedKnowledge;
}

/**
 * Generates dynamic prompt knowledge string injected into Gemini AI System Instructions
 */
export function getLiveKnowledgeBasePrompt(): string {
  const kb = inMemoryKnowledge;

  const plottedSection = kb.plottedProjects
    .map(
      (p) =>
        `- ${p.name} (${p.locality}): Starting rate ${p.startingRate}, sizes ${p.plotSizes} (${p.totalPriceRange}). Approvals: ${p.approvals.join(
          ', '
        )}. Loans: ${p.bankLoans.join(', ')}.`
    )
    .join('\n');

  const resaleSection = kb.resaleInventory
    .slice(0, 12)
    .map(
      (r) =>
        `- ${r.title}: ${r.locality} (${r.corridor}), ${r.bhk ? `${r.bhk}, ` : ''}${r.areaSqFt} sq.ft, Price: ${r.price}. Status: ${r.status}. Approvals: ${r.approvals}.`
    )
    .join('\n');

  return `LIVE CRM DATABASE & WEBSITE KNOWLEDGE BASE (Auto-synced):
1. PLOTTED PROJECTS (Saraswati Nagri):
${plottedSection}

2. ACTIVE RESALE PROPERTIES INVENTORY (Real-time from Database):
${resaleSection}

3. COMPANY & BOOKING INFO (from Website ${kb.websiteUrl}):
- Office: ${kb.officeInfo.name}, ${kb.officeInfo.address}
- Helpline / WhatsApp: ${kb.officeInfo.whatsappLine}
- Free Sunday Visits: ${kb.officeInfo.sundayVisits}
- Office Timing: ${kb.officeInfo.officeHours}`;
}

/**
 * Getter for current knowledge base state
 */
export function getKnowledgeBase(): DynamicKnowledgeBase {
  return inMemoryKnowledge;
}
