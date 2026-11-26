import { EVOLUTION_API_KEY, EVOLUTION_API_URL, isEvolutionConfigured, setCorsHeaders, supabaseAdmin } from '../_lib/supabaseAdmin';
import { RESALE_HEAD_PROFILE_ID } from '../../src/lib/whatsapp/phone';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const agentId = String(req.query?.agentId || RESALE_HEAD_PROFILE_ID);
  const configured = isEvolutionConfigured();

  const { data: session } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('instance_name, status, phone_number, agent_id')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (!session) {
    return res.status(200).json({
      configured,
      connected: false,
      status: 'disconnected',
      provider: 'evolution',
      supportsPerAgentInstances: true,
      agentId,
    });
  }

  let status = session.status || 'disconnected';
  let phoneNumber = session.phone_number || null;
  let stale = false;

  if (configured && session.instance_name) {
    try {
      const evoRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(session.instance_name)}`,
        {
          method: 'GET',
          headers: { apikey: EVOLUTION_API_KEY },
        }
      );
      const live = await evoRes.json().catch(() => null);
      const state = String(live?.state || live?.instance?.state || '').toLowerCase();
      if (state === 'open') status = 'connected';
      else if (state === 'connecting' || state === 'qr') status = 'connecting';
      else if (state) status = 'disconnected';
      if (live?.instance?.owner || live?.owner) {
        phoneNumber = String(live.instance?.owner || live.owner);
      }
    } catch {
      stale = true;
    }
  }

  if (!stale) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        status,
        last_seen_at: now,
        updated_at: now,
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        ...(status === 'connected' && session.status !== 'connected' ? { last_connected_at: now } : {}),
      })
      .eq('agent_id', agentId);
  }

  return res.status(200).json({
    configured,
    connected: status === 'connected',
    status,
    phoneNumber,
    instanceName: session.instance_name,
    provider: 'evolution',
    supportsPerAgentInstances: true,
    agentId,
    stale,
  });
}
