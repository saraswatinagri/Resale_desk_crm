/**
 * Google Gemini AI Real Estate Assistant Service
 * Powers intelligent 24/7 WhatsApp auto-replies and draft generation for Saraswati Nagri & Resale Desk CRM.
 */

export interface GeminiReplyRequest {
  message: string;
  senderPhone?: string;
  senderName?: string;
  leadStage?: string;
  projectName?: string;
  recentHistory?: Array<{ sender: 'lead' | 'agent'; text: string }>;
  isSeller?: boolean;
}

export interface GeminiReplyResponse {
  replyText: string;
  intent: 'inquiry' | 'site_visit' | 'pricing' | 'property_listing' | 'complaint' | 'general';
  confidence: number;
  source: 'gemini_api' | 'fallback_template';
  modelUsed?: string;
}

const SYSTEM_INSTRUCTION = `You are "Riya", an expert AI Real Estate Sales Concierge for Saraswati Nagri 11 & Resale Desk Nagpur (Maharashtra, India).

YOUR IDENTITY & TONE:
- Name: Riya (Virtual Sales Assistant for Saraswati Nagri & Nagpur Resale Desk).
- Tone: Extremely polite, warm, helpful, energetic, and professional.
- Language: Natural Hinglish (Hindi + English mix) as spoken in Nagpur / Maharashtra. You may also reply in pure English or Marathi if the user asks in that language.
- Length: Keep responses concise (2 to 4 sentences maximum). WhatsApp users prefer fast, clear chats over long paragraphs.
- Rule: Always end with a warm open question or an inviting call-to-action (like asking their budget, preferred location, or booking a Sunday site visit).

KEY NAGPUR REAL ESTATE KNOWLEDGE (Use these facts only):
1. Plotted Layouts (Saraswati Nagri 11 & Lonara/Koradi):
   - Location: Lonara, Koradi Road, Nagpur (5 mins from Koradi Jagdamba Mandir, 10 mins from Alexis Hospital).
   - Approvals: NMRDA Sanctioned, RL Released, RERA Registered (PP1190002502724), Clear Title.
   - Amenities: Cement concrete roads, underground electricity & drainage, street lights, green gym, garden, jogging track, 24x7 security.
   - Rate: ₹2,500 per sq.ft.
   - Plot sizes: 1,000 sq.ft to 3,000 sq.ft. Total price ₹25 Lakhs to ₹75 Lakhs. Bank loan 80-90% sanctioned from SBI, HDFC, Bank of Maharashtra.
2. Resale Desk Inventory (Nagpur Corridors):
   - South Nagpur: Besa, Ghogli Road, Pipla, Manish Nagar, Somalwada, Beltarodi.
   - 2 BHK Flats: ₹42 Lakhs to ₹58 Lakhs.
   - 3 BHK Luxury Flats: ₹65 Lakhs to ₹85 Lakhs.
   - Independent Duplex Villas & Row Houses: ₹80 Lakhs to ₹1.40 Cr.
   - Wardha Road / MIHAN Corridor: Near Airport Metro, Khapri, Jamtha.
3. Office & Contact:
   - Saraswati Nagri Group Head Office, Nagpur.
   - Helpline / Master WhatsApp: +91 89560 40220 / +91 94949 42894.
   - Free Sunday Site Visits with company car pickup.

GUIDELINES FOR INCOMING MESSAGES:
1. Buyer asking for plots or rates:
   - Highlight Lonara / Besa NMRDA sanctioned plots with clear title.
   - Mention the starting rate of ₹2,500/sq.ft and loan availability.
   - Ask: "Aapka budget kitna hai aur kab tak plan kar rahe hain?"
2. Buyer asking for flats/apartments:
   - Mention verified 2 & 3 BHK flats available in Besa / Manish Nagar / Narendra Nagar.
   - Ask: "Aapko ready-to-move chahiye ya under-construction, aur kitna BHK dekh rahe hain?"
3. Seller / Broker posting a property listing:
   - Thank them: "Dhanyawad! Aapki property details humare Resale Desk inventory mein register ho rahi hain."
   - Confirm our team will verify title documents and connect with matching buyers.
4. Site visit inquiries:
   - Invite them: "Hum har Sunday ko free site visit organise karte hain office car pickup ke sath. Kya aap is Sunday morning 11 baje comfortable rahenge?"
5. General greetings ("Hi", "Hello", "Namaste"):
   - Greet warmly: "Namaste! 🙏 Main Saraswati Nagri Resale Desk se Riya hoon. Aap Nagpur mein residential plot ya flat dekh rahe hain, ya apni property sell karni hai?"`;

/**
 * Retrieve Gemini API Key from environment, window globals, or browser localStorage
 */
