import { EVOLUTION_API_KEY, EVOLUTION_API_URL, isEvolutionConfigured, setCorsHeaders, supabaseAdmin } from '../_lib/supabaseAdmin';
import { e164India, last10, normalizeLeadPhone, RESALE_HEAD_PROFILE_ID } from '../../src/lib/whatsapp/phone';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 4096;

async function sendEvolutionText(instanceName: string, to: string, text: string) {
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
}

async function archiveOutbound(params: {
  instanceName: string;
  messageId: string;
  to: string;
  text: string;
  waFrom: string | null;
  leadId?: string | null;
}) {
  const { data: existing } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id')
    .eq('provider', 'evolution')
    .eq('instance_name', params.instanceName)
    .eq('wa_message_id', params.messageId)
    .maybeSingle();
  if (existing) return;

  const recipient = e164India(params.to);
  await supabaseAdmin.from('whatsapp_messages').insert({
    provider: 'evolution',
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

    if (!isEvolutionConfigured()) {
      return res.status(503).json({ ok: false, error: 'WhatsApp provider is not configured.' });
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

    const ownerId =
      (lead?.assigned_to && UUID_RE.test(lead.assigned_to) ? lead.assigned_to : null) ||
      (senderAgentId && UUID_RE.test(String(senderAgentId)) ? String(senderAgentId) : null) ||
      RESALE_HEAD_PROFILE_ID;

    let { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('instance_name, status, phone_number, agent_id')
      .eq('agent_id', ownerId)
      .maybeSingle();

    // Fallback: If no connected session found for specific agent, use any active connected company line
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

    if (!session || session.status !== 'connected') {
      return res.status(409).json({
        ok: false,
        error:
          'No connected WhatsApp session found. Please pair the WhatsApp gateway QR in the CRM or use the 1-click WhatsApp button.',
        needsConnect: true,
        ownerId,
      });
    }

    const instanceName = session.instance_name || `agent_${ownerId}`;
    const recipient = e164India(toPhone);
    const result = await sendEvolutionText(instanceName, recipient, trimmed);
    if (!result.ok) {
      return res.status(502).json({ ok: false, error: result.error || 'Failed to send message.' });
    }

    const now = new Date().toISOString();
    const messageId = result.messageId || `WA_${Date.now()}`;
    const waFrom = session.phone_number || null;

    await archiveOutbound({
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
        outcome: 'whatsapp_delivered',
        created_by: ownerId,
        created_at: now,
        delivery_status: 'sent',
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

    return res.status(200).json({
      ok: true,
      delivered: true,
      messageId,
      instanceName,
      from: last10(waFrom),
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/send error:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
}
