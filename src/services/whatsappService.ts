import { supabaseDb } from '../lib/supabase';
import { generateWhatsAppLink } from '../utils/formatters';

export interface WhatsAppSession {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  instanceName: string;
  provider: 'evolution' | 'meta';
  phoneNumber: string | null;
  formattedPhone: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnectedAt: string | null;
  lastSeenAt: string | null;
  isOfficeMaster: boolean;
}

export interface WhatsAppMessageItem {
  id: string;
  provider: string;
  instanceName: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string | null;
  toNumber: string | null;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  pushName?: string | null;
  isGroup: boolean;
  messageTimestamp: string;
  leadId?: string | null;
  createdAt: string;
}

function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw.startsWith('+') ? raw : `+${digits}`;
}

/**
 * Fetch all WhatsApp sessions from public.whatsapp_sessions in Supabase,
 * matched with staff profiles.
 */
export async function fetchWhatsAppSessions(): Promise<{
  sessions: WhatsAppSession[];
  activeSession: WhatsAppSession | null;
  error?: string;
}> {
  if (!supabaseDb) {
    return { sessions: [], activeSession: null, error: 'Database not initialized' };
  }

  try {
    const [{ data: sessionRows, error: sErr }, { data: profiles, error: pErr }] = await Promise.all([
      supabaseDb
        .from('whatsapp_sessions')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabaseDb
        .from('profiles')
        .select('id, full_name, role, phone')
    ]);

    if (sErr) throw sErr;

    const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const sessions: WhatsAppSession[] = (sessionRows || []).map((row: any) => {
      const prof = profMap.get(row.agent_id);
      const isOffice = row.phone_number?.includes('8956040220') || row.agent_id === 'dbc71212-d38b-40cc-8df2-4a99828ff449';
      return {
        id: row.id,
        agentId: row.agent_id,
        agentName: isOffice ? 'Saraswati Nagri (Office Master)' : (prof?.full_name || 'Staff Line'),
        agentRole: isOffice ? 'Company Master Line' : (prof?.role || 'Sales Executive'),
        instanceName: row.instance_name,
        provider: row.provider || 'evolution',
        phoneNumber: row.phone_number,
        formattedPhone: formatPhoneDisplay(row.phone_number),
        status: (row.status || 'disconnected') as WhatsAppSession['status'],
        lastConnectedAt: row.last_connected_at,
        lastSeenAt: row.last_seen_at,
        isOfficeMaster: Boolean(isOffice),
      };
    });

    // Determine primary active session (Office Master Line preferred if connected, or first connected agent)
    const officeConnected = sessions.find((s) => s.isOfficeMaster && s.status === 'connected');
    const firstConnected = sessions.find((s) => s.status === 'connected');
    const activeSession = officeConnected || firstConnected || sessions[0] || null;

    return { sessions, activeSession };
  } catch (err: any) {
    console.error('Error fetching WhatsApp sessions:', err);
    return { sessions: [], activeSession: null, error: err.message };
  }
}

/**
 * Fetch WhatsApp conversation thread for a lead from public.whatsapp_messages
 */
export async function fetchLeadWhatsAppMessages(
  leadId: string,
  phone: string
): Promise<{ messages: WhatsAppMessageItem[]; error?: string }> {
  if (!supabaseDb) return { messages: [] };

  try {
    const digits = phone.replace(/\D/g, '');
    const phone10 = digits.slice(-10);

    let query = supabaseDb
      .from('whatsapp_messages')
      .select('*')
      .order('message_timestamp', { ascending: true })
      .limit(100);

    if (leadId && phone10) {
      query = query.or(`lead_id.eq.${leadId},chat_jid.ilike.%${phone10}%,from_number.ilike.%${phone10}%,to_number.ilike.%${phone10}%`);
    } else if (leadId) {
      query = query.eq('lead_id', leadId);
    } else if (phone10) {
      query = query.or(`chat_jid.ilike.%${phone10}%,from_number.ilike.%${phone10}%,to_number.ilike.%${phone10}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages: WhatsAppMessageItem[] = (data || []).map((row: any) => ({
      id: row.id,
      provider: row.provider || 'evolution',
      instanceName: row.instance_name || '',
      direction: (row.direction || 'outbound') as 'inbound' | 'outbound',
      fromNumber: row.from_number,
      toNumber: row.to_number,
      text: row.text || '',
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      pushName: row.push_name,
      isGroup: Boolean(row.is_group),
      messageTimestamp: row.message_timestamp || row.created_at,
      leadId: row.lead_id,
      createdAt: row.created_at,
    }));

    return { messages };
  } catch (err: any) {
    console.error('Error fetching lead WhatsApp messages:', err);
    return { messages: [], error: err.message };
  }
}

/**
 * Log and dispatch a WhatsApp message to a lead.
 * 1. Archives outbound message in public.whatsapp_messages
 * 2. Writes timeline entry in public.lead_interactions
 * 3. Updates lead last_contacted_at and bumps interaction_count
 * 4. Returns wa.me deep link for seamless handoff
 */
export async function sendLeadWhatsAppMessage(params: {
  leadId: string;
  phone: string;
  leadName: string;
  text: string;
  senderAgentId?: string;
  senderName?: string;
  instanceName?: string;
}): Promise<{
  success: boolean;
  waLink: string;
  error?: string;
}> {
  const { leadId, phone, text, senderAgentId, senderName, instanceName } = params;
  const digits = phone.replace(/\D/g, '');
  const phone10 = digits.slice(-10);
  const waLink = generateWhatsAppLink(phone, text);

  if (!supabaseDb) {
    return { success: true, waLink };
  }

  try {
    const now = new Date().toISOString();
    const effectiveInstance = instanceName || 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';
    const waMessageId = `RD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Insert into public.whatsapp_messages archive
    await supabaseDb.from('whatsapp_messages').insert({
      provider: 'evolution',
      instance_name: effectiveInstance,
      chat_jid: `91${phone10}@s.whatsapp.net`,
      wa_message_id: waMessageId,
      direction: 'outbound',
      from_number: '918956040220',
      to_number: `91${phone10}`,
      text: text.trim(),
      is_group: false,
      message_timestamp: now,
      lead_id: leadId || null,
      created_at: now,
    });

    // 2. Insert into public.lead_interactions
    await supabaseDb.from('lead_interactions').insert({
      lead_id: leadId,
      type: 'whatsapp',
      content: text.trim(),
      outcome: 'whatsapp_sent',
      created_by: senderAgentId || null,
      created_at: now,
    });

    // 3. Update public.leads
    const { data: leadRow } = await supabaseDb
      .from('leads')
      .select('interaction_count')
      .eq('id', leadId)
      .maybeSingle();

    const currentCount = Number(leadRow?.interaction_count || 0);
    await supabaseDb
      .from('leads')
      .update({
        last_contacted_at: now,
        interaction_count: currentCount + 1,
        updated_at: now,
      })
      .eq('id', leadId);

    return { success: true, waLink };
  } catch (err: any) {
    console.warn('WhatsApp database sync warning:', err);
    return { success: true, waLink, error: err.message };
  }
}
