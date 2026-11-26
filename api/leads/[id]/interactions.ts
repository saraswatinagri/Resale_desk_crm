import { setCorsHeaders, supabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const leadId = String(req.query?.id || '');
  if (!leadId) {
    return res.status(400).json({ error: 'Missing lead id' });
  }

  const type = String(req.query?.type || 'whatsapp');
  const limit = Math.min(Number(req.query?.limit || 200), 500);

  const { data, error } = await supabaseAdmin
    .from('lead_interactions')
    .select('id, lead_id, type, content, direction, wa_message_id, wa_from, media_url, media_type, delivery_status, created_by, created_at, outcome')
    .eq('lead_id', leadId)
    .eq('type', type)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message, interactions: [] });
  }

  return res.status(200).json({ interactions: data || [] });
}
