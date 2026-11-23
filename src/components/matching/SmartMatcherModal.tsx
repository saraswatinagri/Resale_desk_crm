import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Building2, 
  Users, 
  Send, 
  CheckCircle2, 
  MapPin, 
  IndianRupee,
  Phone,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Lock
} from 'lucide-react';
import { ResaleLead, ResaleProperty, MatchScore } from '../../types/crm';
import { 
  getMatchingPropertiesForLead, 
  getMatchingLeadsForProperty 
} from '../../utils/matcher';
import { 
  formatIndianCurrency, 
  generateWhatsAppLink, 
  buildPropertyPitchMessage 
} from '../../utils/formatters';
import { useAuth } from '../../lib/auth-context';
import { canUserCallLead } from '../../lib/lead-permissions';

interface SmartMatcherModalProps {
  leads: ResaleLead[];
  properties: ResaleProperty[];
  initialSelectedLead?: ResaleLead | null;
  initialSelectedProperty?: ResaleProperty | null;
  onViewLead: (lead: ResaleLead) => void;
  onViewProperty: (prop: ResaleProperty) => void;
}

export const SmartMatcherModal: React.FC<SmartMatcherModalProps> = ({
  leads,
  properties,
  initialSelectedLead,
  initialSelectedProperty,
  onViewLead,
  onViewProperty
}) => {
  const { user } = useAuth();
  const [matchMode, setMatchMode] = useState<'by_lead' | 'by_property'>(
    initialSelectedProperty ? 'by_property' : 'by_lead'
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialSelectedLead?.id || leads[0]?.id || ''
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    initialSelectedProperty?.id || properties[0]?.id || ''
  );

  const currentLead = leads.find(l => l.id === selectedLeadId) || leads[0];
  const currentProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  const matchedProperties: MatchScore[] = currentLead 
    ? getMatchingPropertiesForLead(currentLead, properties) 
    : [];

  const matchedLeads = currentProperty 
    ? getMatchingLeadsForProperty(currentProperty, leads) 
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Smart Match Engine</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Algorithmic matchmaking pairing verified buyer leads with active resale properties
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-xl bg-white border border-slate-200 p-1 shadow-sm overflow-x-auto scrollbar-hide max-w-full shrink-0">
          <button
            onClick={() => setMatchMode('by_lead')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              matchMode === 'by_lead'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Find Properties for Lead</span>
          </button>

          <button
            onClick={() => setMatchMode('by_property')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              matchMode === 'by_property'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Find Buyers for Property</span>
          </button>
        </div>
      </div>

      {/* MATCH BY LEAD SECTION */}
      {matchMode === 'by_lead' && (
        <div className="space-y-6">
          
          {/* Lead Picker Card */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Client / Lead to Match:
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.leadCode} • {lead.name} — {lead.intent.replace('Wants to ', '')} ({lead.budgetDisplay}) in {lead.preferredLocalities.join(', ')}
                </option>
              ))}
            </select>

            {currentLead && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">{currentLead.leadCode}</span>
                    <h3 className="font-bold text-slate-900 text-sm">{currentLead.name}</h3>
                    <span className="text-slate-500 font-mono">({currentLead.phone})</span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Seeking: <strong className="text-emerald-700">{currentLead.budgetDisplay}</strong> in{' '}
                    <strong className="text-slate-800">{currentLead.preferredLocalities.join(', ')}</strong>{' '}
                    • {currentLead.bhkPreference.join(', ') || 'Any BHK'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const { canCall, reason } = canUserCallLead(user, currentLead);
                    return canCall ? (
                      <a
                        href={`tel:${currentLead.phone}`}
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                        title="Call"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alert(reason || 'Call restricted to assigned executive')}
                        className="p-2 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 opacity-70 cursor-not-allowed"
                        title={reason}
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => onViewLead(currentLead)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-sm"
                  >
                    View Lead Profile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results: Matching Properties */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Matched Properties ({matchedProperties.length})
              </h2>
              <span className="text-xs text-slate-500">Ranked by compatibility score</span>
            </div>

            {matchedProperties.length === 0 ? (
              <div className="rounded-2xl p-10 text-center bg-white border border-slate-200 shadow-sm">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-bold">No direct match found for this lead's current filters.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try checking broader locations or adding new properties in {currentLead?.preferredLocalities.join(', ')}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchedProperties.map(({ property, score, reasons }) => (
                  <div
                    key={property.id}
                    className="rounded-2xl p-5 bg-white border border-slate-200 hover:border-teal-400 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {property.locality}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                          score >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {score}% Match
                        </span>
                      </div>

                      <h3 
                        onClick={() => onViewProperty(property)}
                        className="text-sm font-bold text-slate-900 hover:text-teal-700 transition-colors cursor-pointer line-clamp-1"
                      >
                        {property.title}
                      </h3>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-slate-900">{property.price}</span>
                        <span className="text-xs text-slate-500">• {property.areaSqFt} sq.ft ({property.bhk || 'Plot'})</span>
                      </div>

                      {/* Reasons */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {reasons.map((r, i) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onViewProperty(property)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        View Specs
                      </button>

                      <a
                        href={generateWhatsAppLink(
                          currentLead.whatsapp || currentLead.phone,
                          buildPropertyPitchMessage(
                            currentLead.name,
                            property.title,
                            property.locality,
                            property.price,
                            property.areaSqFt,
                            property.bhk
                          )
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send WhatsApp Pitch</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MATCH BY PROPERTY SECTION */}
      {matchMode === 'by_property' && (
        <div className="space-y-6">
          
          {/* Property Picker Card */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Inventory Property to Match Buyers:
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.price} ({p.locality}, {p.areaSqFt} sq.ft)
                </option>
              ))}
            </select>

            {currentProperty && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{currentProperty.title}</h3>
                  <p className="text-slate-600 mt-0.5">
                    Price: <strong className="text-emerald-700">{currentProperty.price}</strong> • Location: <strong className="text-slate-800">{currentProperty.locality}</strong> • Area: {currentProperty.areaSqFt} sq.ft
                  </p>
                </div>

                <button
                  onClick={() => onViewProperty(currentProperty)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-sm"
                >
                  View Property Specs
                </button>
              </div>
            )}
          </div>

          {/* Results: Matching Leads */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />
                Matched Buyer & Tenant Leads ({matchedLeads.length})
              </h2>
              <span className="text-xs text-slate-500">Clients looking for properties like this</span>
            </div>

            {matchedLeads.length === 0 ? (
              <div className="rounded-2xl p-10 text-center bg-white border border-slate-200 shadow-sm">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-bold">No registered leads match this property right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchedLeads.map(({ lead, score, reasons }) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl p-4 bg-white border border-slate-200 hover:border-teal-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-teal-700 font-bold text-[10px] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {lead.leadCode}
                        </span>
                        <h4 
                          onClick={() => onViewLead(lead)}
                          className="font-bold text-slate-900 text-sm hover:text-teal-700 cursor-pointer"
                        >
                          {lead.name}
                        </h4>
                        <span className="font-mono text-slate-500">({lead.phone})</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          score >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {score}% Match
                        </span>
                      </div>

                      <p className="text-slate-600 mt-1">
                        Budget: <strong className="text-emerald-700">{lead.budgetDisplay}</strong> • Prefers: {lead.preferredLocalities.join(', ')}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {reasons.map((r, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={generateWhatsAppLink(
                          lead.whatsapp || lead.phone,
                          buildPropertyPitchMessage(
                            lead.name,
                            currentProperty.title,
                            currentProperty.locality,
                            currentProperty.price,
                            currentProperty.areaSqFt,
                            currentProperty.bhk
                          )
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Pitch via WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
