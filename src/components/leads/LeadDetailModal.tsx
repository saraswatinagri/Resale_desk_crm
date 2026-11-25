import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Send,
  Building2,
  FileText,
  User,
  History,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Lock,
  Bot,
  Trash2,
} from 'lucide-react';
import { ResaleLead, ResaleProperty, LeadStage, CallLog, ScheduledVisit } from '../../types/crm';
import { 
  formatIndianCurrency, 
  generateWhatsAppLink, 
  buildPropertyPitchMessage,
  formatDateTime 
} from '../../utils/formatters';
import { getMatchingPropertiesForLead } from '../../utils/matcher';
import { LEAD_STAGES, SALES_AGENTS } from '../../data/constants';
import { useAuth } from '../../lib/auth-context';
import { canUserCallLead, canUserDeleteLead } from '../../lib/lead-permissions';
import { 
  fetchLeadWhatsAppMessages, 
  sendLeadWhatsAppMessage, 
  type WhatsAppMessageItem 
} from '../../services/whatsappService';
import { generateGeminiRealEstateReply } from '../../services/geminiService';
import { toast } from '../../utils/toast';

interface LeadDetailModalProps {
  lead: ResaleLead | null;
  properties: ResaleProperty[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStage: (leadId: string, stage: LeadStage) => void;
  onAddCallLog: (leadId: string, log: Omit<CallLog, 'id' | 'date'>) => void;
  onScheduleVisit: (leadId: string, visit: Omit<ScheduledVisit, 'id'>) => void;
  onOpenWhatsAppChat?: (lead: ResaleLead) => void;
  onDeleteLead?: (leadId: string) => void;
}

// Saraswati Nagri CRM Stage Questions
const STAGE_PROMPTS: Record<string, string> = {
  'contacted': 'Kaunsi property dekh rahe ho, aur kitna jaldi kharidna hai?',
  'visit_scheduled': 'Ghar turant banana hai ya investment? Plot / Flat pe size aur facing ki koi preference?',
  'visit_done': 'Final decision mein aur kaun involved hai? Bank loan loge ya self-finance?',
  'negotiation': 'Price ya payment terms pe kya expectation hai? Maximum budget kitna comfortable hai?',
  'token_received': 'Token payment ka receipt / UTR share karoge, plot / flat block kar sakein?',
  'closed': 'Registry date aur document number confirm karo. Agreement copy mil gayi?'
};

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  properties,
  isOpen,
  onClose,
  onUpdateStage,
  onAddCallLog,
  onScheduleVisit,
  onOpenWhatsAppChat,
  onDeleteLead,
}) => {
  const { user, profiles } = useAuth();
  const [callPermissionAlert, setCallPermissionAlert] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const { canCall, reason: callBlockedReason } = canUserCallLead(user, lead);

  const handleCall = () => {
    if (!canCall) {
      setCallPermissionAlert(callBlockedReason || 'Call permission restricted');
      setTimeout(() => setCallPermissionAlert(null), 5000);
      return;
    }
    window.location.href = `tel:${lead.phone}`;
  };

  const [activeTab, setActiveTab] = useState<'matches' | 'calls' | 'visits' | 'details' | 'whatsapp'>('matches');

  // WhatsApp chat state
  const [waMessages, setWaMessages] = useState<WhatsAppMessageItem[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waInputText, setWaInputText] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waAiDrafting, setWaAiDrafting] = useState(false);

  const teamAgents = useMemo(() => {
    const list: string[] = [];
    if (user?.fullName) list.push(user.fullName);
    SALES_AGENTS.forEach(a => {
      if (!list.includes(a.name)) list.push(a.name);
    });
    profiles.forEach(p => {
      if (!list.includes(p.fullName)) list.push(p.fullName);
    });
    return list;
  }, [user, profiles]);

  const defaultAgent = user?.fullName || SALES_AGENTS[0].name;

  // New call log state
  const [callerName, setCallerName] = useState(defaultAgent);
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallLog['outcome']>('Interested');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // New visit state
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('11:00 AM');
  const [visitAgent, setVisitAgent] = useState(defaultAgent);

  // Load WhatsApp messages from public.whatsapp_messages
  const loadWhatsAppChat = useCallback(async () => {
    if (!lead) return;
    setWaLoading(true);
    const { messages } = await fetchLeadWhatsAppMessages(lead.id, lead.phone);
    setWaMessages(messages);
    setWaLoading(false);
  }, [lead]);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      loadWhatsAppChat();
    }
  }, [activeTab, loadWhatsAppChat]);

  const handleSendWhatsAppSubmit = async (textToSend?: string) => {
    const message = (textToSend || waInputText).trim();
    if (!message || !lead) return;
    setWaSending(true);
    const res = await sendLeadWhatsAppMessage({
      leadId: lead.id,
      phone: lead.whatsapp || lead.phone,
      leadName: lead.name,
      text: message,
      senderAgentId: user?.id,
      senderName: user?.fullName,
    });
    if (res.waLink) {
      window.open(res.waLink, '_blank', 'noopener,noreferrer');
    }
    setWaInputText('');
    setWaSending(false);
    await loadWhatsAppChat();
  };

  const handleGenerateTabAiDraft = async (actionType: 'reply' | 'pitch' | 'site_visit' | 'pricing' | 'loan' = 'reply', prompt?: string) => {
    if (!lead) return;
    setWaAiDrafting(true);
    try {
      const lastClientMsg = prompt || [...waMessages].reverse().find(m => m.direction === 'inbound')?.text || '';
      const effectiveMsg = lastClientMsg || (
        actionType === 'pitch'
          ? `Pitch properties in ${lead.preferredLocalities[0] || 'Nagpur'} for budget ${lead.budgetDisplay}`
          : actionType === 'site_visit'
          ? 'Invite for site visit'
          : actionType === 'loan'
          ? 'Bank loan info'
          : `Inquiry regarding ${lead.intent}`
      );

      const res = await generateGeminiRealEstateReply({
        message: effectiveMsg,
        senderName: lead.name,
        senderPhone: lead.whatsapp || lead.phone,
        leadStage: lead.stage,
        locality: lead.preferredLocalities.join(', ') || 'Nagpur',
        budget: lead.budgetDisplay,
        propertyCategory: lead.propertyCategory,
        intent: lead.intent,
        notes: lead.notes,
        actionType,
        recentHistory: waMessages.slice(-5).map(m => ({
          sender: m.direction === 'inbound' ? 'lead' : 'agent',
          text: m.text,
        })),
      });

      if (res?.replyText) {
        setWaInputText(res.replyText);
        toast.success(res.source === 'gemini_api' ? '✨ Gemini AI draft generated!' : 'AI draft generated!');
      }
    } catch (err: any) {
      toast.error('AI draft error: ' + (err.message || 'Failed'));
    } finally {
      setWaAiDrafting(false);
    }
  };

  // Calculate matching properties
  const matches = getMatchingPropertiesForLead(lead, properties);

  const handleAddCallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callNotes.trim()) return;

    onAddCallLog(lead.id, {
      caller: callerName,
      notes: callNotes.trim(),
      outcome: callOutcome,
      nextFollowUpDate: nextFollowUpDate || undefined,
    });
    setCallNotes('');
    setNextFollowUpDate('');
  };

  const handleScheduleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id === selectedPropertyId);
    onScheduleVisit(lead.id, {
      propertyId: prop?.id,
      propertyTitle: prop?.title,
      propertyLocality: prop?.locality,
      date: visitDate,
      time: visitTime,
      agent: visitAgent,
      status: 'scheduled'
    });
  };

  const currentStageObj = LEAD_STAGES.find(s => s.key === lead.stage) || LEAD_STAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                  {lead.leadCode}
                </span>
                <h2 className="text-sm sm:text-base font-black text-slate-800 truncate">{lead.name}</h2>
                {lead.priority === 'hot' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                    🔥 Hot Lead
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                {lead.phone} {lead.email ? `• ${lead.email}` : ''} • Owner: <span className="font-semibold text-slate-700">{lead.assignedTo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleCall}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                canCall
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-400 border-slate-200 opacity-70'
              }`}
              title={canCall ? 'Call client' : callBlockedReason}
            >
              {canCall ? <Phone className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenWhatsAppChat) {
                  onOpenWhatsAppChat(lead);
                } else {
                  setActiveTab('whatsapp');
                }
              }}
              title="Open WhatsApp in CRM (Saraswati Nagri)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Call Permission Restriction Banner */}
        {callPermissionAlert && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
            <span>{callPermissionAlert}</span>
            <button
              type="button"
              onClick={() => setCallPermissionAlert(null)}
              className="p-1 hover:bg-rose-100 rounded-lg text-rose-500 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stage Prompt & Selector Strip */}
        <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Stage:</span>
            <select
              value={lead.stage}
              onChange={(e) => onUpdateStage(lead.id, e.target.value as LeadStage)}
              className="font-bold px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              {LEAD_STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-slate-600 flex-wrap">
            <span>Budget: <strong className="text-teal-700 font-bold">{lead.budgetDisplay}</strong></span>
            <span>•</span>
            <span className="truncate max-w-[200px]">Locations: <strong className="text-slate-800">{lead.preferredLocalities.join(', ')}</strong></span>
          </div>
        </div>

        {/* Saraswati Nagri CRM Qualification Prompt */}
        {STAGE_PROMPTS[lead.stage] && (
          <div className="px-3.5 sm:px-6 py-1.5 sm:py-2 bg-amber-50/70 border-b border-amber-200/80 text-[11px] text-amber-900 font-medium flex items-center gap-2 shrink-0">
            <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] bg-amber-200/60 px-1.5 py-0.2 rounded shrink-0">Prompt:</span>
            <span className="truncate">"{STAGE_PROMPTS[lead.stage]}"</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 px-3 sm:px-6 pt-2.5 sm:pt-3 border-b border-slate-200 font-bold text-xs overflow-x-auto scrollbar-hide shrink-0">
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-2 sm:pb-2.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'matches'
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Matching Properties ({matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`pb-2 sm:pb-2.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'calls'
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Call Trail ({lead.callLogs?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`pb-2 sm:pb-2.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'visits'
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Site Visits ({lead.visits?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 sm:pb-2.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'details'
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Requirement Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2 sm:pb-2.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Messages</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6">
          
          {/* TAB 1: MATCHING PROPERTIES */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Automated Resale Inventory Matches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated by location overlap, budget band, and BHK compatibility
                  </p>
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-bold">No direct inventory match found.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try registering a new listing in {lead.preferredLocalities.join(', ')}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map(({ property, score, reasons }) => (
                    <div 
                      key={property.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {property.locality}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            score >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {score}% Match
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{property.title}</h4>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm font-black text-teal-700">{property.price}</span>
                          <span className="text-xs text-slate-500">• {property.areaSqFt} sq.ft ({property.bhk || 'Plot'})</span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {reasons.map((r, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={generateWhatsAppLink(
                            lead.whatsapp || lead.phone,
                            buildPropertyPitchMessage(
                              lead.name,
                              property.title,
                              property.locality,
                              property.price,
                              property.areaSqFt,
                              property.bhk
                            )
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Pitch via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CALL TRAIL */}
          {activeTab === 'calls' && (
            <div className="space-y-5">
              <form onSubmit={handleAddCallSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  Log Call / Interaction
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Caller Executive</label>
                    <select
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                    >
                      {teamAgents.map((agent) => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Outcome</label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value as CallLog['outcome'])}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                    >
                      <option value="Interested">Interested (Follow Up)</option>
                      <option value="Scheduled Visit">Site Visit Scheduled</option>
                      <option value="Site Visit Done">Site Visit Done</option>
                      <option value="Follow-up Needed">Follow-up Needed</option>
                      <option value="Ringing / No Answer">Ringing / No Answer</option>
                      <option value="Price Too High">Price Too High (Price zyada)</option>
                      <option value="Budget Mismatch">Budget Mismatch</option>
                      <option value="Already Sold">Already Sold (Sold out ho gaya)</option>
                      <option value="Already Rented">Already Rented (Rent pe de diya)</option>
                      <option value="Bought Elsewhere">Bought Elsewhere (Kahin aur kharida)</option>
                      <option value="Location Not Suitable">Location Not Suitable</option>
                      <option value="Requirement Closed">Requirement Closed (Won Deal)</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                </div>

                {(callOutcome === 'Interested' || callOutcome === 'Follow-up Needed' || callOutcome === 'Scheduled Visit') && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Next Follow-up Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Discussion Summary</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter discussion notes with the client..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
                  >
                    + Record Call
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Call Trail History</h4>
                {(!lead.callLogs || lead.callLogs.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No previous call logs recorded.</p>
                ) : (
                  lead.callLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.caller}</span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(log.date)}</span>
                      </div>
                      <p className="text-slate-600">{log.notes}</p>
                      <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          log.outcome === 'Interested' || log.outcome === 'Follow-up Needed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.outcome === 'Scheduled Visit'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : log.outcome === 'Site Visit Done'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : log.outcome === 'Requirement Closed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : log.outcome === 'Ringing / No Answer'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : log.outcome === 'Price Too High' || log.outcome === 'Budget Mismatch'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : log.outcome === 'Not Interested' || log.outcome === 'Already Sold' || log.outcome === 'Already Rented' || log.outcome === 'Bought Elsewhere'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {log.outcome}
                        </span>
                        {log.nextFollowUpDate && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Follow-up: {new Date(log.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SITE VISITS */}
          {activeTab === 'visits' && (
            <div className="space-y-5">
              <form onSubmit={handleScheduleVisitSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Schedule New Site Visit
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Property</label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.locality})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. 11:30 AM"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Field Executive</label>
                    <select
                      value={visitAgent}
                      onChange={(e) => setVisitAgent(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                    >
                      {teamAgents.map((agent) => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                  >
                    Confirm & Schedule Visit
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Visits</h4>
                {(!lead.visits || lead.visits.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No site visits scheduled.</p>
                ) : (
                  lead.visits.map(v => (
                    <div key={v.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{v.propertyTitle || 'Property Visit'}</span>
                        <p className="text-slate-500 text-xs mt-0.5">
                          📅 {v.date} at {v.time} • Agent: {v.agent}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        v.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requirement</span>
                  <p><strong>Intent:</strong> {lead.intent}</p>
                  <p><strong>Category:</strong> {lead.propertyCategory}</p>
                  <p><strong>BHK:</strong> {lead.bhkPreference.join(', ') || 'Any'}</p>
                  <p><strong>Locations:</strong> {lead.preferredLocalities.join(', ')}</p>
                  <p><strong>Budget:</strong> {lead.budgetDisplay}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Routing</span>
                  <p><strong>Source:</strong> {lead.source}</p>
                  <p><strong>Priority:</strong> {lead.priority.toUpperCase()}</p>
                  <p><strong>Assigned:</strong> {lead.assignedTo}</p>
                  <p><strong>Registered:</strong> {formatDateTime(lead.createdAt)}</p>
                </div>
              </div>

              {lead.notes && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Discussion Notes
                  </span>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{lead.notes}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WHATSAPP CHAT THREAD */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              {/* WhatsApp Active Line Bar */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs">
                      Saraswati Nagri WhatsApp Gateway
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Sending via <strong>+91 89560 40220</strong> (Office Master Line) • Client: <strong>{lead.phone}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadWhatsAppChat}
                  disabled={waLoading}
                  className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold text-[10px] hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${waLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Chat</span>
                </button>
              </div>

              {/* WhatsApp Active Line Bar + Open Overlay Window */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span>Saraswati Nagri WhatsApp Gateway</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black text-[9px]">LIVE</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Line: <strong>+91 89560 40220</strong> • Lead: <strong>{lead.phone}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {onOpenWhatsAppChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWhatsAppChat(lead);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Open full WhatsApp chat drawer"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Full WhatsApp Window →</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadWhatsAppChat}
                    disabled={waLoading}
                    className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold text-[10px] hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${waLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Dedicated 1-Click AI Auto-Reply Bar */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>AI Copilot Auto-Reply (Riya Concierge)</span>
                  </span>
                  <span className="text-[9px] text-purple-600 font-semibold">
                    Personalized with {lead.name}'s budget & locality
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGenerateTabAiDraft('reply')}
                    disabled={waAiDrafting}
                    className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] shadow-xs flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {waAiDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>{waAiDrafting ? 'Drafting…' : '✨ AI Auto-Reply'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateTabAiDraft('pitch')}
                    disabled={waAiDrafting}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Building2 className="w-3 h-3 text-purple-600" />
                    <span>🏡 AI Pitch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateTabAiDraft('site_visit')}
                    disabled={waAiDrafting}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Calendar className="w-3 h-3 text-purple-600" />
                    <span>📅 Sunday Visit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateTabAiDraft('loan')}
                    disabled={waAiDrafting}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3 text-purple-600" />
                    <span>💰 Loan Quote</span>
                  </button>
                </div>
              </div>

              {/* Quick Reply Pitch Chips */}
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Standard Templates
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '👋 Welcome Intro', text: `Namaste ${lead.name} ji,\n\nThank you for connecting with *Nagpur Properties & Saraswati Nagri Resale Desk*.\n\nWe noted your requirement for ${lead.intent} in Nagpur (Preferred: ${lead.preferredLocalities.join(', ') || 'Nagpur'}, Budget: ${lead.budgetDisplay}).\n\nWe have verified clear-title properties available with NMRDA sanction and bank loan pre-approvals.\n\nWhen would be a good time for a brief 2-minute call?\n\n- ${user?.fullName || 'Resale Desk Team'} | 📱 ${user?.phone || '8956040220'}` },
                    { label: '📅 Site Visit Confirmation', text: `Namaste ${lead.name} ji,\n\nYour property site visit has been scheduled!\n\n📍 Location: ${lead.preferredLocalities[0] || 'Nagpur'}\n👤 Field Incharge: ${user?.fullName || 'Resale Desk'}\n\nOur executive will meet you at the property. Please feel free to call if you need directions.\n\n- Nagpur Properties & Saraswati Nagri` },
                    { label: '🏷️ Price Update & Offer', text: `Namaste ${lead.name} ji,\n\nRegarding the property you viewed in ${lead.preferredLocalities[0] || 'Nagpur'}:\n\nWe spoke to the owner and they are open to an attractive deal around your target budget of ${lead.budgetDisplay}.\n\nShall we arrange a quick sit-down meeting at our office today to finalize?\n\n- Resale Desk` },
                    { label: '📄 Documents Checklist', text: `Hello ${lead.name} ji,\n\nFor NMRDA verified properties and instant loan approval from SBI / HDFC, please keep ready:\n1. PAN & Aadhaar\n2. 3 Months Salary Slips\n3. 6 Months Bank Statement\n\nOur legal desk is ready to prepare the 30-year search report for you.\n\n- Saraswati Nagri Legal Desk` },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setWaInputText(chip.text)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2.5">
                {waLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Loading conversation thread from Supabase…</span>
                  </div>
                ) : waMessages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">No previous WhatsApp chat logged for this lead</p>
                    <p className="text-[11px]">Click <strong>✨ AI Auto-Reply</strong> above to draft a personalized opening.</p>
                  </div>
                ) : (
                  waMessages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs space-y-1 ${
                            isOutbound
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          
                          {/* Inline AI reply for inbound message */}
                          {!isOutbound && (
                            <div className="pt-1 border-t border-slate-100 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleGenerateTabAiDraft('reply', msg.text)}
                                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span>✨ AI Reply</span>
                              </button>
                            </div>
                          )}

                          <div className={`flex items-center justify-end gap-1 text-[9px] ${
                            isOutbound ? 'text-emerald-100' : 'text-slate-400'
                          }`}>
                            <span>{new Date(msg.messageTimestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOutbound && <span>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input & Send Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendWhatsAppSubmit();
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Type WhatsApp message to client..."
                    value={waInputText}
                    onChange={(e) => setWaInputText(e.target.value)}
                    className="w-full p-3 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Archives to whatsapp_messages &amp; logs interaction
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppSubmit()}
                      disabled={waSending || !waInputText.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {waSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send &amp; Launch WhatsApp</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Lead ID: {lead.id}</span>
            {canUserDeleteLead(user) && onDeleteLead && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Permanently delete lead "${lead.name}" (${lead.leadCode})? This action will remove all call logs and WhatsApp history.`
                    )
                  ) {
                    onDeleteLead(lead.id);
                    onClose();
                  }
                }}
                className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 transition-colors border border-rose-200 cursor-pointer ml-2"
                title="Super Admin: Permanently Delete Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
