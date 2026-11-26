import {
  EVOLUTION_API_KEY,
  EVOLUTION_API_URL,
  isEvolutionConfigured,
  isMetaConfigured,
  META_ACCESS_TOKEN,
  META_GRAPH_VERSION,
  META_PHONE_NUMBER_ID,
  setCorsHeaders,
  supabaseAdmin,
  WHATSAPP_PROVIDER,
} from '../_lib/supabaseAdmin';
import { e164India, last10, normalizeLeadPhone, RESALE_HEAD_PROFILE_ID } from '../../src/lib/whatsapp/phone';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 4096;

function generateWhatsAppLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}

async function sendEvolutionText(instanceName: string, to: string, text: string) {
  try {
    const evoRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: to,
        text: text.trim(),
      }),
    });
    const evoData = await evoRes.json().catch(() => null);
    if (!evoRes.ok) {
      return { ok: false as const, error: evoData?.message || evoData?.error || `HTTP ${evoRes.status}` };
    }
    return {
      ok: true as const,
      messageId: evoData?.key?.id || evoData?.message?.key?.id || evoData?.id || null,
    };
  } catch (err: any) {
    return { ok: false as const, error: err?.message || 'Network error reaching Evolution API' };
  }
}

async function sendMetaText(to: string, text: string) {
  try {
    const digits = to.replace(/\D/g, '').slice(-10);
    const recipient = `91${digits}`;
    const metaRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: text.trim() },
      }),
    });
    const metaData = await metaRes.json().catch(() => null);
    if (!metaRes.ok) {
      return { ok: false as const, error: metaData?.error?.message || `HTTP ${metaRes.status}` };
    }
    return {
      ok: true as const,
      messageId: metaData?.messages?.[0]?.id || null,
    };
  } catch (err: any) {
    return { ok: false as const, error: err?.message || 'Network error reaching Meta WhatsApp API' };
  }
}

async function archiveOutbound(params: {
  provider: string;
  instanceName: string;
  messageId: string;
  to: string;
  text: string;
  waFrom: string | null;
  leadId?: string | null;
}) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id')
      .eq('provider', params.provider)
      .eq('wa_message_id', params.messageId)
      .maybeSingle();
    if (existing) return;

    const recipient = e164India(params.to);
    await supabaseAdmin.from('whatsapp_messages').insert({
      provider: params.provider,
      instance_name: params.instanceName,
      chat_jid: `${recipient}@s.whatsapp.net`,
      wa_message_id: params.messageId,
      direction: 'outbound',
      from_number: params.waFrom,
      to_number: recipient,
      text: params.text,
      is_group: false,
      message_timestamp: new Date().toISOString(),
      lead_id: params.leadId || null,
    });
  } catch (err) {
    console.warn('[WhatsApp Archive Outbound] Warning:', err);
  }
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { leadId, phone, text, senderAgentId } = req.body || {};
    const trimmed = String(text || '').trim();

    if (!trimmed) {
      return res.status(400).json({ ok: false, error: 'Message text is required.' });
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ ok: false, error: `Message exceeds ${MAX_TEXT_LENGTH} characters.` });
    }

    let lead: { id: string; phone: string | null; whatsapp: string | null; assigned_to: string | null } | null = null;
    if (leadId && UUID_RE.test(String(leadId))) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, phone, whatsapp, assigned_to')
        .eq('id', leadId)
        .maybeSingle();
      lead = data;
      if (!lead) {
        return res.status(404).json({ ok: false, error: 'Lead not found.' });
      }
    }

    const toPhone = normalizeLeadPhone(lead?.whatsapp || lead?.phone || phone);
    if (!toPhone) {
      return res.status(400).json({ ok: false, error: 'This lead has no phone number on file.' });
    }

    const fallbackWaLink = generateWhatsAppLink(toPhone, trimmed);
    const ownerId =
      (lead?.assigned_to && UUID_RE.test(lead.assigned_to) ? lead.assigned_to : null) ||
      (senderAgentId && UUID_RE.test(String(senderAgentId)) ? String(senderAgentId) : null) ||
      RESALE_HEAD_PROFILE_ID;

    let delivered = false;
    let messageId = `RD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let instanceName = `agent_${ownerId}`;
    let waFrom: string | null = null;
    let providerName = WHATSAPP_PROVIDER || 'evolution';

    // 1. Meta WhatsApp Cloud API branch
    if (WHATSAPP_PROVIDER === 'meta' && isMetaConfigured()) {
      providerName = 'meta';
      const metaRes = await sendMetaText(toPhone, trimmed);
      if (metaRes.ok) {
        delivered = true;
        if (metaRes.messageId) messageId = metaRes.messageId;
      }
    } 
    // 2. Evolution API branch
    else if (isEvolutionConfigured()) {
      providerName = 'evolution';
      let { data: session } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('instance_name, status, phone_number, agent_id')
        .eq('agent_id', ownerId)
        .maybeSingle();

      if (!session || session.status !== 'connected') {
        const { data: anyConnected } = await supabaseAdmin
          .from('whatsapp_sessions')
          .select('instance_name, status, phone_number, agent_id')
          .eq('status', 'connected')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (anyConnected) {
          session = anyConnected;
        }
      }

      if (session && session.status === 'connected') {
        instanceName = session.instance_name || instanceName;
        waFrom = session.phone_number || null;
        const recipient = e164India(toPhone);
        const evoRes = await sendEvolutionText(instanceName, recipient, trimmed);
        if (evoRes.ok) {
          delivered = true;
          if (evoRes.messageId) messageId = evoRes.messageId;
        }
      }
    }

    // 3. Always archive the message in CRM Supabase tables so conversations are never lost
    const now = new Date().toISOString();
    await archiveOutbound({
      provider: providerName,
      instanceName,
      messageId,
      to: toPhone,
      text: trimmed,
      waFrom,
      leadId: lead?.id,
    });

    if (lead?.id) {
      await supabaseAdmin.from('lead_interactions').insert({
        lead_id: lead.id,
        type: 'whatsapp',
        content: trimmed,
        direction: 'outbound',
        wa_message_id: messageId,
        wa_from: waFrom,
        outcome: delivered ? 'whatsapp_delivered' : 'whatsapp_sent',
        created_by: ownerId,
        created_at: now,
        delivery_status: delivered ? 'delivered' : 'sent',
      });

      await supabaseAdmin
        .from('leads')
        .update({
          last_contacted_at: now,
          last_contact: now,
          updated_at: now,
        })
        .eq('id', lead.id);
    }

    // Return success:
    // If delivered via socket/Meta, delivered = true
    // If gateway not active, delivered = false with waLink for seamless handoff
    return res.status(200).json({
      ok: true,
      delivered,
      messageId,
      instanceName,
      from: waFrom ? last10(waFrom) : null,
      waLink: fallbackWaLink,
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/send error:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
}
