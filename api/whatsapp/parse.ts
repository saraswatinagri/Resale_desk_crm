import { parseWhatsAppPropertyMessage } from '../../src/utils/whatsappPropertyParser';
import { getAdminClient, requireStaff, safeEqual, sendError } from '../_lib/server';

/**
 * Reading a message (no save) is harmless and open.
 * SAVING a property + lead needs either a logged-in employee, or an automation
 * that sends the secret INGEST_API_KEY in an x-api-key header.
 */
async function requireWriter(req: any): Promise<void> {
  const expected = (process.env.INGEST_API_KEY || '').trim();
  const given = String(req.headers?.['x-api-key'] || '');
  if (expected.length >= 16 && safeEqual(given, expected)) return;
  await requireStaff(req);
}

export default async function handler(req: any, res: any) {
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

      if (!rawText || typeof rawText !== 'string' || !rawText.trim() || rawText.length > 8000) {
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

      if (shouldAutoSave) await requireWriter(req);
      const supabase = shouldAutoSave ? getAdminClient() : null;

      if (shouldAutoSave && supabase && parsed.confidenceScore >= 20) {
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
          is_verified: false, // auto-read from a message; staff verify it in the CRM
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
    } catch (err) {
      return sendError(res, err, 'api/whatsapp/parse');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
