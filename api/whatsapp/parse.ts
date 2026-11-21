import { createClient } from '@supabase/supabase-js';
import { parseWhatsAppPropertyMessage } from '../../src/utils/whatsappPropertyParser';

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

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'WhatsApp Property Parser & Auto-Register API',
      usage:
        'POST /api/whatsapp/parse with { text: "Selling 1500 sqft plot in Besa..." } or { message: "...", autoSave: true }',
    });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const rawText =
        body.text ||
        body.message ||
        body.content ||
        (typeof body === 'string' ? body : '');

      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Text or message string is required in request body',
        });
      }

      const parsed = parseWhatsAppPropertyMessage(rawText);
      const shouldAutoSave = Boolean(
        body.autoSave || body.save || body.registerProperty || body.autoRegister
      );

      let savedProperty: any = null;
      let propertyCode: string | null = null;
      let leadId: string | null = null;

      if (shouldAutoSave && parsed.confidenceScore >= 20) {
        const fields = parsed.extractedFields;
        propertyCode = `NP-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date().toISOString();
        const title =
          fields.title ||
          `${fields.bhk || ''} ${fields.category === 'plot' ? 'Plot' : 'Property'} in ${
            fields.locality || 'Nagpur'
          }`.trim();

        const ownerPhone = (fields.ownerPhone || body.phone || '').replace(/\D/g, '').slice(-10);

        const propertyPayload = {
          property_code: propertyCode,
          title,
          transaction_type: fields.transactionType || 'resale',
          category: fields.category || 'flat',
          locality: fields.locality || 'Besa',
          corridor: fields.corridor || 'South Nagpur',
          address: fields.address || `${fields.locality || 'Besa'}, Nagpur`,
          price:
            fields.price ||
            (fields.priceNumeric
              ? `₹${(fields.priceNumeric / 100000).toFixed(1)} Lakh`
              : 'Price on Request'),
          price_numeric: fields.priceNumeric || 0,
          rate_per_sqft: fields.ratePerSqFt || null,
          area_sqft: fields.areaSqFt || 1000,
          carpet_area_sqft: fields.areaSqFt ? Math.round(fields.areaSqFt * 0.76) : null,
          bhk: fields.bhk || null,
          facing: fields.facing || 'East',
          furnishing: fields.furnishing || 'Semi-Furnished',
          status: 'available',
          is_verified: true,
          legal_status: fields.legalStatus || {
            nmrdaApproved: true,
            rlAvailable: true,
            reraRegistered: false,
            clearTitle: true,
            loanEligible: true,
            eligibleBanks: ['State Bank of India', 'HDFC Bank'],
          },
          amenities: ['Tar Road', 'Water Line', 'Security'],
          highlights: ['Auto-registered via WhatsApp API', `${fields.locality || 'Nagpur'} Location`],
          images: [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
          ],
          description: `Auto-registered via WhatsApp API:\n${rawText}`,
          owner: {
            name: fields.ownerName || body.name || 'Owner',
            phone: ownerPhone ? `+91 ${ownerPhone}` : '',
            whatsapp: ownerPhone ? `+91 ${ownerPhone}` : '',
            negotiable: true,
          },
          created_at: now,
          updated_at: now,
        };

        const { data: propData, error: propErr } = await supabase
          .from('resale_properties')
          .insert(propertyPayload)
          .select('*')
          .maybeSingle();

        savedProperty = propData || propertyPayload;

        // Auto-create/link owner lead in public.leads
        if (ownerPhone) {
          const { data: newLead } = await supabase
            .from('leads')
            .insert({
              name: fields.ownerName || body.name || `WhatsApp ${ownerPhone}`,
              phone: ownerPhone,
              whatsapp: ownerPhone,
              entity: 'Saraswati Nagri',
              source: 'WhatsApp',
              property_type: 'Wants to Sell Their Property (House/Villa/Farm)',
              plot_interest: title,
              location_preference: fields.locality || 'Nagpur',
              budget_min: fields.priceNumeric || 0,
              budget_max: fields.priceNumeric || 0,
              status: 'New Inquiry',
              notes: `[Auto-registered from WhatsApp message: ${propertyCode} - ${title}]`,
              created_at: now,
              updated_at: now,
            })
            .select('id')
            .maybeSingle();

          if (newLead?.id) {
            leadId = newLead.id;
          }
        }
      }

      return res.status(200).json({
        success: true,
        confidenceScore: parsed.confidenceScore,
        property: parsed.extractedFields,
        ...(shouldAutoSave
          ? {
              autoSaved: Boolean(savedProperty),
              propertyCode,
              savedProperty,
              associatedLeadId: leadId,
            }
          : {}),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Parser error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