export function getGeminiApiKey(): string {
  // 1. Browser LocalStorage (set via CRM settings or WhatsApp Gateway modal)
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = window.localStorage.getItem('crm:gemini_api_key') || window.localStorage.getItem('GEMINI_API_KEY');
    if (local && local.trim()) return local.trim();
  }

  // 2. Vite import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
      const viteKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (viteKey && viteKey.trim() && !viteKey.includes('your_gemini')) return viteKey.trim();
    }
  } catch {
    // ignore
  }

  // 3. Node process.env (Vercel Serverless / Node Webhook)
  if (typeof process !== 'undefined') {
    const procKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (procKey && procKey.trim() && !procKey.includes('your_gemini')) return procKey.trim();
  }

  // 4. Injected Window globals
  if (typeof window !== 'undefined' && (window as any).__ENV__?.GEMINI_API_KEY) {
    const winKey = (window as any).__ENV__.GEMINI_API_KEY;
    if (winKey && winKey.trim()) return winKey.trim();
  }

  return '';
}

/**
 * Save user-entered Gemini API key into localStorage
 */
export function saveGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (key && key.trim()) {
      window.localStorage.setItem('crm:gemini_api_key', key.trim());
    } else {
      window.localStorage.removeItem('crm:gemini_api_key');
    }
  }
}

/**
 * Remove saved Gemini API key from localStorage
 */
export function clearGeminiApiKey(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('crm:gemini_api_key');
    window.localStorage.removeItem('GEMINI_API_KEY');
  }
}

/**
 * Call Google Gemini REST API with fast GA models
 */
async function callGeminiApi(prompt: string, apiKey: string): Promise<string | null> {
  // Support Gemini 2.0 Flash, 1.5 Flash, and 1.5 Pro (official GA v1beta endpoints)
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 350,
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch {
      // Try next model if any network or quota issue
      continue;
    }
  }

  return null;
}

/**
 * Test connectivity with a given or saved Gemini API Key
 */
export async function testGeminiKey(testKey?: string): Promise<{ success: boolean; modelUsed?: string; message: string }> {
  const keyToUse = (testKey || getGeminiApiKey()).trim();
  if (!keyToUse) {
    return {
      success: false,
      message: 'No Gemini API key found. Please provide an API key.',
    };
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Respond with exactly "OK" if online.' }] }],
            generationConfig: { maxOutputTokens: 10 }
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return {
          success: true,
          modelUsed: model,
          message: text ? `Connected successfully (${model}): "${text}"` : `Connected successfully using ${model}`,
        };
      } else {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        if (model === models[models.length - 1]) {
          return { success: false, message: `Gemini API Error: ${errMsg}` };
        }
      }
    } catch (err: any) {
      if (model === models[models.length - 1]) {
        return { success: false, message: `Network error connecting to Gemini API: ${err.message || 'Failed to fetch'}` };
      }
    }
  }

  return { success: false, message: 'Could not connect to Gemini API.' };
}

/**
 * Extract structured property details from an unstructured WhatsApp message using Gemini AI
 */
export async function extractPropertyDetailsWithGemini(
  rawText: string,
  customApiKey?: string
): Promise<{
  title?: string;
  category?: 'flat' | 'plot' | 'house_villa' | 'commercial';
  transactionType?: 'resale' | 'rent';
  locality?: string;
  areaSqFt?: number;
  price?: string;
  priceNumeric?: number;
  ratePerSqFt?: number;
  bhk?: string;
  facing?: 'East' | 'North' | 'North-East' | 'West' | 'South';
  furnishing?: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';
  highlights?: string[];
  ownerName?: string;
  ownerPhone?: string;
} | null> {
  const apiKey = (customApiKey || getGeminiApiKey()).trim();
  if (!apiKey || !rawText || rawText.trim().length < 15) return null;

  const extractionPrompt = `You are an expert real estate data parser for Nagpur, Maharashtra.
Analyze the following unstructured WhatsApp message received from an owner or broker, and extract all property listing fields into pure JSON.

Message to parse:
"""
${rawText}
"""

Rules:
1. Return ONLY valid JSON with no markdown formatting or code fences.
2. Structure:
{
  "title": string, // e.g. "Spacious 3 BHK Flat in Besa" or "NMRDA 1500 sq.ft Plot in Lonara"
  "category": "flat" | "plot" | "house_villa" | "commercial",
  "transactionType": "resale" | "rent",
  "locality": string, // Nagpur locality e.g. Besa, Manish Nagar, Lonara, Koradi, Wardha Road, Hingna
  "areaSqFt": number, // total square feet (digits only)
  "price": string, // e.g. "₹55 Lakhs" or "₹25,000 / month"
  "priceNumeric": number, // numeric in rupees e.g. 5500000
  "ratePerSqFt": number | null,
  "bhk": string | null, // e.g. "2 BHK", "3 BHK", "Plot"
  "facing": "East" | "North" | "North-East" | "West" | "South" | null,
  "furnishing": "Unfurnished" | "Semi-Furnished" | "Fully Furnished" | null,
  "highlights": string[], // list of key features
  "ownerName": string | null,
  "ownerPhone": string | null
}`;

  try {
    const rawResult = await callGeminiApi(extractionPrompt, apiKey);
    if (!rawResult) return null;

    // Clean JSON code fences if Gemini included them
    const cleaned = rawResult
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.warn('Gemini property extraction parsing error:', err);
    return null;
  }
}

