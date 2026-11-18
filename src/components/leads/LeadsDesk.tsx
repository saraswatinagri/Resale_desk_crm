import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  PhoneCall,
  MessageCircle,
  Calendar,
  Sparkles,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Columns3,
  MapPin,
  UserCircle,
  ChevronRight,
  Check,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';
import { ResaleLead, LeadStage, CrmUserProfile, CallLog } from '../../types/crm';
import { generateWhatsAppLink } from '../../utils/formatters';
import { LEAD_STAGES, NAGPUR_LOCALITIES } from '../../data/constants';
import {
  RESALE_BRAND,
  RESALE_INTENT_OPTIONS,
  RESALE_TAG,
  daysSinceIso,
  isResaleIntent,
} from '../../lib/resale';
import { CallOutcomePromptModal } from './CallOutcomePromptModal';

interface LeadsDeskProps {
  leads: ResaleLead[];
  activeDesk: 'resale' | 'sales';
  profiles: CrmUserProfile[];
  onOpenAddLead: () => void;
  onViewLead: (lead: ResaleLead) => void;
  onUpdateLeadStage: (leadId: string, stage: LeadStage) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenSmartMatcherForLead: (lead: ResaleLead) => void;
  onOpenWhatsAppChat?: (lead: ResaleLead) => void;
  onExportCsv?: () => void;
  onAddCallLog?: (leadId: string, log: Omit<CallLog, 'id' | 'date'>) => Promise<void>;
}

