import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdrmbhbzlbudpfvqdjga.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

const supabase = createClient(supabaseUrl, supabaseKey);

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Read live resale properties from Supabase
    const { data: properties, error: propErr } = await supabase
      .from('resale_properties')
      .select('id, property_code, title, locality, corridor, price, price_numeric, area_sqft, bhk, category, status, legal_status')
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(30);

    // 2. Read plotted layout projects from Supabase
    const { data: projects, error: projErr } = await supabase
      .from('saraswati_projects')
      .select('*')
      .limit(10);

    const now = new Date().toISOString();

    const formattedInventory = (properties || []).map((p: any) => ({
      code: p.property_code || `NP-${p.id.slice(0, 4)}`,
      title: p.title,
      locality: p.locality,
      corridor: p.corridor || 'Nagpur',
      price: p.price,
      priceNumeric: p.price_numeric,
      areaSqFt: p.area_sqft,
      bhk: p.bhk,
      category: p.category,
      approvals: p.legal_status?.nmrdaApproved ? 'NMRDA Approved, Clear Title' : 'Clear Title',
    }));

    const formattedProjects = (projects || []).map((proj: any) => ({
      name: proj.name,
      locality: proj.locality,
      startingRate: `₹${proj.starting_rate_per_sqft || 2500}/sq.ft`,
      plotSizes: '1000 - 3000 sq.ft',
      priceRange: '₹25 Lakhs - ₹75 Lakhs',
      approvals: 'NMRDA Sanctioned, RL Released, RERA Registered',
    }));

    const knowledgePrompt = `LIVE CRM DATABASE & WEBSITE KNOWLEDGE BASE:
1. PLOTTED PROJECTS:
${formattedProjects.map((p: any) => `- ${p.name} (${p.locality}): Starting ${p.startingRate}, ${p.priceRange}. Approvals: ${p.approvals}`).join('\n') || '- Saraswati Nagri 11: Lonara, Koradi Road. Rate ₹2,500/sq.ft. NMRDA & RL Sanctioned.'}

2. ACTIVE RESALE INVENTORY (Available in Database):
${formattedInventory.map((i: any) => `- ${i.title}: ${i.locality}, ${i.bhk ? `${i.bhk}, ` : ''}${i.areaSqFt} sq.ft, ${i.price} (${i.approvals})`).join('\n') || '- Verified 2/3 BHK flats in Besa & Manish Nagar (₹45L - ₹85L)'}

3. COMPANY & OFFICE DETAILS:
- Saraswati Nagri & Resale Desk Head Office: Opposite Mankapur Stadium, Katol Road, Nagpur
- Official WhatsApp / Helpline: +91 89560 40220 / +91 94949 42894
- Free Sunday Site Visits with company car pickup at 11:00 AM & 2:00 PM`;

    return res.status(200).json({
      ok: true,
      lastSyncedAt: now,
      source: 'supabase_live_database',
      stats: {
        activePropertiesCount: formattedInventory.length,
        projectsCount: formattedProjects.length,
      },
      websiteUrl: 'https://saraswatinagri.com',
      inventory: formattedInventory,
      projects: formattedProjects,
      generatedPrompt: knowledgePrompt,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to sync knowledge base from database',
      details: err?.message,
    });
  }
}
