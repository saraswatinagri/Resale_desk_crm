import React from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Clock,
  ShieldCheck,
  ChevronRight,
  Home,
  Tag,
  Lock
} from 'lucide-react';
import { ResaleLead, ResaleProperty } from '../../types/crm';
import { formatIndianCurrency, generateWhatsAppLink } from '../../utils/formatters';
import { LEAD_STAGES } from '../../data/constants';
import { useAuth } from '../../lib/auth-context';
import { canUserCallLead } from '../../lib/lead-permissions';

interface DashboardOverviewProps {
  properties: ResaleProperty[];
  leads: ResaleLead[];
  onSelectTab: (tab: 'dashboard' | 'leads' | 'properties' | 'matcher' | 'visits') => void;
  onOpenAddLead: () => void;
  onOpenAddProperty: () => void;
  onViewLead: (lead: ResaleLead) => void;
  onViewProperty: (prop: ResaleProperty) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  properties,
  leads,
  onSelectTab,
  onOpenAddLead,
  onOpenAddProperty,
  onViewLead,
  onViewProperty
}) => {
  const { user } = useAuth();
  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => p.status === 'available');
  const totalInventoryValue = properties.reduce((sum, p) => sum + (p.transactionType === 'resale' ? p.priceNumeric : 0), 0);
  
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.priority === 'hot');
  const visitsScheduled = leads.filter(l => l.stage === 'visit_scheduled').length;
  const closedDeals = leads.filter(l => l.stage === 'closed' || l.stage === 'token_received').length;

  // Localities breakdown
  const localityCounts: Record<string, number> = {};
  properties.forEach(p => {
    localityCounts[p.locality] = (localityCounts[p.locality] || 0) + 1;
  });
  const topLocalities = Object.entries(localityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Stage counts for pipeline
  const stageCounts: Record<string, number> = {};
  leads.forEach(l => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (Saraswati Nagri / Nagpur Properties Hero) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 p-4 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Resale Desk Active
              </span>
              <span className="text-xs text-slate-300 font-medium">Nagpur Properties &amp; Saraswati Nagri CRM</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Nagpur Real Estate Resale Desk
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Managing verified property listings across Besa, Wardha Road, Hingna, and Manish Nagar, matched with active buyer and tenant requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenAddLead}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Add Lead</span>
            </button>

            <button
              onClick={onOpenAddProperty}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Property</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Exact Saraswati Nagri CRM Styling - Responsive 2 Cols on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Listings */}
        <div 
          onClick={() => onSelectTab('properties')}
          className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider truncate">Properties</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-3xl font-black text-slate-800">{totalProperties}</span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600">({availableProperties.length} Avail)</span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 truncate">
            Val: <strong className="text-slate-800">{formatIndianCurrency(totalInventoryValue)}</strong>
          </p>
        </div>

        {/* Total Leads */}
        <div 
          onClick={() => onSelectTab('leads')}
          className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider truncate">Active Leads</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-3xl font-black text-slate-800">{totalLeads}</span>
            <span className="text-[10px] sm:text-xs font-bold text-rose-600">({hotLeads.length} Hot)</span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 truncate">
            {leads.filter(l => l.intent.includes('Buy')).length} Buyers • {leads.filter(l => l.intent.includes('Rent')).length} Tenants
          </p>
        </div>

        {/* Site Visits */}
        <div 
          onClick={() => onSelectTab('visits')}
          className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider truncate">Site Visits</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-slate-800">{visitsScheduled}</span>
            <span className="text-[10px] sm:text-xs font-bold text-amber-600">Scheduled</span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 truncate">
            Field visits in Besa &amp; Wardha Rd
          </p>
        </div>

        {/* Token Received / Converted */}
        <div 
          onClick={() => onSelectTab('leads')}
          className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider truncate">Bookings</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-slate-800">{closedDeals}</span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600">Converted</span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 truncate">
            Tokens &amp; Registrations
          </p>
        </div>

      </div>

      {/* Conversion Pipeline Stages (Exact Saraswati Nagri CRM) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Lead Conversion Pipeline
            </h2>
            <p className="text-xs text-slate-500">Progression across pre-sales stages</p>
          </div>
          <button 
            onClick={() => onSelectTab('leads')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View All Leads</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {LEAD_STAGES.map(stage => {
            const count = stageCounts[stage.key] || 0;
            return (
              <div 
                key={stage.key}
                onClick={() => onSelectTab('leads')}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-500 transition-all cursor-pointer flex flex-col justify-between"
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider line-clamp-1">
                  {stage.label}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-800">{count}</span>
                  <span className="text-[10px] font-bold text-teal-700">
                    {Math.round((count / (totalLeads || 1)) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hot Leads & Nagpur Corridors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hot Priority Leads (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Immediate Action & Hot Leads
              </h2>
              <p className="text-xs text-slate-500">Prospects requiring follow-up or scheduled visits</p>
            </div>
            <button
              onClick={() => onSelectTab('leads')}
              className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>Manage Desk ({totalLeads})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {leads.slice(0, 4).map(lead => (
              <div
                key={lead.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="cursor-pointer" onClick={() => onViewLead(lead)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                      {lead.leadCode}
                    </span>
                    <span className="font-bold text-sm text-slate-800 group-hover:text-teal-700 transition-colors">
                      {lead.name}
                    </span>
                    {lead.priority === 'hot' && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        🔥 Hot
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Looking for <strong className="text-slate-700">{lead.intent.replace('Wants to ', '')}</strong> •{' '}
                    <strong className="text-teal-700">{lead.budgetDisplay}</strong> in {lead.preferredLocalities.join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <a
                    href={generateWhatsAppLink(lead.whatsapp || lead.phone, `Namaste ${lead.name} ji, regarding your property requirement:`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>

                  {(() => {
                    const { canCall, reason } = canUserCallLead(user, lead);
                    return canCall ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                        title="Call lead"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alert(reason || 'Call restricted to assigned executive')}
                        className="p-2 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 transition-colors cursor-not-allowed opacity-70"
                        title={reason}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => onViewLead(lead)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Localities & Smart Matcher Teaser (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Nagpur Corridors Inventory
            </h2>
            <p className="text-xs text-slate-500 mb-3">Listings distribution across active corridors</p>

            <div className="space-y-2">
              {topLocalities.map(([locName, count]) => (
                <div key={locName} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-700">{locName}</span>
                  <span className="font-mono text-teal-700 font-extrabold">{count} listings</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold shadow-md">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Smart Match Engine</h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Automatically match registered buyer requirements with inventory properties by budget, BHK, and corridor.
                </p>
                <button
                  onClick={() => onSelectTab('matcher')}
                  className="mt-3 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <span>Launch Matcher</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
