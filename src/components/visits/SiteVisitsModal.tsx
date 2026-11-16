import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  MessageSquare, 
  Building2,
  CalendarCheck
} from 'lucide-react';
import { ResaleLead, ResaleProperty, ScheduledVisit } from '../../types/crm';
import { 
  formatDate, 
  generateWhatsAppLink, 
  buildSiteVisitWhatsAppMessage 
} from '../../utils/formatters';

interface SiteVisitsDeskProps {
  leads: ResaleLead[];
  properties: ResaleProperty[];
  onViewLead: (lead: ResaleLead) => void;
  onViewProperty: (prop: ResaleProperty) => void;
}

export const SiteVisitsDesk: React.FC<SiteVisitsDeskProps> = ({
  leads,
  properties,
  onViewLead,
  onViewProperty
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Flatten all visits with their associated lead info
  const allVisits: Array<{
    visit: ScheduledVisit;
    lead: ResaleLead;
  }> = [];

  leads.forEach(lead => {
    if (lead.visits && lead.visits.length > 0) {
      lead.visits.forEach(v => {
        allVisits.push({ visit: v, lead });
      });
    }
  });

  const filteredVisits = allVisits.filter(({ visit }) => {
    if (filterStatus === 'all') return true;
    return visit.status === filterStatus;
  }).sort((a, b) => new Date(b.visit.date).getTime() - new Date(a.visit.date).getTime());

  const scheduledCount = allVisits.filter(v => v.visit.status === 'scheduled').length;
  const completedCount = allVisits.filter(v => v.visit.status === 'completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Site Visits Scheduler</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {scheduledCount} Active Schedules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordination console for field executives showing properties in Besa, Wardha Road, and Hingna
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            <option value="all">All Visits ({allVisits.length})</option>
            <option value="scheduled">🟡 Scheduled / Upcoming ({scheduledCount})</option>
            <option value="completed">🟢 Completed Visits ({completedCount})</option>
          </select>
        </div>
      </div>

      {/* Visits List */}
      {filteredVisits.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No site visits found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You can schedule site visits directly from any lead drawer or during lead qualification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map(({ visit, lead }) => {
            const prop = properties.find(p => p.id === visit.propertyId);

            return (
              <div 
                key={visit.id}
                className="rounded-2xl p-5 bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  
                  {/* Status & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      📅 {visit.date} • {visit.time}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      visit.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {visit.status}
                    </span>
                  </div>

                  {/* Property Name */}
                  <h3 
                    onClick={() => prop && onViewProperty(prop)}
                    className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-1"
                  >
                    {visit.propertyTitle || 'Property Site Visit'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-teal-600" />
                    <span>{visit.propertyLocality || prop?.locality || 'Nagpur'}</span>
                  </p>

                  {/* Client Details */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Client:</span>
                      <strong 
                        onClick={() => onViewLead(lead)}
                        className="text-slate-800 hover:text-teal-700 cursor-pointer"
                      >
                        {lead.name}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-mono text-slate-700">{lead.phone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Assigned Incharge:</span>
                      <span className="font-semibold text-slate-800">{visit.agent}</span>
                    </div>

                    {visit.feedback && (
                      <p className="pt-1 text-[11px] text-slate-600 italic">
                        Feedback: "{visit.feedback}"
                      </p>
                    )}
                  </div>

                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${lead.phone}`}
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold"
                    title="Call Client"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>

                  <a
                    href={generateWhatsAppLink(
                      lead.whatsapp || lead.phone,
                      buildSiteVisitWhatsAppMessage(
                        lead.name,
                        visit.propertyTitle || 'Property',
                        visit.propertyLocality || 'Nagpur',
                        visit.date,
                        visit.time,
                        visit.agent,
                        '9822451080'
                      )
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Send Reminder</span>
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