/**
 * Smart fallback template generator when Gemini API key is absent or unreachable
 */
function getSmartFallbackReply(req: GeminiReplyRequest): string {
  const lower = (req.message || '').toLowerCase();
  const name = req.senderName || 'Sir/Ma\'am';

  if (req.isSeller || lower.includes('sell') || lower.includes('demand') || lower.includes('carpet area') || lower.includes('sqft')) {
    return `Namaste ${name}! 🙏 Saraswati Nagri Resale Desk par aapki property listing receive ho gayi hai. Humari verification team details review karke verified buyers ke sath match karegi. Kya iske documents (RL/Sanction) ready hain?`;
  }

  if (lower.includes('plot') || lower.includes('land') || lower.includes('layout')) {
    return `Namaste ${name}! 🙏 Saraswati Nagri 11 (Lonara, Koradi Road) aur Besa mein NMRDA Sanctioned & RL Approved plots available hain starting ₹2,500/sq.ft se, full bank loan ke sath. Aapka budget kya hai aur kitne sq.ft ka plot dekh rahe hain?`;
  }

  if (lower.includes('flat') || lower.includes('apartment') || lower.includes('bhk')) {
    return `Namaste ${name}! 🙏 Manish Nagar aur Besa corridor mein ready-to-move 2 BHK & 3 BHK verified flats available hain (₹45L - ₹75L). Aapko immediate shifting ke liye chahiye ya investment ke liye?`;
  }

  if (lower.includes('visit') || lower.includes('sunday') || lower.includes('site') || lower.includes('dekhna')) {
    return `Namaste ${name}! 🙏 Hum har Sunday ko free site visit arrange karte hain AC car pickup ke sath. Kya aap is Sunday morning 11:00 AM ya afternoon 2:00 PM site visit ke liye comfortable hain?`;
  }

  if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('kitna')) {
    return `Namaste ${name}! Saraswati Nagri plotted layouts ₹2,500/sq.ft se start hote hain (1000 sq.ft plot ~ ₹25 Lakhs) with 14 amenities & RERA guarantee. Aur resale flats ₹45 Lakhs onwards hain. Aapka preferred location kaunsa hai?`;
  }

  return `Namaste ${name}! 🙏 Saraswati Nagri & Resale Desk Nagpur mein aapka swagat hai. Main Riya hoon. Aap Nagpur mein residential plot ya flat dekh rahe hain, ya koi property sell karni hai?`;
}

/**
 * Generate Real Estate WhatsApp Reply using Google Gemini AI
 */
export async function generateGeminiRealEstateReply(req: GeminiReplyRequest): Promise<GeminiReplyResponse> {
  const apiKey = getGeminiApiKey();

  // 1. Try real Gemini API if key is available
  if (apiKey) {
    try {
      const historyContext = req.recentHistory && req.recentHistory.length > 0
        ? `\nRECENT CONVERSATION HISTORY:\n${req.recentHistory.map(h => `${h.sender === 'agent' ? 'Riya' : 'Client'}: ${h.text}`).join('\n')}`
        : '';

      const userPrompt = `${SYSTEM_INSTRUCTION}

INCOMING WHATSAPP MESSAGE:
Sender Name: ${req.senderName || 'Client'}
Sender Phone: ${req.senderPhone || 'Unknown'}
Lead Stage: ${req.leadStage || 'New Inquiry'}
Project/Interest: ${req.projectName || 'Nagpur Real Estate'}
${historyContext}

Client's Latest Message: "${req.message}"

Please compose Riya's helpful, polite, and persuasive WhatsApp reply in 2-3 lines of natural Hinglish.`;

      const aiText = await callGeminiApi(userPrompt, apiKey);
      if (aiText) {
        return {
          replyText: aiText,
          intent: detectIntent(req.message),
          confidence: 95,
          source: 'gemini_api',
          modelUsed: 'gemini-flash',
        };
      }
    } catch (err) {
      console.warn('Gemini API call warning, falling back to smart template:', err);
    }
  }

  // 2. High-quality smart template fallback
  return {
    replyText: getSmartFallbackReply(req),
    intent: detectIntent(req.message),
    confidence: 85,
    source: 'fallback_template',
  };
}

function detectIntent(text: string): GeminiReplyResponse['intent'] {
  const lower = (text || '').toLowerCase();
  if (lower.includes('visit') || lower.includes('dekhna') || lower.includes('timing')) return 'site_visit';
  if (lower.includes('rate') || lower.includes('price') || lower.includes('cost') || lower.includes('kitna')) return 'pricing';
  if (lower.includes('sell') || lower.includes('bechna') || lower.includes('carpet') || lower.includes('sqft')) return 'property_listing';
  if (lower.includes('problem') || lower.includes('complain') || lower.includes('fraud')) return 'complaint';
  if (lower.includes('plot') || lower.includes('flat') || lower.includes('bhk') || lower.includes('villa')) return 'inquiry';
  return 'general';
}
