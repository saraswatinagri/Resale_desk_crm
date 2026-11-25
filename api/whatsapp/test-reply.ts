import { generateGeminiRealEstateReply, getGeminiApiKey } from '../../src/services/geminiService';

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryMessage = req.query?.message || req.query?.text || req.query?.q;
  const bodyMessage = req.body?.message || req.body?.text;
  const message = String(
    queryMessage || bodyMessage || 'Namaste, Saraswati Nagri 11 Lonara me plot rate kya hai?'
  ).trim();

  const apiKey = req.query?.key || req.body?.key || getGeminiApiKey();

  try {
    const aiResponse = await generateGeminiRealEstateReply({
      message,
      senderName: req.query?.name || req.body?.name || 'Nagpur Client',
      senderPhone: '9876543210',
      leadStage: 'New Inquiry',
      projectName: 'Saraswati Nagri 11 / Besa Corridors',
    });

    return res.status(200).json({
      ok: true,
      service: 'Saraswati Nagri & Resale Desk WhatsApp Backend Auto-Reply',
      hasApiKeyConfigured: Boolean(apiKey),
      incomingClientMessage: message,
      autoReplySentToClient: aiResponse.replyText,
      intentDetected: aiResponse.intent,
      confidenceScore: aiResponse.confidence,
      engine: aiResponse.source, // 'gemini_api' or 'fallback_template'
      model: aiResponse.modelUsed || 'smart_nagpur_template',
      timestamp: new Date().toISOString(),
      liveWhatsAppFlow: {
        step1: 'Client sends WhatsApp text to office line (+91 89560 40220)',
        step2: 'Evolution API webhook triggers POST /api/whatsapp/webhook',
        step3: 'Backend processes intent with Gemini AI Riya concierge',
        step4: 'Evolution API sends auto-reply back to client WhatsApp within 2-3s',
        step5: 'Full chat archived in Supabase public.whatsapp_messages & lead timeline'
      },
      howToTestAnyPrompt: 'Add ?message=Your+question to this URL in any browser'
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: 'Backend auto-reply processing exception',
      details: err.message,
    });
  }
}
