import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdrmbhbzlbudpfvqdjga.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

const supabase = createClient(supabaseUrl, supabaseKey);

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || process.env.VITE_EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || '';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { leadId, phone, text, instanceName, senderAgentId } = req.body || {};

    if (!phone || !text) {
      return res.status(400).json({ error: 'Missing phone or message text' });
    }

    const digits = String(phone).replace(/\D/g, '');
    const phone10 = digits.slice(-10);
    const recipient = `91${phone10}`;
    const effectiveInstance = instanceName || 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449'; // Office master line

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
            text: String(text).trim(),
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
      text: String(text).trim(),
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
        content: String(text).trim(),
        outcome: deliverySuccess ? 'whatsapp_delivered' : 'whatsapp_sent',
        created_by: senderAgentId || 'a342167a-c988-49cc-b304-29aed3fc81b4',
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
  } catch (error: any) {
    console.error('API /api/whatsapp/send error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
