import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdrmbhbzlbudpfvqdjga.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    // Webhook health check / handshake
    return res.status(200).json({ status: 'ok', provider: 'evolution' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    const eventType = event.event || event.type;
    const instanceName = event.instance || event.instanceName || 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';

    // 1. Connection Update (QR scan, connection opened/closed)
    if (eventType === 'CONNECTION_UPDATE' || eventType === 'connection.update') {
      const state = event.data?.state || event.state;
      const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected';
      const now = new Date().toISOString();

      await supabase
        .from('whatsapp_sessions')
        .update({
          status,
          updated_at: now,
          ...(status === 'connected' ? { last_connected_at: now } : {}),
        })
        .eq('instance_name', instanceName);

      return res.status(200).json({ ok: true, handled: 'CONNECTION_UPDATE' });
    }

    // 2. Incoming Messages (MESSAGES_UPSERT)
    if (eventType === 'MESSAGES_UPSERT' || eventType === 'messages.upsert') {
      const data = event.data || event;
      const key = data.key || data.message?.key || {};
      const fromMe = Boolean(key.fromMe);

      // Only process incoming messages from clients (not our own outbound echoes)
      if (!fromMe) {
        const remoteJid = key.remoteJid || '';
        const digits = remoteJid.replace(/\D/g, '');
        const phone10 = digits.slice(-10);
        const text =
          data.message?.conversation ||
          data.message?.extendedTextMessage?.text ||
          data.message?.imageMessage?.caption ||
          '[Attachment]';
        const now = new Date().toISOString();

        // Find matching lead in Supabase by last 10 digits
        const { data: lead } = await supabase
          .from('leads')
          .select('id, name')
          .or(`phone.ilike.%${phone10}%,whatsapp.ilike.%${phone10}%`)
          .limit(1)
          .maybeSingle();

        // Archive into public.whatsapp_messages
        await supabase.from('whatsapp_messages').insert({
          provider: 'evolution',
          instance_name: instanceName,
          chat_jid: remoteJid,
          wa_message_id: key.id || `IN_${Date.now()}`,
          direction: 'inbound',
          from_number: digits,
          to_number: '918956040220',
          text,
          is_group: remoteJid.includes('@g.us'),
          message_timestamp: now,
          lead_id: lead?.id || null,
          created_at: now,
        });

        // Record interaction if lead exists
        if (lead?.id) {
          await supabase.from('lead_interactions').insert({
            lead_id: lead.id,
            type: 'whatsapp',
            content: text,
            outcome: 'whatsapp_received',
            created_at: now,
          });

          await supabase
            .from('leads')
            .update({
              last_contacted_at: now,
              updated_at: now,
            })
            .eq('id', lead.id);
        }
      }

      return res.status(200).json({ ok: true, handled: 'MESSAGES_UPSERT' });
    }

    return res.status(200).json({ ok: true, ignored: eventType });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return res.status(200).json({ ok: false, error: err.message }); // Always 200 so provider doesn't loop
  }
}
