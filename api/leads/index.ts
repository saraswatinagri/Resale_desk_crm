import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://bdrmbhbzlbudpfvqdjga.supabase.co';

const supabaseKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

const supabase = createClient(supabaseUrl, supabaseKey);

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization'
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── POST: Website Enquiry Submission ─────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const {
        name,
        phone,
        email,
        propertyId,
        propertyName,
        locality,
        budget,
        budgetMin,
        budgetMax,
        message,
        source = 'Website',
        intent = 'Wants to Buy a Property (Resale)',
      } = body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Name and valid phone number are required',
        });
      }

      const digits = String(phone).replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid 10-digit mobile number',
        });
      }

      const now = new Date().toISOString();

      // Check if lead already exists for this phone in Saraswati Nagri
      const { data: existing } = await supabase
        .from('leads')
        .select('id, name, status')
        .eq('phone', digits)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Record new enquiry interaction on existing lead
        await supabase.from('lead_interactions').insert({
          lead_id: existing.id,
          type: 'note',
          content: `Website Enquiry received for ${propertyName || locality || 'Resale Property'}. Client Note: "${message || 'Interested in property details'}"`,
          outcome: 'Website Inquiry',
          created_at: now,
        });

        await supabase
          .from('leads')
          .update({
            last_contacted_at: now,
            updated_at: now,
          })
          .eq('id', existing.id);

        return res.status(200).json({
          success: true,
          message: 'Enquiry received. Our sales executive will contact you shortly.',
          leadId: existing.id,
          isExisting: true,
        });
      }

      // Create new lead in public.leads
      const leadPayload = {
        name: String(name).trim(),
        phone: digits,
        email: email ? String(email).trim().toLowerCase() : null,
        entity: 'Saraswati Nagri',
        source: source || 'Website',
        property_type: intent,
        plot_interest: propertyName || locality || 'Resale Property',
        location_preference: locality || 'Nagpur',
        budget_min: Number(budgetMin || 0),
        budget_max: Number(budgetMax || 0),
        status: 'New Inquiry',
        notes: message ? `Website Message: ${message}${propertyName ? ` | Property: ${propertyName}` : ''}` : `Website Enquiry for ${propertyName || locality || 'Resale'}`,
        created_at: now,
        updated_at: now,
      };

      const { data: newLead, error } = await supabase
        .from('leads')
        .insert(leadPayload)
        .select('id, name, phone, status')
        .single();

      if (error) {
        console.error('Lead insert error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // Record first interaction
      if (newLead?.id) {
        await supabase.from('lead_interactions').insert({
          lead_id: newLead.id,
          type: 'note',
          content: `New Website Lead registered: ${name} (${digits}) for ${propertyName || locality || 'Resale Desk'}. Note: "${message || 'None'}"`,
          outcome: 'New Website Inquiry',
          created_at: now,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Thank you! Your enquiry has been registered with Saraswati Nagri & Nagpur Properties CRM.',
        leadId: newLead?.id,
      });
    } catch (err: any) {
      console.error('API /api/leads error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal error' });
    }
  }

  // ── GET: Count or Health ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Resale Desk CRM Website Leads API',
      documentation: 'POST /api/leads with { name, phone, email, locality, message, propertyName }',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
