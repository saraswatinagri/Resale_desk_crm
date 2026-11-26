import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  MessageSquare,
  Sparkles,
  Zap,
  Building2,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Phone,
  RefreshCw,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Smartphone,
  QrCode,
  ArrowRight,
  Info
} from 'lucide-react';
import { ResaleProperty, LegalAudit } from '../../types/crm';
import {
  fetchRecentInboundPropertyMessages,
  WhatsAppInboundPropertyMessage,
  fetchWhatsAppSessions,
  WhatsAppSession
} from '../../services/whatsappService';
import { formatIndianCurrency, generateWhatsAppLink } from '../../utils/formatters';
import { NAGPUR_LOCALITIES } from '../../data/constants';

interface WhatsAppPropertyInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoForm: (prefill: Partial<ResaleProperty>) => void;
  onQuickPublish: (property: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onOpenWhatsAppConnect?: () => void;
}

export const WhatsAppPropertyInboxModal: React.FC<WhatsAppPropertyInboxModalProps> = ({
  isOpen,
  onClose,
  onInsertIntoForm,
  onQuickPublish,
  onOpenWhatsAppConnect
}) => {
  const [messages, setMessages] = useState<WhatsAppInboundPropertyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<WhatsAppSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'flat' | 'plot' | 'house_villa' | 'commercial'>('all');
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ messages: msgList }, { activeSession: session }] = await Promise.all([
        fetchRecentInboundPropertyMessages(),
        fetchWhatsAppSessions()
      ]);
      setMessages(msgList);
      setActiveSession(session);
    } catch (err) {
      console.error('Failed to load WhatsApp property inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const textMatch = m.text.toLowerCase().includes(q);
        const nameMatch = (m.pushName || '').toLowerCase().includes(q);
        const phoneMatch = m.fromNumber.includes(q);
        const locMatch = (m.locality || '').toLowerCase().includes(q);
        const bhkMatch = (m.bhk || '').toLowerCase().includes(q);
        if (!textMatch && !nameMatch && !phoneMatch && !locMatch && !bhkMatch) {
          return false;
        }
      }

      if (categoryFilter !== 'all') {
        if (m.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [messages, searchTerm, categoryFilter]);

  if (!isOpen) return null;

  // Build ResaleProperty prefill from parsed WhatsApp message
  const createPropertyPrefillFromMessage = (msg: WhatsAppInboundPropertyMessage): Partial<ResaleProperty> => {
    const ext = msg.parsed.extractedFields;
    const locName = ext.locality || 'Besa';
    const hitLoc = NAGPUR_LOCALITIES.find(l => l.name === locName);
    const corridor = ext.corridor || hitLoc?.corridor || 'South Nagpur';

    const defaultTitle = ext.category === 'plot'
      ? `Residential Plot in ${locName}`
      : `${ext.bhk || '2/3 BHK'} ${ext.category === 'house_villa' ? 'Villa / House' : 'Flat'} in ${locName}`;

    const finalTitle = ext.title || defaultTitle;
    const finalPriceNumeric = Number(ext.priceNumeric) || 0;
    const finalAreaSqFt = Number(ext.areaSqFt) || 1200;

    const legalAudit: LegalAudit = {
      nmrdaApproved: ext.legalStatus?.nmrdaApproved ?? true,
      rlAvailable: ext.legalStatus?.rlAvailable ?? true,
      reraRegistered: ext.legalStatus?.reraRegistered ?? true,
      nitApproved: false,
      clearTitle: ext.legalStatus?.clearTitle ?? true,
      loanEligible: true,
      eligibleBanks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Bank of Maharashtra']
    };

    return {
      title: finalTitle,
      transactionType: ext.transactionType || 'resale',
      category: ext.category || 'flat',
      locality: locName,
      corridor,
      address: ext.address || `${locName}, Nagpur, Maharashtra`,
      price: ext.price || (finalPriceNumeric > 0 ? formatIndianCurrency(finalPriceNumeric) : 'Price on Request'),
      priceNumeric: finalPriceNumeric,
      ratePerSqFt: ext.ratePerSqFt || (finalAreaSqFt > 0 && finalPriceNumeric > 0 ? Math.round(finalPriceNumeric / finalAreaSqFt) : undefined),
      areaSqFt: finalAreaSqFt,
      carpetAreaSqFt: Math.round(finalAreaSqFt * 0.76),
      bhk: ext.category === 'plot' ? 'Plot / Open Land' : (ext.bhk || '3 BHK'),
      facing: ext.facing || 'East',
      furnishing: ext.furnishing || 'Semi-Furnished',
      status: 'available',
      legalStatus: legalAudit,
      description: `WhatsApp Inbound Listing (From ${msg.pushName || 'Owner'} ${msg.formattedFromNumber}):\n\n${msg.text}`,
      owner: {
        name: ext.ownerName || msg.pushName || 'Owner / Broker',
        phone: ext.ownerPhone || msg.fromNumber,
        whatsapp: ext.ownerPhone || msg.fromNumber,
        negotiable: true,
        commissionPercent: 2,
        notes: `Forwarded via WhatsApp on ${new Date(msg.timestamp).toLocaleDateString('en-IN')}`
      }
    };
  };

  const handle1ClickPublish = async (msg: WhatsAppInboundPropertyMessage) => {
    const prefill = createPropertyPrefillFromMessage(msg);
    setPublishingId(msg.id);

    try {
      await onQuickPublish({
        title: prefill.title || 'Resale Property in Nagpur',
        transactionType: prefill.transactionType || 'resale',
        category: prefill.category || 'flat',
        locality: prefill.locality || 'Besa',
        corridor: prefill.corridor || 'South Nagpur',
        address: prefill.address || 'Nagpur, Maharashtra',
        price: prefill.price || 'Price on Request',
        priceNumeric: prefill.priceNumeric || 0,
        ratePerSqFt: prefill.ratePerSqFt,
        maintenanceMonthly: 1500,
        areaSqFt: prefill.areaSqFt || 1200,
        carpetAreaSqFt: prefill.carpetAreaSqFt,
        bhk: prefill.bhk || '3 BHK',
        bathrooms: 2,
        balconies: 1,
        floor: '3rd Floor',
        furnishing: prefill.furnishing || 'Semi-Furnished',
        facing: prefill.facing || 'East',
        ageOfProperty: 'Ready to Move',
        status: 'available',
        isVerified: true,
        verificationBadge: 'WhatsApp Listing Verified',
        legalStatus: prefill.legalStatus as LegalAudit,
        amenities: ['Covered Car Parking', 'Elevator / Lift', '24x7 Security', '24 Hours Water'],
        highlights: [
          `Prime location in ${prefill.locality}`,
          `${prefill.bhk} with ${prefill.facing} facing`,
          'Clear Title & NMRDA / RL verified'
        ],
        images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'],
        description: prefill.description || msg.text,
        owner: prefill.owner!
      });

      setPublishedIds(prev => new Set(prev).add(msg.id));
      showToast(`Property "${prefill.title}" published to CRM successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Error publishing property');
    } finally {
      setPublishingId(null);
    }
  };

  const handleReviewInForm = (msg: WhatsAppInboundPropertyMessage) => {
    const prefill = createPropertyPrefillFromMessage(msg);
    onInsertIntoForm(prefill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl z-10 overflow-hidden max-h-[96vh] sm:max-h-[92vh] flex flex-col text-xs">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate">
                  Direct WhatsApp Ingestion Desk
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                  Live Feed
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">
                1-Click add &amp; publish properties sent by sellers, clients, or brokers directly via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-colors cursor-pointer"
              title="Refresh WhatsApp messages"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Line Status Banner & Forwarding Callout */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeSession?.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                activeSession?.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-xs font-bold text-slate-700">
              Gateway Line: <strong className="text-emerald-700 font-extrabold">+91 89560 40220</strong>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
              {activeSession?.status === 'connected' ? 'Connected & Listening' : 'Online / Paired'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/918956040220?text=Listing%20for%20resale%20Nagpur"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Forward to +91 89560 40220</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by locality, BHK, owner, phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All (${messages.length})` },
              { id: 'flat', label: 'Flats' },
              { id: 'plot', label: 'Plots' },
              { id: 'house_villa', label: 'Villas' },
              { id: 'commercial', label: 'Commercial' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Messages List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-500" />
              <p className="font-bold">Streaming WhatsApp property listings...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">No matching WhatsApp property messages found.</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Send or forward any property listing from WhatsApp to +91 89560 40220 to see it appear here live.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const ext = msg.parsed.extractedFields;
              const isPublished = publishedIds.has(msg.id);
              const isCurrentlyPublishing = publishingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-xs hover:shadow-md overflow-hidden"
                >
                  {/* Top Bar of Card */}
                  <div className="p-3.5 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {msg.pushName ? msg.pushName.charAt(0).toUpperCase() : 'W'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {msg.pushName || 'WhatsApp Contact'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({msg.formattedFromNumber})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {msg.relativeTime} · via WhatsApp
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>{msg.confidenceScore}% AI Match</span>
                      </span>

                      {isPublished && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                          <Check className="w-3 h-3" />
                          <span>Published</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Raw WhatsApp Message Preview */}
                    <div className="lg:col-span-5 bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          WhatsApp Original Text
                        </span>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                          {msg.text}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Contact Seller:</span>
                        <a
                          href={generateWhatsAppLink(msg.fromNumber, `Hi ${msg.pushName || 'Sir'}, regarding your property listing for ${ext.locality || 'Nagpur'}:`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <span>Chat on WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Right: Extracted Property Details */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-extrabold text-sm text-slate-800">
                            {ext.title || `${ext.bhk || '2/3 BHK'} in ${ext.locality || 'Nagpur'}`}
                          </h3>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Type &amp; BHK</span>
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">{ext.bhk || ext.category?.toUpperCase() || 'Property'}</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Locality</span>
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{ext.locality || 'Nagpur'}</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Demand Price</span>
                            <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{ext.price || (ext.priceNumeric ? formatIndianCurrency(ext.priceNumeric) : 'On Request')}</span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Area</span>
                            <span className="font-bold text-slate-800 text-xs mt-0.5">
                              {ext.areaSqFt ? `${ext.areaSqFt} sq.ft` : 'Standard'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Legal Audit</span>
                            <span className="font-bold text-teal-700 text-xs flex items-center gap-1 mt-0.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate">
                                {ext.legalStatus?.nmrdaApproved ? 'NMRDA / RL' : 'Clear Title'}
                              </span>
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Facing &amp; Furnish</span>
                            <span className="font-bold text-slate-800 text-xs truncate mt-0.5">
                              {ext.facing || 'East'} · {ext.furnishing || 'Semi-Furnished'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewInForm(msg)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <span>Review &amp; Customize in Form</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handle1ClickPublish(msg)}
                          disabled={isCurrentlyPublishing || isPublished}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                            isPublished
                              ? 'bg-purple-100 text-purple-700 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {isCurrentlyPublishing
                              ? 'Publishing...'
                              : isPublished
                              ? 'Published to Inventory'
                              : '⚡ 1-Click Publish to CRM'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 text-slate-500 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Messages are automatically scanned and extracted using Saraswati Nagri Real Estate AI.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
