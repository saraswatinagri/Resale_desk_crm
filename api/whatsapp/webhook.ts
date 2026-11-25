import { createClient } from '@supabase/supabase-js';
import { parseWhatsAppPropertyMessage } from '../../src/utils/whatsappPropertyParser';
import { generateGeminiRealEstateReply, extractPropertyDetailsWithGemini } from '../../src/services/geminiService';

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

const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL ||
  process.env.VITE_EVOLUTION_API_URL ||
  ''
).replace(/\/+$/, '');
const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || '';

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization'
  );
}

// Unwraps nested Evolution / WhatsApp Web payloads defensively
function unwrapMessage(msg: any): { text: string; mediaType?: string; mediaUrl?: string } {
  if (!msg) return { text: '' };

  const inner =
    msg.ephemeralMessage?.message ||
    msg.viewOnceMessage?.message ||
    msg.viewOnceMessageV2?.message ||
    msg.documentWithCaptionMessage?.message ||
    msg;

  const text =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    '';

  let mediaType: string | undefined;
  let mediaUrl: string | undefined;

  if (inner.imageMessage) {
    mediaType = 'image';
    mediaUrl = inner.imageMessage.url || inner.mediaUrl;
  } else if (inner.videoMessage) {
    mediaType = 'video';
    mediaUrl = inner.videoMessage.url || inner.mediaUrl;
  } else if (inner.documentMessage) {
    mediaType = 'document';
    mediaUrl = inner.documentMessage.url || inner.mediaUrl;
  } else if (inner.audioMessage) {
    mediaType = 'audio';
    mediaUrl = inner.audioMessage.url || inner.mediaUrl;
  }

  return { text: String(text || '').trim(), mediaType, mediaUrl };
}