export function CallOutcomeBadge({ outcome }: { outcome: string }) {
  const o = outcome.toLowerCase();
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = '📞';

  if (o.includes('interested') || o.includes('follow-up')) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    icon = '📞';
  } else if (o.includes('visit') && o.includes('sched')) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = '📍';
  } else if (o.includes('visit') && o.includes('done')) {
    colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    icon = '✅';
  } else if (o.includes('ring') || o.includes('no answer')) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    icon = '🔔';
  } else if (o.includes('price') || o.includes('budget')) {
    colorClass = 'bg-orange-50 text-orange-700 border-orange-200';
    icon = '💰';
  } else if (o.includes('sold') || o.includes('rent')) {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    icon = '🏷️';
  } else if (o.includes('bought') || o.includes('elsewhere')) {
    colorClass = 'bg-zinc-100 text-zinc-700 border-zinc-300';
    icon = '🏠';
  } else if (o.includes('close') || o.includes('won') || o.includes('token')) {
    colorClass = 'bg-green-50 text-green-700 border-green-200';
    icon = '🎉';
  } else if (o.includes('not interested') || o.includes('lost')) {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = '❌';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border tracking-tight ${colorClass}`}>
      <span>{icon}</span>
      <span className="truncate max-w-[130px]">{outcome}</span>
    </span>
  );
}

function LeadCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied' : `Copy ${code}`}
      className="group/badge inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black tabular-nums tracking-tight text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 cursor-pointer whitespace-nowrap shrink-0"
    >
      {code}
      {copied ? (
        <Check className="w-3 h-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="w-2.5 h-2.5 shrink-0 opacity-0 transition-opacity group-hover/badge:opacity-70" />
      )}
    </button>
  );
}

export const LeadsDesk: React.FC<LeadsDeskProps> = ({
  leads,
  activeDesk,
  profiles,
  onOpenAddLead,
  onViewLead,
  onUpdateLeadStage,
  onDeleteLead,
  onOpenSmartMatcherForLead,
  onOpenWhatsAppChat,
  onExportCsv,
  onAddCallLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'today' | 'overdue' | 'hot'>('all');
  const [intentFilter, setIntentFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [scoreFilter, setScoreFilter] = useState<string>('All');
  const [localityFilter, setLocalityFilter] = useState<string>('All');
  const [agentFilter, setAgentFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>('cards');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [promptCallLead, setPromptCallLead] = useState<ResaleLead | null>(null);

  const STAGE_CHIPS = [
    { label: 'All', value: 'All' },
    { label: 'New', value: 'new' },
    { label: 'Follow-up', value: 'contacted' },
    { label: 'Visit Booked', value: 'visit_scheduled' },
    { label: 'Visit Done', value: 'visit_done' },
    { label: 'Negotiation', value: 'negotiation' },
    { label: 'Token Paid', value: 'token_received' },
    { label: 'Converted', value: 'closed' },
    { label: 'Not Interested', value: 'lost' },
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  const agentOptions = useMemo(() => {
    const names = new Set<string>();
    profiles.forEach((p) => names.add(p.fullName));
    leads.forEach((l) => {
      if (l.assignedTo) names.add(l.assignedTo);
    });
    return Array.from(names).sort();
  }, [profiles, leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matchSearch =
          lead.name.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          lead.leadCode.toLowerCase().includes(q) ||
          (lead.email || '').toLowerCase().includes(q) ||
          lead.preferredLocalities.some((l) => l.toLowerCase().includes(q)) ||
          lead.notes.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      if (queueFilter === 'hot' && lead.priority !== 'hot') return false;
      if (queueFilter === 'today') {
        const fu = lead.nextFollowUp?.slice(0, 10);
        if (fu !== todayStr) return false;
      }
      if (queueFilter === 'overdue') {
        const fu = lead.nextFollowUp?.slice(0, 10);
        if (!fu || fu >= todayStr || lead.stage === 'closed' || lead.stage === 'lost') return false;
      }

      if (intentFilter !== 'All' && lead.intent !== intentFilter) return false;
      if (stageFilter !== 'All' && lead.stage !== stageFilter) return false;
      if (scoreFilter !== 'All' && lead.priority !== scoreFilter) return false;
      if (localityFilter !== 'All' && !lead.preferredLocalities.some((l) => l.toLowerCase().includes(localityFilter.toLowerCase()))) {
        return false;
      }
      if (agentFilter !== 'All' && lead.assignedTo !== agentFilter) return false;

      return true;
    });
  }, [leads, searchTerm, queueFilter, intentFilter, stageFilter, scoreFilter, localityFilter, agentFilter, todayStr]);

  const activeFiltersCount =
    (intentFilter !== 'All' ? 1 : 0) +
    (stageFilter !== 'All' ? 1 : 0) +
    (scoreFilter !== 'All' ? 1 : 0) +
    (localityFilter !== 'All' ? 1 : 0) +
    (agentFilter !== 'All' ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* ── EXACT SARASWATI NAGRI FILTERS & SEARCH PANEL (admin-dashboard.tsx line 2340) ── */}
      <div className="bg-slate-100/80 backdrop-blur p-2 md:p-2.5 rounded-xl md:rounded-2xl border border-slate-200 shadow-inner space-y-2">
        {/* Row 1: Search + View Switcher + Export */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Mobile, naam, code (L-1042) ya area se leads khojo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 md:py-2.5 text-sm font-bold border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
            <div className="flex items-center bg-white/90 border border-slate-200 p-1 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Pipeline Board"
              >
                <Columns3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs shadow-sm cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Queue Chips + Sales Team Dropdown + More Filters */}
        <div className="chip-row">
          <button
            type="button"
            onClick={() => setQueueFilter('all')}
            className={`text-[11px] font-bold px-3 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              queueFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'text-slate-500 border-slate-200 bg-white'
            }`}
          >
            Sabhi ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter('today')}
            className={`text-[11px] font-bold px-3 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              queueFilter === 'today'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'text-slate-500 border-slate-200 bg-white'
            }`}
          >
            Aaj
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter('overdue')}
            className={`text-[11px] font-bold px-3 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              queueFilter === 'overdue'
                ? 'bg-red-600 text-white border-red-600'
                : 'text-slate-500 border-slate-200 bg-white'
            }`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter('hot')}
            className={`text-[11px] font-bold px-3 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              queueFilter === 'hot'
                ? 'bg-orange-600 text-white border-orange-600'
                : 'text-slate-500 border-slate-200 bg-white'
            }`}
          >
            🔥 Hot
          </button>

          {/* Sales Team Picker */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-bold whitespace-nowrap cursor-pointer focus:outline-none ${
              agentFilter !== 'All'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'text-slate-600 border-slate-200 bg-white'
            }`}
          >
            <option value="All" className="text-slate-800 bg-white">Sales team (All)</option>
            {agentOptions.map((a) => (
              <option key={a} value={a} className="text-slate-800 bg-white">
                {a}
              </option>
            ))}
          </select>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setIntentFilter('All');
                setStageFilter('All');
                setScoreFilter('All');
                setLocalityFilter('All');
                setAgentFilter('All');
                setQueueFilter('all');
                setSearchTerm('');
              }}
              className="ml-auto text-[11px] font-bold px-2.5 py-1.5 inline-flex items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Clear filters
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`text-[11px] font-bold px-3 py-1.5 inline-flex items-center gap-1 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeFiltersCount > 0 ? 'ml-1' : 'ml-auto'
            } ${
              showAdvancedFilters || activeFiltersCount > 0
                ? 'bg-purple-600 text-white border-purple-600'
                : 'text-slate-500 border-slate-200 bg-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            {activeFiltersCount > 0 ? (
              <span className="bg-white text-purple-600 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            ) : (
              'Filters'
            )}
          </button>
        </div>

        {/* Row 3: Exact Saraswati Nagri Resale Desk Looking Chip Row */}
        {activeDesk === 'resale' && (
          <div className="chip-row pt-0.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider self-center shrink-0 pl-0.5">
              Looking:
            </span>
            <button
              type="button"
              onClick={() => setIntentFilter('All')}
              className={`text-[11px] font-bold px-2.5 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                intentFilter === 'All'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'text-slate-500 border-slate-200 bg-white'
              }`}
            >
              Sabhi
            </button>
            {RESALE_INTENT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setIntentFilter(o.value)}
                className={`text-[11px] font-bold px-2.5 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  intentFilter === o.value
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'text-slate-500 border-slate-200 bg-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* Collapsible Advanced Filters (Stage + Score + Location) */}
        {showAdvancedFilters && (
          <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
            <div className="chip-row">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider self-center shrink-0 pl-0.5">
                Stage:
              </span>
              {STAGE_CHIPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStageFilter(s.value)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    stageFilter === s.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'text-slate-500 border-slate-200 bg-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="chip-row">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider self-center shrink-0 pl-0.5">
                Score:
              </span>
              {[
                { label: 'All', val: 'All' },
                { label: '🔥 Hot', val: 'hot' },
                { label: 'Warm', val: 'warm' },
                { label: 'Cold', val: 'cold' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setScoreFilter(s.val)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 inline-flex items-center rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    scoreFilter === s.val
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'text-slate-500 border-slate-200 bg-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}

              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider self-center shrink-0 pl-2">
                Area:
              </span>
              <select
                value={localityFilter}
                onChange={(e) => setLocalityFilter(e.target.value)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border cursor-pointer focus:outline-none ${
                  localityFilter !== 'All'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'text-slate-500 border-slate-200 bg-white'
                }`}
              >
                <option value="All" className="text-slate-800 bg-white">All Areas</option>
                {NAGPUR_LOCALITIES.map((l) => (
                  <option key={l.name} value={l.name} className="text-slate-800 bg-white">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Count Line */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-400">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center flex flex-col items-center px-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Koi lead nahi mili</h3>
          <p className="text-xs text-slate-400 mt-1">Filters badlo ya nayi lead add karo.</p>
          <button
            type="button"
            onClick={onOpenAddLead}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      ) : (
        <>
          {/* ── VIEW 1: EXACT SARASWATI NAGRI 2-COL GLASSMORPHIC CARD GRID ── */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredLeads.map((lead) => {
                const daysInSystem = daysSinceIso(lead.createdAt) ?? 0;
                const lastContactDays = daysSinceIso(lead.lastContactedAt);
                const fuDate = lead.nextFollowUp?.slice(0, 10);
                const isOverdue = Boolean(fuDate && fuDate < todayStr && lead.stage !== 'closed' && lead.stage !== 'lost');

                return (
                  <div
                    key={lead.id}
                    onClick={() => onViewLead(lead)}
                    className="relative bg-white/75 backdrop-blur-xl border border-white/70 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(147,51,234,0.08)] hover:-translate-y-0.5 hover:border-purple-300/60 hover:bg-white transition-all duration-300 cursor-pointer flex flex-col gap-2.5 md:gap-3 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Top Header: Avatar + Name + Code + Badges */}
                    <div className="relative z-10 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-3">
                      <div className="flex w-full items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-black text-slate-800 truncate group-hover:text-purple-700 transition-colors"
                            title={lead.name}
                          >
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <LeadCodeBadge code={lead.leadCode} />
                            <span className="text-[10px] text-slate-400 font-semibold hidden md:inline">
                              {daysInSystem} days in system
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap shrink-0">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            lead.priority === 'hot'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : lead.priority === 'warm'
                              ? 'bg-orange-50 text-orange-600 border-orange-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}
                        >
                          {lead.priority === 'hot' ? '🔥 Hot' : lead.priority === 'warm' ? 'Warm' : 'Cold'}
                        </span>

                        {typeof lead.aiScore === 'number' && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> AI {lead.aiScore}
                          </span>
                        )}

                        <span className="text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          {lead.rawStatus || LEAD_STAGES.find((s) => s.key === lead.stage)?.label || lead.stage}
                        </span>
                      </div>
                    </div>

                    {/* Middle Body: Intent + Resale Tag + Location + Budget + Source */}
                    <div className="relative z-10 flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 leading-snug">
                          {lead.intent}
                          {lead.plotInterest ? ` · ${lead.plotInterest}` : ''}
                        </p>
                        {isResaleIntent(lead.intent) && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-teal-700">
                            {RESALE_TAG} · {RESALE_BRAND}
                          </span>
                        )}
                        <p className="text-[10px] text-blue-500/90 font-bold mt-1 flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.preferredLocalities.join(', ') || 'Nagpur'}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {lead.budgetDisplay && lead.budgetDisplay !== 'Budget missing' ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded inline-block">
                            {lead.budgetDisplay}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold">Budget missing</span>
                        )}
                        {lead.source && (
                          <p className="text-[9px] text-slate-400 font-semibold mt-1 hidden md:block">
                            Source: {lead.source}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle Gray Info Strip */}
                    <div className="relative z-10 flex items-center justify-between bg-slate-50 p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-100 group-hover:bg-purple-50/30 transition-colors">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserCircle
                          className={`w-4 h-4 shrink-0 ${
                            lead.assignedTo === 'Unassigned' ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold truncate ${
                            lead.assignedTo === 'Unassigned' ? 'text-amber-600' : 'text-slate-600'
                          }`}
                        >
                          {lead.assignedTo}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOverdue && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                            OVERDUE
                          </span>
                        )}
                        <div
                          className={`text-[10px] font-bold flex items-center gap-1.5 ${
                            isOverdue
                              ? 'text-red-600'
                              : lead.nextFollowUp
                              ? 'text-slate-600'
                              : 'text-slate-400 italic'
                          }`}
                        >
                          <Calendar className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                          {fuDate || 'Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Latest Call Outcome Section (Exact Saraswati Nagri CRM design) */}
                    {(() => {
                      const latestCall = lead.callLogs && lead.callLogs.length > 0 ? lead.callLogs[0] : null;
                      if (latestCall) {
                        const callDays = daysSinceIso(latestCall.date);
                        return (
                          <div className="relative z-10 flex flex-col gap-1 rounded-xl bg-slate-50/90 border border-slate-200/80 p-2 text-xs">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CallOutcomeBadge outcome={latestCall.outcome} />
                                <span className="text-[10px] text-slate-500 font-semibold truncate">
                                  by {latestCall.caller}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-medium shrink-0">
                                {callDays === null ? '' : callDays === 0 ? 'Aaj' : callDays === 1 ? 'Kal' : `${callDays} din pehle`}
                              </span>
                            </div>
                            {latestCall.notes && (
                              <p className="text-[11px] text-slate-600 line-clamp-1 italic pl-0.5">
                                &ldquo;{latestCall.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="relative z-10 flex items-center justify-between rounded-xl bg-slate-50/50 border border-dashed border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-400">
                          <span>Abhi tak koi call outcome record nahi hai</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromptCallLead(lead);
                            }}
                            className="text-[10px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                          >
                            + Log Outcome
                          </button>
                        </div>
                      );
                    })()}

                    {/* Footer: Phone + Contact Pulse + Action Icons */}
                    <div className="relative z-10 flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex flex-col min-w-0">
                        <p className="text-[10px] text-slate-500 font-semibold">{lead.phone}</p>
                        <p
                          className={`text-[9px] mt-0.5 font-bold ${
                            lastContactDays === null
                              ? 'text-amber-500'
                              : lastContactDays > 7
                              ? 'text-red-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {lastContactDays === null
                            ? 'Abhi tak baat nahi hui'
                            : lastContactDays <= 0
                            ? 'Aaj baat hui'
                            : `Aakhri baat ko ${lastContactDays} din`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSmartMatcherForLead(lead);
                          }}
                          title="Match Properties"
                          className="h-9 px-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer border border-amber-100"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Match</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenWhatsAppChat) {
                              onOpenWhatsAppChat(lead);
                            }
                          }}
                          title="Open WhatsApp in CRM (Saraswati Nagri)"
                          className="h-9 w-9 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white flex items-center justify-center transition-colors border border-green-100 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <a
                          href={`tel:+91${lead.phone.replace(/\D/g, '').slice(-10)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPromptCallLead(lead);
                          }}
                          title="Call & Log Outcome"
                          className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors border border-blue-100"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewLead(lead);
                          }}
                          className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-purple-50 group-hover:border-purple-200 group-hover:text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── VIEW 2: TABLE VIEW ── */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Looking For</th>
                    <th className="px-4 py-3">Areas</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Latest Call Outcome</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => onViewLead(lead)}
                      className="hover:bg-purple-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LeadCodeBadge code={lead.leadCode} />
                          <div>
                            <p className="font-black text-slate-800">{lead.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{lead.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{lead.intent}</p>
                        {isResaleIntent(lead.intent) && (
                          <span className="text-[9px] font-black text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Resale · Nagpur Properties
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-semibold">
                        {lead.preferredLocalities.join(', ')}
                      </td>
                      <td className="px-4 py-3 font-black text-emerald-700">{lead.budgetDisplay}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.stage}
                          onChange={(e) => onUpdateLeadStage(lead.id, e.target.value as LeadStage)}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          {LEAD_STAGES.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {lead.callLogs && lead.callLogs.length > 0 ? (
                          <div className="space-y-1">
                            <CallOutcomeBadge outcome={lead.callLogs[0].outcome} />
                            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]" title={lead.callLogs[0].notes}>
                              {lead.callLogs[0].notes}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              by {lead.callLogs[0].caller}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPromptCallLead(lead)}
                            className="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                          >
                            + Log Outcome
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-semibold">{lead.assignedTo}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `tel:+91${lead.phone.replace(/\D/g, '').slice(-10)}`;
                              setPromptCallLead(lead);
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            title="Call & Log Outcome"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenSmartMatcherForLead(lead)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                            title="Smart Match"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove lead ${lead.name}?`)) onDeleteLead(lead.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── VIEW 3: KANBAN PIPELINE VIEW ── */}
          {viewMode === 'kanban' && (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {LEAD_STAGES.filter((s) => s.key !== 'lost').map((stageObj) => {
                const colLeads = filteredLeads.filter((l) => l.stage === stageObj.key);
                return (
                  <div
                    key={stageObj.key}
                    className="w-72 shrink-0 rounded-2xl bg-slate-100/80 border border-slate-200 flex flex-col max-h-[70vh]"
                  >
                    <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                      <span className="text-xs font-black text-slate-800">{stageObj.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                        {colLeads.length}
                      </span>
                    </div>
                    <div className="p-2.5 space-y-2 overflow-y-auto flex-1">
                      {colLeads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => onViewLead(l)}
                          className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <LeadCodeBadge code={l.leadCode} />
                            <span className="text-[10px] font-black text-emerald-700">{l.budgetDisplay}</span>
                          </div>
                          <p className="text-xs font-black text-slate-800 truncate">{l.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{l.preferredLocalities.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 1-Tap Call Outcome Prompt Modal (Exact Saraswati Nagri CRM design) */}
      <CallOutcomePromptModal
        lead={promptCallLead}
        isOpen={Boolean(promptCallLead)}
        onClose={() => setPromptCallLead(null)}
        onSaveOutcome={async (leadId, log) => {
          if (onAddCallLog) {
            await onAddCallLog(leadId, log);
          }
        }}
      />
    </div>
  );
};
