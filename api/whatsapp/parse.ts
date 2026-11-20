import { parseWhatsAppPropertyMessage } from '../../src/utils/whatsappPropertyParser';

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization'
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'WhatsApp Property Parser API',
      usage: 'POST /api/whatsapp/parse with { text: "Selling 1500 sqft plot in Besa..." }',
    });
  }

  if (req.method === 'POST') {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, error: 'Text body is required' });
      }

      const parsed = parseWhatsAppPropertyMessage(text);
      return res.status(200).json({
        success: true,
        confidenceScore: parsed.confidenceScore,
        property: parsed.extractedFields,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Parser error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