// Helper to send WhatsApp reply via Evolution API gateway
async function sendWhatsAppReply(instanceName: string, recipientNumber: string, text: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !recipientNumber || !text) return null;

  try {
    const evoRes = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: recipientNumber,
          text: text.trim(),
        }),
      }
    );

    if (evoRes.ok) {
      const evoData = await evoRes.json().catch(() => null);
      return evoData?.key?.id || evoData?.message?.key?.id || evoData?.id || 'SENT';
    }
  } catch (err) {
    console.warn('Webhook auto-reply send warning:', err);
  }
  return null;
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Health check / webhook handshake
    return res.status(200).json({
      status: 'active',
      service: 'Nagpur Properties & Saraswati Nagri Resale WhatsApp Webhook',
      provider: 'evolution',
      connectedAt: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const eventType = String(body.event || body.type || '').toLowerCase().replace(/_/g, '.');
    const instanceName =
      body.instance || body.instanceName || 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';
    const now = new Date().toISOString();

    // ── 1. Connection Update (QR Scan / Handset connect / drop) ───────────────
    if (eventType === 'connection.update' || eventType === 'connection_update') {
      const state = body.data?.state || body.state;
      const status =
        state === 'open'
          ? 'connected'
          : state === 'connecting' || state === 'qr'
          ? 'connecting'
          : 'disconnected';

      await supabase
        .from('whatsapp_sessions')
        .update({
          status,
          updated_at: now,
          last_seen_at: now,
          ...(status === 'connected' ? { last_connected_at: now } : {}),
        })
        .eq('instance_name', instanceName);

      return res.status(200).json({ ok: true, handled: 'connection.update', status });
    }

    // ── 2. Message Upsert (Inbound WhatsApp Messages & Property Automation) ───
    if (eventType === 'messages.upsert' || eventType === 'messages_upsert') {
      const rawData = body.data;
      const items: any[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.messages)
        ? rawData.messages
        : rawData
        ? [rawData]
        : [];

      let processedCount = 0;
      let propertiesRegistered = 0;

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const key = item.key || item.message?.key || {};
        const fromMe = Boolean(key.fromMe);
        const remoteJid = String(key.remoteJid || item.from || '');

        // Skip status updates and outbound echoes
        if (!remoteJid || remoteJid.includes('@broadcast') || fromMe) {
          continue;
        }

        const isGroup = remoteJid.endsWith('@g.us');
        const digits = remoteJid.replace(/\D/g, '');
        const phone10 = digits.slice(-10);

        if (phone10.length < 10) continue;

        const { text, mediaType, mediaUrl } = unwrapMessage(item.message || item);
        const pushName = item.pushName || item.verifiedName || '';

        // Filter group spam unless it explicitly mentions property or resale
        if (
          isGroup &&
          !text.toLowerCase().includes('resale') &&
          !text.toLowerCase().includes('plot') &&
          !text.toLowerCase().includes('flat') &&
          !text.toLowerCase().includes('bhk') &&
          !text.toLowerCase().includes('time of visit')
        ) {
          continue;
        }

        const messageId = key.id || `IN_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        // A. Match existing lead or auto-create first-touch buyer/seller lead
        let { data: lead } = await supabase
          .from('leads')
          .select('id, name, status, assigned_to, interaction_count')
          .or(`phone.ilike.%${phone10}%,whatsapp.ilike.%${phone10}%`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lead) {
          const { data: createdLead } = await supabase
            .from('leads')
            .insert({
              name: pushName.trim() || `WhatsApp ${phone10}`,
              phone: phone10,
              whatsapp: phone10,
              entity: 'Saraswati Nagri',
              source: 'WhatsApp',
              status: 'New Inquiry',
              created_at: now,
              updated_at: now,
            })
            .select('id, name, status, assigned_to, interaction_count')
            .maybeSingle();
          lead = createdLead;
        }

        // B. Intelligent Property Parser: check if message contains resale property details
        const parsed = parseWhatsAppPropertyMessage(text);
        let fields = { ...parsed.extractedFields };
        let hasPropertyDetails =
          parsed.confidenceScore >= 20 &&
          (fields.locality ||
            fields.category ||
            fields.areaSqFt ||
            fields.priceNumeric);

        // Fallback to Gemini AI property extraction if regex had low confidence but text looks like real estate
        const lowerText = text.toLowerCase();
        const seemsLikePropertyPost =
          lowerText.includes('bhk') ||
          lowerText.includes('sqft') ||
          lowerText.includes('sq.ft') ||
          lowerText.includes('plot') ||
          lowerText.includes('flat') ||
          lowerText.includes('bechna') ||
          lowerText.includes('demand') ||
          lowerText.includes('resale') ||
          lowerText.includes('rate:');

        if (!hasPropertyDetails && seemsLikePropertyPost && text.length > 25) {
          try {
            const aiFields = await extractPropertyDetailsWithGemini(text);
            if (aiFields && (aiFields.locality || aiFields.areaSqFt || aiFields.price || aiFields.priceNumeric)) {
              fields = {
                ...fields,
                ...aiFields,
                category: aiFields.category || fields.category,
                transactionType: aiFields.transactionType || fields.transactionType,
              };
              hasPropertyDetails = true;
            }
          } catch (geminiExtractErr) {
            console.warn('Gemini property extraction error:', geminiExtractErr);
          }
        }

        let registeredCode: string | null = null;
        let registeredTitle: string | null = null;

        if (hasPropertyDetails) {
          registeredCode = `NP-${Math.floor(1000 + Math.random() * 9000)}`;
          registeredTitle =
            fields.title ||
            `${fields.bhk || ''} ${fields.category === 'plot' ? 'Plot' : 'Property'} in ${
              fields.locality || 'Nagpur'
            }`.trim();

          const propertyPayload = {
            property_code: registeredCode,
            title: registeredTitle,
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
            amenities: ['Tar Road', 'Water Line', 'Street Light', '24x7 Security'],
            highlights: ['Verified Resale Listing', `${fields.locality || 'Nagpur'} Prime Growth Corridor`],
            images: [
              'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
            ],
            description: `Auto-registered from WhatsApp message by ${
              fields.ownerName || pushName || 'Owner'
            } (+91 ${phone10}):\n${text}`,
            owner: {
              name: fields.ownerName || pushName || lead?.name || 'Owner',
              phone: fields.ownerPhone || phone10,
              whatsapp: phone10,
              negotiable: true,
            },
            created_at: now,
            updated_at: now,
          };

          // Post property directly into public.resale_properties
          const { error: propErr } = await supabase
            .from('resale_properties')
            .insert(propertyPayload);

          if (!propErr) {
            propertiesRegistered++;

            // Update lead as Seller in public.leads
            if (lead?.id) {
              await supabase
                .from('leads')
                .update({
                  property_type: 'Wants to Sell Their Property (House/Villa/Farm)',
                  plot_interest: registeredTitle,
                  location_preference: fields.locality || 'Nagpur',
                  budget_min: fields.priceNumeric || 0,
                  budget_max: fields.priceNumeric || 0,
                  notes: `[Auto-registered Property Listing: ${registeredCode} - ${registeredTitle}]`,
                  updated_at: now,
                })
                .eq('id', lead.id);
            }

            // Automated Confirmation Auto-Reply
            const confirmationReply = `नमस्ते ${
              fields.ownerName || pushName || lead?.name || 'जी'
            }! 🙏\n\nआपकी प्रॉपर्टी *नागपुर प्रॉपर्टीज / सरस्वती नगरी रिसेल डेस्क* पर सफलतापूर्वक रजिस्टर हो गई है!\n\n📋 *प्रॉपर्टी कोड:* ${registeredCode}\n🏡 *प्रॉपर्टी:* ${registeredTitle}\n📍 *लोकेशन:* ${
              fields.locality || 'नागपुर'
            }\n${fields.areaSqFt ? `📏 *एरिया:* ${fields.areaSqFt} sq.ft\n` : ''}${
              fields.price ? `💰 *डिमांड:* ${fields.price}\n` : ''
            }\nहमारे रिसेल एग्जीक्यूटिव जल्द ही आपसे संपर्क कर वेरिफिकेशन व बायर मैचिंग शुरू करेंगे।\n\n- सरस्वती नगरी & नागपुर प्रॉपर्टीज रिसेल डेस्क\n📞 ऑफिस हेल्पलाइन: +91 89560 40220`;

            const replyId = await sendWhatsAppReply(instanceName, `91${phone10}`, confirmationReply);

            // Archive the automated outbound reply
            await supabase.from('whatsapp_messages').insert({
              provider: 'evolution',
              instance_name: instanceName,
              chat_jid: remoteJid,
              wa_message_id: replyId || `REPLY_${Date.now()}`,
              direction: 'outbound',
              from_number: '918956040220',
              to_number: `91${phone10}`,
              text: confirmationReply,
              is_group: false,
              message_timestamp: now,
              lead_id: lead?.id || null,
              created_at: now,
            });
          }
        }

        // C. Archive inbound message in public.whatsapp_messages
        await supabase.from('whatsapp_messages').insert({
          provider: 'evolution',
          instance_name: instanceName,
          chat_jid: remoteJid,
          wa_message_id: messageId,
          direction: 'inbound',
          from_number: digits,
          to_number: '918956040220',
          text: text || (mediaType ? `[Attachment: ${mediaType}]` : '[Message]'),
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          push_name: pushName || null,
          is_group: isGroup,
          message_timestamp: now,
          lead_id: lead?.id || null,
          created_at: now,
        });

        // D. Log timeline event in public.lead_interactions
        if (lead?.id) {
          await supabase.from('lead_interactions').insert({
            lead_id: lead.id,
            type: 'whatsapp',
            content: text,
            outcome: hasPropertyDetails
              ? 'whatsapp_property_registered'
              : 'whatsapp_received',
            created_at: now,
          });

          const currentCount = Number(lead.interaction_count || 0);
          await supabase
            .from('leads')
            .update({
              last_contacted_at: now,
              interaction_count: currentCount + 1,
              updated_at: now,
            })
            .eq('id', lead.id);
        }

        // E. Gemini AI 24/7 Concierge Auto-Reply for buyer inquiries & questions
        if (!hasPropertyDetails && !isGroup && text && text.trim().length > 1) {
          try {
            const aiReply = await generateGeminiRealEstateReply({
              message: text,
              senderName: pushName || lead?.name,
              senderPhone: phone10,
              leadStage: lead?.status,
              isSeller: false,
            });

            if (aiReply && aiReply.replyText) {
              const replyId = await sendWhatsAppReply(instanceName, `91${phone10}`, aiReply.replyText);

              // Archive outbound AI response
              await supabase.from('whatsapp_messages').insert({
                provider: 'evolution',
                instance_name: instanceName,
                chat_jid: remoteJid,
                wa_message_id: replyId || `AI_${Date.now()}`,
                direction: 'outbound',
                from_number: '918956040220',
                to_number: `91${phone10}`,
                text: aiReply.replyText,
                is_group: false,
                message_timestamp: new Date().toISOString(),
                lead_id: lead?.id || null,
                created_at: new Date().toISOString(),
              });

              // Log AI reply in timeline
              if (lead?.id) {
                await supabase.from('lead_interactions').insert({
                  lead_id: lead.id,
                  type: 'whatsapp',
                  content: aiReply.replyText,
                  outcome: 'whatsapp_ai_reply',
                  created_at: new Date().toISOString(),
                });
              }
            }
          } catch (aiErr) {
            console.warn('Gemini AI auto-reply error:', aiErr);
          }
        }

        processedCount++;
      }

      // Touch session to record activity heartbeat
      await supabase
        .from('whatsapp_sessions')
        .update({
          last_seen_at: now,
          status: 'connected',
          updated_at: now,
        })
        .eq('instance_name', instanceName);

      return res.status(200).json({
        ok: true,
        handled: 'messages.upsert',
        processedCount,
        propertiesRegistered,
      });
    }

    // Default 200 for all other webhook events so provider doesn't retry
    return res.status(200).json({ ok: true, ignored: eventType });
  } catch (err: any) {
    console.error('Webhook processing exception:', err);
    // Always return 200 so WhatsApp gateway doesn't get stuck in retry loops
    return res.status(200).json({ ok: false, error: err.message || 'Webhook processing exception' });
  }
}
