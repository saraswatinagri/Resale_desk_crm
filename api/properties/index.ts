import { PUBLIC_PROPERTY_COLUMNS, safeSearchTerm, toPublicProperty } from '../_lib/public-property';
import { clip, getAdminClient, sendError, setPublicCors } from '../_lib/server';

// PUBLIC endpoints used by the website:
//   GET  — property feed (owner details are never included)
//   POST — "list my property" form (saved as UNVERIFIED until staff check it)

export default async function handler(req: any, res: any) {
  setPublicCors(res, 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── GET: Public Website Properties Feed ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const {
        category,
        locality,
        minPrice,
        maxPrice,
        bhk,
        status = 'available',
        limit = '50',
        offset = '0',
        search,
      } = req.query;

      const supabase = getAdminClient();
      const term = safeSearchTerm(search);
      const place = safeSearchTerm(locality);

      let query = supabase
        .from('resale_properties')
        .select(PUBLIC_PROPERTY_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (place && place !== 'all') {
        query = query.ilike('locality', `%${place}%`);
      }
      if (bhk && bhk !== 'all') {
        query = query.eq('bhk', bhk);
      }
      if (minPrice) {
        query = query.gte('price_numeric', Number(minPrice));
      }
      if (maxPrice) {
        query = query.lte('price_numeric', Number(maxPrice));
      }
      if (term) {
        query = query.or(`title.ilike.%${term}%,locality.ilike.%${term}%,address.ilike.%${term}%`);
      }

      const numLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const numOffset = Math.max(0, parseInt(String(offset), 10) || 0);
      query = query.range(numOffset, numOffset + numLimit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const rows = ((data || []) as unknown as Array<Record<string, unknown>>).map(toPublicProperty);
      return res.status(200).json({
        success: true,
        count: rows.length,
        total: count || rows.length,
        data: rows,
      });
    } catch (err) {
      return sendError(res, err, 'api/properties GET');
    }
  }

  // ── POST: Submit New Property (From Website Form or WhatsApp Ingest) ─────
  if (req.method === 'POST') {
    try {
      const supabase = getAdminClient();
      const body = req.body || {};
      const title = clip(body.title, 160);
      const category = clip(body.category, 30) || 'plot';
      const transactionType = body.transactionType === 'rent' ? 'rent' : 'resale';
      const locality = clip(body.locality, 80) || 'Besa';
      const corridor = clip(body.corridor, 80) || 'South Nagpur';
      const address = clip(body.address, 300);
      const areaSqFt = Number(body.areaSqFt) || 0;
      const priceNumeric = Number(body.priceNumeric) || 0;
      const price = clip(body.price, 60);
      const bhk = clip(body.bhk, 20);
      const facing = clip(body.facing, 20) || 'East';
      const furnishing = clip(body.furnishing, 30) || 'Semi-Furnished';
      const ownerName = clip(body.ownerName, 120) || 'Property Owner';
      const ownerPhone = clip(body.ownerPhone, 20);
      const description = clip(body.description, 2000);
      const images = Array.isArray(body.images)
        ? body.images.filter((u: unknown) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, 12)
        : [];
      const source = clip(body.source, 60) || 'Website Submission';
      const shortList = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => clip(x, 60)).slice(0, 20) : [];
      const amenities = shortList(body.amenities);
      const highlights = shortList(body.highlights);
      const legalStatus =
        body.legalStatus && typeof body.legalStatus === 'object' && !Array.isArray(body.legalStatus)
          ? body.legalStatus
          : {};

      if (!title || (!ownerPhone && !body.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Title and owner phone number are required to register a property',
        });
      }

      const cleanPhone = String(ownerPhone || body.phone).replace(/\D/g, '').slice(-10);
      const propertyCode = `NP-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      const propertyPayload = {
        property_code: propertyCode,
        title: String(title).trim(),
        transaction_type: transactionType,
        category,
        locality,
        corridor,
        address: address || `${locality}, Nagpur`,
        price: price || (priceNumeric ? `₹${(priceNumeric / 100000).toFixed(1)} Lakh` : 'Price on Request'),
        price_numeric: Number(priceNumeric || 0),
        area_sqft: Number(areaSqFt || 0),
        bhk: bhk || null,
        facing,
        furnishing,
        status: 'available',
        is_verified: false, // submitted by the public; staff verify it in the CRM
        legal_status: legalStatus, // the owner's own claims — unverified
        amenities,
        highlights,
        images: Array.isArray(images) && images.length > 0 ? images : [
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80'
        ],
        description: description || `Resale property in ${locality}, Nagpur.`,
        owner: {
          name: ownerName,
          phone: cleanPhone ? `+91 ${cleanPhone}` : '',
          negotiable: true,
        },
        created_at: now,
        updated_at: now,
      };

      // 1. Insert into resale_properties if table exists
      const { data: createdProp, error: propError } = await supabase
        .from('resale_properties')
        .insert(propertyPayload)
        .select('*')
        .maybeSingle();

      if (propError) throw propError;

      // 2. Also create an owner/seller lead in public.leads so agents see it in Resale Desk!
      let leadId: string | null = null;
      if (cleanPhone) {
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            name: ownerName,
            phone: cleanPhone,
            entity: 'Saraswati Nagri',
            source: source || 'Website Resale Form',
            property_type: 'Wants to Sell Their Property (House/Villa/Farm)',
            plot_interest: category === 'plot' ? 'Plot' : bhk || 'Residential',
            location_preference: locality,
            budget_min: Number(priceNumeric || 0),
            budget_max: Number(priceNumeric || 0),
            status: 'New Inquiry',
            notes: `[Auto-created from Website Property Listing: ${title} | ${propertyCode} | Demand: ${propertyPayload.price}]`,
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .maybeSingle();

        if (newLead?.id) {
          leadId = newLead.id;
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Property submitted. Our Resale Desk will verify it and contact you.',
        propertyCode,
        property: createdProp ? toPublicProperty(createdProp as Record<string, unknown>) : null,
      });
    } catch (err) {
      return sendError(res, err, 'api/properties POST');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
