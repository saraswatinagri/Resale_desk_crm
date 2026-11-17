import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { ResaleLead, ResaleProperty, LeadStage, CallLog, ScheduledVisit } from '../../types/crm';
import { 
  formatIndianCurrency, 
  generateWhatsAppLink, 
  buildPropertyPitchMessage,
  formatDateTime 
} from '../../utils/formatters';
import { getMatchingPropertiesForLead } from '../../utils/matcher';
import { LEAD_STAGES } from '../../data/constants';

interface LeadDetailModalProps {
  lead: ResaleLead | null;
  properties: ResaleProperty[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStage: (leadId: string, stage: LeadStage) => void;
  onAddCallLog: (leadId: string, log: Omit<CallLog, 'id' | 'date'>) => void;
  onScheduleVisit: (leadId: string, visit: Omit<ScheduledVisit, 'id'>) => void;
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
  onScheduleVisit
}) => {
  if (!isOpen || !lead) return null;

  const [activeTab, setActiveTab] = useState<'matches' | 'calls' | 'visits' | 'details'>('matches');

  // New call log state
  const [callerName, setCallerName] = useState('Nilesh Thakre');
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallLog['outcome']>('Interested');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // New visit state
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('11:00 AM');
  const [visitAgent, setVisitAgent] = useState('Nilesh Thakre');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-md">
              {lead.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                  {lead.leadCode}
                </span>
                <h2 className="text-base font-black text-slate-800">{lead.name}</h2>
                {lead.priority === 'hot' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                    🔥 Hot Lead
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lead.phone} {lead.email ? `• ${lead.email}` : ''} • Owner: <span className="font-semibold text-slate-700">{lead.assignedTo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </a>

            <a
              href={generateWhatsAppLink(lead.whatsapp || lead.phone, `Namaste ${lead.name} ji, regarding your property requirement in Nagpur:`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage Prompt & Selector Strip */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Pipeline Stage:</span>
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

          <div className="flex items-center gap-3 text-slate-600">
            <span>Budget: <strong className="text-teal-700 font-bold">{lead.budgetDisplay}</strong></span>
            <span>•</span>
            <span>Locations: <strong className="text-slate-800">{lead.preferredLocalities.join(', ')}</strong></span>
          </div>
        </div>

        {/* Saraswati Nagri CRM Qualification Prompt */}
        {STAGE_PROMPTS[lead.stage] && (
          <div className="px-6 py-2 bg-amber-50/70 border-b border-amber-200/80 text-[11px] text-amber-900 font-medium flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/60 px-1.5 py-0.2 rounded">Agent Prompt:</span>
            <span>"{STAGE_PROMPTS[lead.stage]}"</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 font-bold text-xs">
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
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
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
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
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
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
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'details'
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Requirement Profile</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
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
                    <input
                      type="text"
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
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
                    <input
                      type="text"
                      value={visitAgent}
                      onChange={(e) => setVisitAgent(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
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

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-slate-400 font-mono text-[11px]">Lead ID: {lead.id}</span>
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
