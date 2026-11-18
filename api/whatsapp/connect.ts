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

  const { agentId, instanceName } = (req.method === 'POST' ? req.body : req.query) || {};
  const effectiveInstance = instanceName || (agentId ? `agent_${agentId}` : 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449');

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      // Return existing Supabase session status
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to connect instance' });
  }
}
