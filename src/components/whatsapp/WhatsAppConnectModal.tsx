import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Building2,
  User,
  ExternalLink,
  Loader2,
  Radio,
  QrCode,
  Send,
  Bot,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Copy,
} from 'lucide-react';
import {
  fetchWhatsAppSessions,
  requestWhatsAppInstanceQr,
  WhatsAppSession,
} from '../../services/whatsappService';
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  testGeminiKey,
  generateGeminiRealEstateReply,
  GeminiReplyResponse,
} from '../../services/geminiService';
import { useAuth } from '../../lib/auth-context';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActiveLine?: (session: WhatsAppSession) => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({
  isOpen,
  onClose,
  onSelectActiveLine,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'lines' | 'gemini'>('lines');
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [testNumber, setTestNumber] = useState<string>('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [showQrBox, setShowQrBox] = useState<boolean>(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [qrMessage, setQrMessage] = useState<string | null>(null);

  // ── Gemini AI State ──────────────────────────────────────────────────────────
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [testingGemini, setTestingGemini] = useState<boolean>(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  // Gemini Live Simulator State
  const [simPrompt, setSimPrompt] = useState<string>('Lonara me Saraswati Nagri 11 me 1500 sqft plot ka kya rate hai? Sunday ko visit karna hai.');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<GeminiReplyResponse | null>(null);

  const handleFetchQr = async (instanceName?: string) => {
    setShowQrBox(true);
    setLoadingQr(true);
    setQrMessage(null);
    try {
      const targetInstance = instanceName || activeSession?.instanceName || 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449';
      const res = await requestWhatsAppInstanceQr(targetInstance);
      if (res.qrCode) {
        setQrCodeData(res.qrCode);
      }
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
      }
      if (res.error) {
        setQrMessage(res.error);
      } else if (!res.qrCode && !res.pairingCode) {
        setQrMessage('Instance is already connected or awaiting handshake.');
      }
    } catch (err: any) {
      setQrMessage(err.message || 'Could not fetch QR code');
    } finally {
      setLoadingQr(false);
    }
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const { sessions: fetched, activeSession } = await fetchWhatsAppSessions();
    setSessions(fetched);
    if (activeSession && !selectedSessionId) {
      setSelectedSessionId(activeSession.id);
    }
    setLoading(false);
  }, [selectedSessionId]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      setGeminiKeyInput(getGeminiApiKey());
      setGeminiTestResult(null);
      setKeySavedMessage(null);
    }
  }, [isOpen, loadSessions]);

  if (!isOpen) return null;

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions.find((s) => s.status === 'connected') || sessions[0];
  const isConnected = activeSession?.status === 'connected';
  const currentGeminiKey = getGeminiApiKey();

  const handleRefresh = async () => {
    setSyncing(true);
    await loadSessions();
    setSyncing(false);
  };

  const handleSelectLine = (session: WhatsAppSession) => {
    setSelectedSessionId(session.id);
    if (onSelectActiveLine) {
      onSelectActiveLine(session);
    }
  };

  const handleTestWhatsApp = () => {
    const phone = testNumber.trim() || activeSession?.phoneNumber || '918956040220';
    const digits = phone.replace(/\D/g, '');
    const cleanDigits = digits.length === 10 ? `91${digits}` : digits;
    const testUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent('Namaste from Saraswati Nagri & Nagpur Properties Resale Desk! WhatsApp gateway is connected and active.')}`;
    window.open(testUrl, '_blank', 'noopener,noreferrer');
    setTestStatus('WhatsApp chat launched successfully!');
    setTimeout(() => setTestStatus(null), 3000);
  };

  // ── Gemini Key Handlers ───────────────────────────────────────────────────
  const handleSaveGeminiKey = () => {
    saveGeminiApiKey(geminiKeyInput.trim());
    setKeySavedMessage('API Key saved successfully in local storage!');
    setGeminiTestResult(null);
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleClearGeminiKey = () => {
    clearGeminiApiKey();
    setGeminiKeyInput('');
    setGeminiTestResult(null);
    setKeySavedMessage('API Key removed.');
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleTestGeminiKey = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiKey(geminiKeyInput);
      setGeminiTestResult(res);
    } catch (err: any) {
      setGeminiTestResult({ success: false, message: err.message || 'Test failed' });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleRunSimulator = async () => {
    if (!simPrompt.trim()) return;
    setSimulating(true);
    try {
      const reply = await generateGeminiRealEstateReply({
        message: simPrompt.trim(),
        senderName: 'Nagpur Client',
        senderPhone: '9876543210',
        leadStage: 'New Inquiry',
        projectName: 'Saraswati Nagri 11 / Besa Corridors',
      });
      setSimResult(reply);
    } catch (err: any) {
      console.warn('Simulator error:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800">WhatsApp &amp; Gemini AI Gateway</h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-500" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {isConnected ? 'Gateway Active' : 'Live Gateway'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Multi-agent Baileys Gateway &bull; Google Gemini Real Estate Concierge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={syncing}
              title="Refresh connection status"
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-2.5 border-b border-slate-100 bg-white font-bold text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'lines'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>WhatsApp Lines &amp; QR ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'gemini'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Bot className="w-4 h-4 text-teal-600" />
            <span>Gemini AI Auto-Reply</span>
            <span className="px-1.5 py-0.2 rounded-full text-[8px] uppercase tracking-wider font-extrabold bg-teal-100 text-teal-800">
              {currentGeminiKey ? 'Active' : 'Config'}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[72vh]">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="font-semibold text-xs">Fetching WhatsApp session states from Supabase…</p>
            </div>
          ) : activeTab === 'lines' ? (
            <>
              {/* Active Connection Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        Active Selected Line
                      </p>
                      <p className="text-sm font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                        {activeSession?.formattedPhone || '+91 89560 40220'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm shrink-0">
                    {activeSession?.status === 'connected' ? '🟢 Live Connected' : '🟡 Active'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed pt-1 border-t border-emerald-200/50">
                  Assigned to: <strong>{activeSession?.agentName}</strong> ({activeSession?.agentRole}). Outbound client pitches, site visit confirmations, and valuation notices dispatch through this verified line.
                </p>
              </div>

              {/* Connected Staff & Office Lines List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Available WhatsApp Lines in Saraswati Nagri CRM
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {sessions.filter((s) => s.status === 'connected').length} connected
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  {sessions.map((session) => {
                    const isSelected = session.id === activeSession?.id;
                    const isConn = session.status === 'connected';

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectLine(session)}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            session.isOfficeMaster
                              ? 'bg-amber-100 text-amber-700 font-bold'
                              : 'bg-slate-100 text-slate-600 font-bold'
                          }`}>
                            {session.isOfficeMaster ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-800 truncate text-xs">
                                {session.agentName}
                              </p>
                              {session.isOfficeMaster && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider">
                                  Office Master
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 tabular-nums">
                              {session.formattedPhone || session.instanceName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isConn
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {session.status}
                          </span>

                          <input
                            type="radio"
                            name="active_line"
                            checked={isSelected}
                            onChange={() => handleSelectLine(session)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* QR Code Handset Connection / Pairing Box */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      Pair Agent Handset (Evolution API QR Code)
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Scan with WhatsApp Linked Devices on your phone to connect your personal line.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchQr()}
                    disabled={loadingQr}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {loadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                    <span>{showQrBox ? 'Refresh QR' : 'Pair Line QR'}</span>
                  </button>
                </div>

                {showQrBox && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center space-y-2">
                    {loadingQr ? (
                      <div className="py-6 flex items-center gap-2 text-slate-500 font-medium">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        <span>Requesting pairing QR from Evolution API...</span>
                      </div>
                    ) : qrCodeData ? (
                      <div className="space-y-2">
                        <img
                          src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                          alt="WhatsApp Pairing QR Code"
                          className="w-48 h-48 mx-auto border border-slate-200 rounded-lg shadow-xs"
                        />
                        <p className="text-[11px] font-bold text-slate-700">
                          Open WhatsApp → Linked Devices → Link a Device → Scan this QR
                        </p>
                      </div>
                    ) : pairingCode ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Pairing Code</p>
                        <p className="text-lg font-mono font-black text-emerald-700 tracking-widest">{pairingCode}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium">
                        {qrMessage || 'Line is active and connected in Supabase!'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick WhatsApp Test & Launch */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Test WhatsApp Gateway Link
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Instant wa.me handoff</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 10-digit mobile number to test"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    className="flex-1 p-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send Test</span>
                  </button>
                </div>
                {testStatus && (
                  <p className="text-[10px] font-bold text-emerald-600 animate-in fade-in">
                    ✓ {testStatus}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* ── TAB 2: GOOGLE GEMINI AI CONFIGURATION & SIMULATOR ───────────────── */
            <div className="space-y-4">
              
              {/* Gemini Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50/50 to-blue-50/40 border border-teal-200/80 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                        Google Gemini AI Concierge (&ldquo;Riya&rdquo;)
                      </p>
                      <h4 className="text-sm font-black text-slate-800">
                        24/7 Intelligent WhatsApp Auto-Reply
                      </h4>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    currentGeminiKey
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {currentGeminiKey ? '🟢 AI Connected' : '🟡 Smart Template Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-teal-200/60">
                  When potential buyers message your WhatsApp number, Gemini instantly responds in natural <strong>Hinglish / Marathi / English</strong> with accurate Nagpur project data (Lonara, Koradi Road, Besa, Manish Nagar), NMRDA legal status, and Sunday site visit invitations.
                </p>
              </div>

              {/* API Key Configuration Card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-600" />
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 underline"
                  >
                    Get Free Key from Google AI Studio
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full p-2.5 pr-9 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    className="px-3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    Save Key
                  </button>

                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={testingGemini || !geminiKeyInput.trim()}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs transition-colors shrink-0 border border-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    <span>Test</span>
                  </button>

                  {geminiKeyInput && (
                    <button
                      type="button"
                      onClick={handleClearGeminiKey}
                      className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Clear Key"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {keySavedMessage && (
                  <p className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
                    ✓ {keySavedMessage}
                  </p>
                )}

                {geminiTestResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                    geminiTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {geminiTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{geminiTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Live Real Estate AI Simulator */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Interactive Auto-Reply Simulator
                  </label>
                  <span className="text-[10px] text-slate-400">Test live AI response</span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={simPrompt}
                    onChange={(e) => setSimPrompt(e.target.value)}
                    placeholder="Enter sample WhatsApp message from a buyer..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5 overflow-x-auto text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSimPrompt('Besa me 2 BHK flat ready to move hai kya aur budget 45L hai')}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        Besa 2 BHK
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimPrompt('Saraswati Nagri 11 Lonara me Sunday ko site visit karna hai')}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        Lonara Plot Visit
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunSimulator}
                      disabled={simulating || !simPrompt.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Simulate Reply</span>
                    </button>
                  </div>
                </div>

                {simResult && (
                  <div className="p-3.5 rounded-xl bg-white border border-teal-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black uppercase text-teal-800 flex items-center gap-1">
                        <Bot className="w-3 h-3 text-teal-600" />
                        Riya&apos;s AI WhatsApp Reply:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[8px]">
                          Intent: {simResult.intent}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          simResult.source === 'gemini_api'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {simResult.source === 'gemini_api' ? 'Gemini 2.0' : 'Smart Template'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap bg-teal-50/40 p-2.5 rounded-lg border border-teal-100/70">
                      {simResult.replyText}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {activeTab === 'lines'
              ? 'Provider: Evolution API (WhatsApp Baileys Protocol)'
              : 'AI Engine: Google Gemini 2.0 Flash REST API'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppConnectModal;
