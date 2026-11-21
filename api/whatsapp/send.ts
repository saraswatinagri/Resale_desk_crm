import { HttpError, clip, getAdminClient, requireStaff, sendError } from '../_lib/server';

// Server-only gateway settings. Never read VITE_ variables here: those are public.
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const OFFICE_INSTANCE = 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';
const INSTANCE_NAME = /^agent_[0-9a-f-]{36}$/i;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Only a logged-in employee may send from the company WhatsApp line.
    const staff = await requireStaff(req);
    const supabase = getAdminClient();

    const { leadId, phone, instanceName } = req.body || {};
    const text = clip(req.body?.text, 4000);

    if (!phone || !text) {
      throw new HttpError(400, 'Missing phone or message text');
    }

    const digits = String(phone).replace(/\D/g, '');
    const phone10 = digits.slice(-10);
    if (phone10.length !== 10) throw new HttpError(400, 'Invalid phone number');
    const recipient = `91${phone10}`;
    const effectiveInstance = instanceName ? String(instanceName) : OFFICE_INSTANCE;
    if (!INSTANCE_NAME.test(effectiveInstance)) throw new HttpError(400, 'Invalid WhatsApp line');
    const senderAgentId = staff.id; // from the verified login, not from the browser

    let realMessageId: string | null = null;
    let deliverySuccess = false;
    let gatewayError: string | null = null;

    // 1. Attempt Real Evolution API dispatch if configured
    if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      try {
        const evoRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(effectiveInstance)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: recipient,
            text,
          }),
        });

        const evoData = await evoRes.json().catch(() => null);

        if (evoRes.ok && evoData) {
          deliverySuccess = true;
          realMessageId = evoData?.key?.id || evoData?.message?.key?.id || evoData?.id || null;
        } else {
          gatewayError = evoData?.message || evoData?.error || `HTTP ${evoRes.status}`;
        }
      } catch (err: any) {
        gatewayError = err?.message || 'Gateway network error';
      }
    }

    const now = new Date().toISOString();
    const finalMessageId = realMessageId || `RD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Archive to public.whatsapp_messages in Supabase
    await supabase.from('whatsapp_messages').insert({
      provider: 'evolution',
      instance_name: effectiveInstance,
      chat_jid: `${recipient}@s.whatsapp.net`,
      wa_message_id: finalMessageId,
      direction: 'outbound',
      from_number: '918956040220',
      to_number: recipient,
      text,
      is_group: false,
      message_timestamp: now,
      lead_id: leadId || null,
      created_at: now,
    });

    // 3. Log to public.lead_interactions in Supabase
    if (leadId) {
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        type: 'whatsapp',
        content: text,
        outcome: deliverySuccess ? 'whatsapp_delivered' : 'whatsapp_sent',
        created_by: senderAgentId,
        created_at: now,
      });

      // 4. Update last_contacted_at on lead
      const { data: leadRow } = await supabase
        .from('leads')
        .select('interaction_count')
        .eq('id', leadId)
        .maybeSingle();

      const currentCount = Number(leadRow?.interaction_count || 0);
      await supabase
        .from('leads')
        .update({
          last_contacted_at: now,
          interaction_count: currentCount + 1,
          updated_at: now,
        })
        .eq('id', leadId);
    }

    return res.status(200).json({
      ok: true,
      delivered: deliverySuccess,
      messageId: finalMessageId,
      gatewayError,
      waLink: `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`,
    });
  } catch (error) {
    return sendError(res, error, 'api/whatsapp/send');
  }
}
