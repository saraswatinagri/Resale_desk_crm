import React, { useState } from 'react';
import {
  X,
  Code2,
  Globe,
  Copy,
  Check,
  Play,
  ArrowRight,
  Database,
  ShieldCheck,
  Send,
  Building2,
  FileText,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface WebsiteApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebsiteApiModal: React.FC<WebsiteApiModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'leads' | 'whatsapp' | 'tester'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Tester State
  const [testEndpoint, setTestEndpoint] = useState<'getProperties' | 'parseWhatsApp'>('getProperties');
  const [testQuery, setTestQuery] = useState('locality=Besa&limit=3');
  const [testRawWhatsApp, setTestRawWhatsApp] = useState(
    'URGENT SALE: 3 BHK Flat in Besa, Near Manish Nagar, 1350 sqft super builtup, East Facing, Fully Furnished, RL & NMRDA Approved, Clear Title, Price 62 Lakhs Negotiable. Owner: Ramesh Patel 9822334455'
  );
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (testEndpoint === 'getProperties') {
        const res = await fetch(`/api/properties?${testQuery}`);
        const data = await res.json();
        setTestResult(JSON.stringify(data, null, 2));
      } else {
        const res = await fetch('/api/whatsapp/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testRawWhatsApp }),
        });
        const data = await res.json();
        setTestResult(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message || 'Request failed' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Website &amp; CRM API Provisions</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Endpoints
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Connect Nagpur Properties / Saraswati Nagri public website directly to this CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-slate-50/80 overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'overview', label: 'Overview & Architecture', icon: Layers },
            { id: 'properties', label: '1. Properties Feed API', icon: Building2 },
            { id: 'leads', label: '2. Lead Ingestion API', icon: Send },
            { id: 'whatsapp', label: '3. WhatsApp Parser API', icon: MessageSquare },
            { id: 'tester', label: '⚡ Live API Tester', icon: Play },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-600 text-cyan-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Architecture Diagram */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-700 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
                    Integration Architecture
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    CORS Enabled · Zero-latency Serverless
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-white">Public Website</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      nagpurproperties.com / saraswatinagri.com
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300">
                      Frontend Next.js / HTML
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-4 relative">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-cyan-300">Resale CRM REST API</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Vercel Serverless `/api/*`
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300">
                      Auto-CORS &amp; Auth-ready
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                      <Database className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-emerald-300">Saraswati Nagri Supabase</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      `public.leads` &amp; `resale_properties`
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300">
                      15,874 Active Leads
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Endpoints Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4">Endpoint</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Target Website Feature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800">
                          GET
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">/api/properties</td>
                      <td className="py-3 px-4">Fetch verified resale properties with filter &amp; search</td>
                      <td className="py-3 px-4 font-semibold text-cyan-700">Property Listings &amp; Search Page</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800">
                          GET
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">/api/properties/:id</td>
                      <td className="py-3 px-4">Single property specifications, images, and owner contact</td>
                      <td className="py-3 px-4 font-semibold text-cyan-700">Property Details Page</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                          POST
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">/api/properties</td>
                      <td className="py-3 px-4">Submit owner listing from website or partner portal</td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">"List Your Property" Form</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                          POST
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">/api/leads</td>
                      <td className="py-3 px-4">Ingest buyer enquiry directly into Supabase `public.leads`</td>
                      <td className="py-3 px-4 font-semibold text-purple-700">"Enquire / Schedule Visit" Modals</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                          POST
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">/api/whatsapp/parse</td>
                      <td className="py-3 px-4">Parse raw WhatsApp text into structured property JSON</td>
                      <td className="py-3 px-4 font-semibold text-green-700">WhatsApp Bot / Ingestion Webhook</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Developer Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  CORS &amp; Hosting Information
                </p>
                <p className="leading-relaxed">
                  All endpoints have been deployed with full CORS headers (<code className="bg-amber-100 px-1 rounded">Access-Control-Allow-Origin: *</code>).
                  Your public website frontend can directly call these endpoints without backend proxies.
                </p>
              </div>
            </div>
          )}

          {/* TAB: PROPERTIES API */}
          {activeTab === 'properties' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Properties Feed API (`GET /api/properties`)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows website visitors to search, filter by locality (Besa, Manish Nagar, Wardha Road, Hingna), price range, and property category.
                </p>
              </div>

              {/* Code Snippet */}
              <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-xs font-mono relative overflow-hidden">
                <button
                  onClick={() =>
                    copyToClipboard(
`// JavaScript / Next.js Fetch Example
async function fetchProperties() {
  const params = new URLSearchParams({
    locality: 'Besa',
    category: 'flat', // 'flat' | 'plot' | 'house_villa' | 'commercial'
    minPrice: '3000000',
    maxPrice: '8000000',
    status: 'available',
    limit: '12'
  });

  const response = await fetch(\`https://resaledesk.saraswatinagri.com/api/properties?\${params.toString()}\`);
  const data = await response.json();
  console.log('Total properties:', data.total);
  console.log('Listings:', data.properties);
  return data.properties;
}`,
                      'fetch-prop'
                    )
                  }
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'fetch-prop' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'fetch-prop' ? 'Copied!' : 'Copy'}</span>
                </button>

                <pre className="overflow-x-auto leading-relaxed">
{`// JavaScript / Next.js Fetch Example
async function fetchProperties() {
  const params = new URLSearchParams({
    locality: 'Besa',
    category: 'flat', // 'flat' | 'plot' | 'house_villa' | 'commercial'
    minPrice: '3000000',
    maxPrice: '8000000',
    status: 'available',
    limit: '12'
  });

  const response = await fetch(\`https://resaledesk.saraswatinagri.com/api/properties?\${params.toString()}\`);
  const data = await response.json();
  return data.properties;
}`}
                </pre>
              </div>

              {/* Parameters Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Supported Query Parameters</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 px-3">Parameter</th>
                        <th className="p-2 px-3">Type</th>
                        <th className="p-2 px-3">Example</th>
                        <th className="p-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2 px-3 font-mono font-bold text-cyan-700">category</td>
                        <td className="p-2 px-3">string</td>
                        <td className="p-2 px-3 font-mono">plot | flat | house_villa</td>
                        <td className="p-2 px-3">Filter by property type</td>
                      </tr>
                      <tr>
                        <td className="p-2 px-3 font-mono font-bold text-cyan-700">locality</td>
                        <td className="p-2 px-3">string</td>
                        <td className="p-2 px-3 font-mono">Besa, Manish Nagar, Hingna</td>
                        <td className="p-2 px-3">Filter by Nagpur area name</td>
                      </tr>
                      <tr>
                        <td className="p-2 px-3 font-mono font-bold text-cyan-700">minPrice / maxPrice</td>
                        <td className="p-2 px-3">number</td>
                        <td className="p-2 px-3 font-mono">3000000 / 8000000</td>
                        <td className="p-2 px-3">Numeric budget range in INR</td>
                      </tr>
                      <tr>
                        <td className="p-2 px-3 font-mono font-bold text-cyan-700">bhk</td>
                        <td className="p-2 px-3">string</td>
                        <td className="p-2 px-3 font-mono">2 BHK, 3 BHK</td>
                        <td className="p-2 px-3">Bedroom count filter</td>
                      </tr>
                      <tr>
                        <td className="p-2 px-3 font-mono font-bold text-cyan-700">search</td>
                        <td className="p-2 px-3">string</td>
                        <td className="p-2 px-3 font-mono">NMRDA Plot</td>
                        <td className="p-2 px-3">Full-text search in title &amp; address</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LEADS API */}
          {activeTab === 'leads' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Ingestion API (`POST /api/leads`)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wire your website's "Book a Site Visit", "Download Brochure", and "Enquire Now" forms directly to this endpoint. Leads appear instantaneously in the Resale CRM!
                </p>
              </div>

              {/* Code Snippet */}
              <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-xs font-mono relative overflow-hidden">
                <button
                  onClick={() =>
                    copyToClipboard(
`// JavaScript Lead Form Submission
async function submitWebsiteEnquiry(leadData) {
  const response = await fetch('https://resaledesk.saraswatinagri.com/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: leadData.name, // e.g. "Aniket Sharma"
      phone: leadData.phone, // e.g. "9890123456"
      email: leadData.email,
      source: 'Website',
      budget: '₹40 - 60 Lakhs',
      preferredLocality: 'Besa, Wardha Road',
      plotInterest: 'Resale Flat in Besa',
      notes: 'Customer enquired from Nagpur Properties website for 3 BHK flat.'
    })
  });

  const result = await response.json();
  if (result.success) {
    alert('Thank you! Our Resale Desk agent will call you shortly.');
  }
}`,
                      'lead-post'
                    )
                  }
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'lead-post' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'lead-post' ? 'Copied!' : 'Copy'}</span>
                </button>

                <pre className="overflow-x-auto leading-relaxed">
{`// JavaScript Lead Form Submission
async function submitWebsiteEnquiry(leadData) {
  const response = await fetch('https://resaledesk.saraswatinagri.com/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: leadData.name,
      phone: leadData.phone,
      source: 'Website',
      budget: '₹40 - 60 Lakhs',
      preferredLocality: 'Besa, Wardha Road',
      plotInterest: 'Resale Flat in Besa',
      notes: 'Customer enquired from website'
    })
  });

  return await response.json();
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: WHATSAPP PARSER API */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Message Parser (`POST /api/whatsapp/parse`)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows third-party WhatsApp bots, webhook handlers, or scraping scripts to submit unformatted text and receive structured Nagpur property JSON.
                </p>
              </div>

              {/* Code Snippet */}
              <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-xs font-mono relative overflow-hidden">
                <button
                  onClick={() =>
                    copyToClipboard(
`curl -X POST https://resaledesk.saraswatinagri.com/api/whatsapp/parse \\
  -H "Content-Type: application/json" \\
  -d '{"message": "For sale 1500 sqft residential plot in Besa Nagpur, RL approved, 52 Lakhs. Owner 9823012345"}'`,
                      'curl-wa'
                    )
                  }
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'curl-wa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'curl-wa' ? 'Copied!' : 'Copy'}</span>
                </button>

                <pre className="overflow-x-auto leading-relaxed">
{`curl -X POST https://resaledesk.saraswatinagri.com/api/whatsapp/parse \\
  -H "Content-Type: application/json" \\
  -d '{"message": "For sale 1500 sqft residential plot in Besa Nagpur, RL approved, 52 Lakhs. Owner 9823012345"}'`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live API Tester &amp; Response Inspector</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test the endpoints directly from this screen to verify responses and data flow.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTestEndpoint('getProperties')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    testEndpoint === 'getProperties'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  GET /api/properties
                </button>
                <button
                  type="button"
                  onClick={() => setTestEndpoint('parseWhatsApp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    testEndpoint === 'parseWhatsApp'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  POST /api/whatsapp/parse
                </button>
              </div>

              {testEndpoint === 'getProperties' ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                    Query String
                  </label>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    className="w-full font-mono text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                    Sample Raw WhatsApp Message
                  </label>
                  <textarea
                    rows={3}
                    value={testRawWhatsApp}
                    onChange={(e) => setTestRawWhatsApp(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={runLiveTest}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTesting ? 'Sending Request...' : 'Send Live Request'}</span>
              </button>

              {testResult && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      Server Response (JSON)
                    </span>
                    <button
                      onClick={() => copyToClipboard(testResult, 'test-res')}
                      className="text-[11px] text-cyan-700 font-bold hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'test-res' ? 'Copied' : 'Copy Response'}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto leading-relaxed">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Saraswati Nagri Resale Desk CRM API v1.0
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
