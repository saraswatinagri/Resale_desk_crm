import { RESALE_PROPERTY_TYPES } from '../../src/lib/resale';
import { clip, getAdminClient, sendError, setPublicCors } from '../_lib/server';

// PUBLIC endpoint: the website enquiry form posts here, so there is no login.
// It can only ADD an enquiry. It never returns anything about existing leads.

const THANK_YOU = 'Thank you! Your enquiry has been received. Our team will contact you shortly.';

export default async function handler(req: any, res: any) {
  setPublicCors(res, 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── POST: Website Enquiry Submission ─────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const supabase = getAdminClient();
      const body = req.body || {};
      const name = clip(body.name, 120);
      const phone = clip(body.phone, 20);
      const email = clip(body.email, 160);
      const propertyName = clip(body.propertyName, 160);
      const locality = clip(body.locality, 120);
      const message = clip(body.message, 1000);
      const budgetMin = Number(body.budgetMin) || 0;
      const budgetMax = Number(body.budgetMax) || 0;
      const source = clip(body.source, 60) || 'Website';
      // Only the known resale intents; anything else falls back to "wants to buy".
      const intent = (RESALE_PROPERTY_TYPES as readonly string[]).includes(body.intent)
        ? String(body.intent)
        : 'Wants to Buy a Property (Resale)';

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

        return res.status(200).json({ success: true, message: THANK_YOU });
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
        budget_min: budgetMin,
        budget_max: budgetMax,
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

      if (error) throw error;

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

      return res.status(200).json({ success: true, message: THANK_YOU });
    } catch (err) {
      return sendError(res, err, 'api/leads');
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
