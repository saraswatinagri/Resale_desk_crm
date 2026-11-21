import { HttpError, getAdminClient, requireStaff, sendError } from '../_lib/server';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const OFFICE_INSTANCE = 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';
const INSTANCE_NAME = /^agent_[0-9a-f-]{36}$/i;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // A pairing QR lets whoever scans it take over the company WhatsApp line,
    // so only a logged-in employee may ask for one.
    await requireStaff(req);
    const supabase = getAdminClient();

    const { agentId, instanceName } = (req.method === 'POST' ? req.body : req.query) || {};
    const effectiveInstance = String(instanceName || (agentId ? `agent_${agentId}` : OFFICE_INSTANCE));
    if (!INSTANCE_NAME.test(effectiveInstance)) throw new HttpError(400, 'Invalid WhatsApp line');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      // Return existing Supabase session status
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('id, agent_id, instance_name, provider, phone_number, status, last_connected_at, last_seen_at')
        .eq('instance_name', effectiveInstance)
        .maybeSingle();

      return res.status(200).json({
        ok: true,
        configured: false,
        message: 'Evolution API server not configured in env. Using Supabase sessions.',
        session: session || null,
      });
    }

    // Call Evolution API connect to get QR code
    const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(effectiveInstance)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
    });

    const evoData = await evoRes.json().catch(() => null);

    return res.status(200).json({
      ok: true,
      configured: true,
      instanceName: effectiveInstance,
      qrCode: evoData?.base64 || evoData?.qrcode?.base64 || evoData?.code || null,
      pairingCode: evoData?.pairingCode || null,
      state: evoData?.state || (evoRes.ok ? 'connecting' : 'disconnected'),
    });
  } catch (err) {
    return sendError(res, err, 'api/whatsapp/connect');
  }
}
