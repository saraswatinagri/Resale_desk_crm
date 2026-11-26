import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  Phone,
  MessageSquare,
  LayoutGrid,
  FileText,
  Trash2,
  ChevronRight,
  Layers,
  Ruler,
  Share2,
  Bot,
} from 'lucide-react';
import { ResaleProperty, PropertyStatus, SaraswatiProject } from '../../types/crm';
import { generateWhatsAppLink, formatPropertyForWhatsAppPost } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import { NAGPUR_LOCALITIES } from '../../data/constants';

interface PropertiesDeskProps {
  properties: ResaleProperty[];
  saraswatiProjects?: SaraswatiProject[];
  onOpenAddProperty: () => void;
  onOpenAddFromWhatsApp?: () => void;
  onOpenWhatsAppPropertyInbox?: () => void;
  onOpenWhatsAppConnect?: () => void;
  onViewProperty: (prop: ResaleProperty) => void;
  onUpdatePropertyStatus: (propId: string, status: PropertyStatus) => void;
  onDeleteProperty: (propId: string) => void;
  onOpenSmartMatcherForProperty: (prop: ResaleProperty) => void;
}

export const PropertiesDesk: React.FC<PropertiesDeskProps> = ({
  properties,
  saraswatiProjects = [],
  onOpenAddProperty,
  onOpenAddFromWhatsApp,
  onOpenWhatsAppPropertyInbox,
  onOpenWhatsAppConnect,
  onViewProperty,
  onUpdatePropertyStatus,
  onDeleteProperty,
  onOpenSmartMatcherForProperty,
}) => {
  const [inventoryTab, setInventoryTab] = useState<'resale' | 'layouts'>('resale');
  const [searchTerm, setSearchTerm] = useState('');
  const [localityFilter, setLocalityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedPropId, setCopiedPropId] = useState<string | null>(null);

  const handleSharePropertyWhatsApp = (prop: ResaleProperty, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const formatted = formatPropertyForWhatsAppPost(prop);
    navigator.clipboard.writeText(formatted);
    setCopiedPropId(prop.id);
    toast.success(`Copied "${prop.title}" WhatsApp brochure! Opening WhatsApp...`);
    setTimeout(() => setCopiedPropId(null), 3000);

    const shareUrl = `https://wa.me/?text=${encodeURIComponent(formatted)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const match =
          prop.title.toLowerCase().includes(q) ||
          prop.locality.toLowerCase().includes(q) ||
          prop.address.toLowerCase().includes(q) ||
          prop.price.toLowerCase().includes(q) ||
          (prop.propertyCode || '').toLowerCase().includes(q) ||
          (prop.bhk && prop.bhk.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (localityFilter !== 'all' && prop.locality !== localityFilter) return false;
      if (statusFilter !== 'all' && prop.status !== statusFilter) return false;
      if (transactionFilter !== 'all' && prop.transactionType !== transactionFilter) return false;
      return true;
    });
  }, [properties, searchTerm, localityFilter, statusFilter, transactionFilter]);

  const filteredProjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return saraswatiProjects.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.projectCode || '').toLowerCase().includes(q)
    );
  }, [saraswatiProjects, searchTerm]);

  const statusBadgeColor: Record<PropertyStatus, string> = {
    available: 'bg-emerald-500 text-white',
    under_discussion: 'bg-amber-500 text-white',
    token_received: 'bg-purple-600 text-white',
    sold: 'bg-slate-600 text-white',
    rented: 'bg-blue-600 text-white',
  };

  const statusLabel: Record<PropertyStatus, string> = {
    available: 'Available',
    under_discussion: 'In Discussion',
    token_received: 'Token Paid',
    sold: 'Sold Out',
    rented: 'Rented',
  };

  const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All Properties' },
    { key: 'available', label: 'Available' },
    { key: 'under_discussion', label: 'In Discussion' },
    { key: 'token_received', label: 'Token Paid' },
    { key: 'sold', label: 'Sold Out' },
    { key: 'rented', label: 'Rented' },
  ];

  return (
    <div className="space-y-5">
      {/* ── EXACT SARASWATI NAGRI SEGMENTED BAR (projects/client.tsx line 660) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full max-w-full">
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 sm:p-1.5 shadow-inner overflow-x-auto scrollbar-hide w-full sm:w-auto max-w-full">
          <button
            type="button"
            onClick={() => setInventoryTab('resale')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              inventoryTab === 'resale' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Resale &amp; Rent Properties</span>
            <span
              className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-black ${
                inventoryTab === 'resale' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {properties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setInventoryTab('layouts')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              inventoryTab === 'layouts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Saraswati Nagri Layouts</span>
            <span
              className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-black ${
                inventoryTab === 'layouts' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {saraswatiProjects.length}
            </span>
          </button>
        </div>

        {/* Action buttons: WhatsApp Ingestion Queue + Register Property (Full Mobile Adaptive) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {onOpenWhatsAppPropertyInbox && (
            <button
              type="button"
              onClick={onOpenWhatsAppPropertyInbox}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer relative"
              title="Open Direct WhatsApp Inbound Queue - 1-click review & publish incoming properties"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
              <span className="hidden xs:inline">WhatsApp Inbound Queue</span>
              <span className="xs:hidden">Inbound Queue</span>
            </button>
          )}

          {onOpenAddFromWhatsApp && (
            <button
              type="button"
              onClick={onOpenAddFromWhatsApp}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs shadow-2xs transition-all cursor-pointer"
              title="Add property with Direct WhatsApp importer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xs:inline">Insert via WhatsApp</span>
              <span className="xs:hidden">WhatsApp Import</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddProperty}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Register Property</span>
            <span className="xs:hidden">Register</span>
          </button>
        </div>
      </div>

      {/* ── EXACT SARASWATI NAGRI SEARCH & FILTER BAR (projects/client.tsx line 685) ── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-100/80 backdrop-blur p-2 rounded-2xl border border-slate-200 shadow-inner">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              inventoryTab === 'resale'
                ? 'Search by property title, locality, BHK, or code...'
                : 'Search Saraswati Nagri layouts by name or location...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-xs"
          />
        </div>

        {inventoryTab === 'resale' && (
          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-1 sm:flex-none min-w-0">
              <select
                value={transactionFilter}
                onChange={(e) => setTransactionFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-2.5 bg-white border-none rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer truncate"
              >
                <option value="all">Buy &amp; Rent (All)</option>
                <option value="resale">For Sale / Resale</option>
                <option value="rent">For Rent / Lease</option>
              </select>

              <select
                value={localityFilter}
                onChange={(e) => setLocalityFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-2.5 bg-white border-none rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer truncate"
              >
                <option value="all">All Nagpur Areas</option>
                {NAGPUR_LOCALITIES.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle (Exact from projects/client.tsx line 706) */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-amber-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-amber-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List View"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RESALE & RENT PROPERTIES TAB ── */}
      {inventoryTab === 'resale' && (
        <>
          {/* Quick Status Filter Pills (Exact from projects/client.tsx line 724) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
            {STATUS_FILTERS.map((s) => {
              const isSelected = statusFilter === s.key;
              const count =
                s.key === 'all'
                  ? properties.length
                  : properties.filter((p) => p.status === s.key).length;
              if (s.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{s.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredProperties.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-4">
              <Building2 className="w-14 h-14 text-slate-200 mb-3" />
              <h3 className="text-lg font-black text-slate-800">No properties found</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Adjust your filters or register a new resale property.
              </p>
              <button
                type="button"
                onClick={onOpenAddProperty}
                className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 py-2 font-bold text-xs shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Register New Property
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID CARDS (Exact projects/client.tsx card design) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProperties.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => onViewProperty(prop)}
                  style={{ borderTopColor: '#F59E0B', borderTopWidth: 3 }}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  {/* Cover Image Header */}
                  <div className="h-44 sm:h-48 bg-amber-50 relative overflow-hidden">
                    {prop.images[0] ? (
                      <img
                        src={prop.images[0]}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-20 h-20 text-amber-200" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-slate-900/10 z-10" />

                    {/* Top Right Badges */}
                    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md ${statusBadgeColor[prop.status]}`}
                      >
                        {statusLabel[prop.status]}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white shadow-md bg-teal-600">
                        {prop.transactionType === 'rent' ? 'For Rent' : 'Resale'}
                      </span>
                    </div>

                    {/* Top Left Verified Badge */}
                    {prop.isVerified && (
                      <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-emerald-700 text-[10px] font-black shadow-md">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{prop.legalStatus.nmrdaApproved ? 'NMRDA Verified' : 'Clear Title'}</span>
                      </div>
                    )}

                    {/* Bottom Cover Title & Location */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 z-20">
                      <h3 className="text-sm sm:text-base font-black text-white leading-tight line-clamp-1 mb-0.5">
                        {prop.title}
                      </h3>
                      <p className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{prop.locality}, Nagpur</span>
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 sm:p-5 flex-1 space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base sm:text-lg font-black text-slate-900">{prop.price}</span>
                      {prop.propertyCode && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {prop.propertyCode}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {prop.description}
                    </p>

                    {/* 3-Tile Metrics (Matching Total/Sold/Vacant tiles in projects/client.tsx) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-xl p-1.5 sm:p-2 border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-500 uppercase">Area</p>
                        <p className="text-xs font-black text-slate-800">{prop.areaSqFt} sqft</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-1.5 sm:p-2 border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-500 uppercase">Config</p>
                        <p className="text-xs font-black text-emerald-700 truncate">
                          {prop.bhk || prop.category}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-1.5 sm:p-2 border border-amber-100 text-center">
                        <p className="text-[8px] font-black text-amber-800 uppercase">Facing</p>
                        <p className="text-xs font-black text-amber-700">{prop.facing || 'East'}</p>
                      </div>
                    </div>

                    {/* Amenities */}
                    {prop.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {prop.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100"
                          >
                            {a}
                          </span>
                        ))}
                        {prop.amenities.length > 3 && (
                          <span className="text-[9px] font-bold text-slate-500 self-center">
                            +{prop.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer (Exact projects/client.tsx footer) */}
                  <div
                    className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-amber-50/50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenSmartMatcherForProperty(prop)}
                        title="Find Matching Buyer Leads"
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSharePropertyWhatsApp(prop, e)}
                        title="Copy & Share Property on WhatsApp"
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          copiedPropId === prop.id
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {prop.owner.phone && (
                        <a
                          href={`tel:${prop.owner.phone}`}
                          title={`Call Owner: ${prop.owner.name}`}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {prop.owner.phone && (
                        <a
                          href={generateWhatsAppLink(
                            prop.owner.whatsapp || prop.owner.phone,
                            `Namaste ${prop.owner.name} ji, regarding your property "${prop.title}" on Nagpur Properties Resale Desk:`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp Owner"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewProperty(prop)}
                      className="text-xs font-black text-slate-800 group-hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Property</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── LIST TABLE (Exact projects/client.tsx table design) ── */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Location
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Price
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Area / BHK
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProperties.map((prop) => (
                    <tr
                      key={prop.id}
                      onClick={() => onViewProperty(prop)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                          {prop.title}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {prop.owner.name} · {prop.owner.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {prop.locality}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-black text-emerald-700">{prop.price}</td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-slate-700">
                        {prop.areaSqFt} sqft · {prop.bhk || prop.category}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={prop.status}
                          onChange={(e) => onUpdatePropertyStatus(prop.id, e.target.value as PropertyStatus)}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          <option value="available">Available</option>
                          <option value="under_discussion">In Discussion</option>
                          <option value="token_received">Token Paid</option>
                          <option value="sold">Sold Out</option>
                          <option value="rented">Rented</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenSmartMatcherForProperty(prop)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                            title="Match Buyers"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSharePropertyWhatsApp(prop, e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              copiedPropId === prop.id
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title="Copy & Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete property "${prop.title}"?`)) onDeleteProperty(prop.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
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
        </>
      )}

      {/* ── SARASWATI NAGRI LIVE LAYOUTS TAB (Synced from public.projects) ── */}
      {inventoryTab === 'layouts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-16 bg-white rounded-3xl border border-slate-200 text-center">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">
                Sign in with your Saraswati Nagri CRM account to load live Saraswati Nagri projects from Supabase.
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const soldPct =
                project.totalPlots > 0
                  ? Math.min(100, Math.round((project.soldPlots / project.totalPlots) * 100))
                  : 0;
              return (
                <div
                  key={project.id}
                  style={{ borderTopColor: project.brandPrimaryColor || '#F59E0B', borderTopWidth: 3 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="h-40 bg-amber-50 relative flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-amber-200" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 to-slate-900/10" />
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white bg-emerald-500 shadow">
                        {project.status}
                      </span>
                      {project.projectType === 'associate_mandate' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white bg-teal-600 shadow">
                          Associate Mandate
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-lg font-black text-white truncate">{project.name}</h3>
                      <p className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {project.location}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 flex-1 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Total</p>
                        <p className="text-sm font-black text-slate-800">{project.totalPlots}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Sold</p>
                        <p className="text-sm font-black text-emerald-600">{project.soldPlots}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-2 border border-amber-100 text-center">
                        <p className="text-[8px] font-black text-amber-800 uppercase">Vacant</p>
                        <p className="text-sm font-black text-amber-600">{project.vacantPlots}</p>
                      </div>
                    </div>

                    {project.totalPlots > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-500">Sales Progress</span>
                          <span className="font-black text-emerald-600">{soldPct}% Sold</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${soldPct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {project.totalArea && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          <Layers className="w-2.5 h-2.5" /> {project.totalArea}
                        </span>
                      )}
                      {project.priceDisplay && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                          <IndianRupee className="w-2.5 h-2.5" /> {project.priceDisplay}
                        </span>
                      )}
                      {project.reraNumber && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                          <Ruler className="w-2.5 h-2.5" /> RERA: {project.reraNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
