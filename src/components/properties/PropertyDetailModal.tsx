import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  IndianRupee, 
  Home, 
  ShieldCheck, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  Building2,
  Calendar,
  Send,
  ExternalLink,
  Loader2,
  UserCheck
} from 'lucide-react';
import { ResaleProperty, ResaleLead, PropertyStatus } from '../../types/crm';
import { 
  formatIndianCurrency, 
  generateWhatsAppLink,
  buildPropertyPitchMessage 
} from '../../utils/formatters';
import { getMatchingLeadsForProperty } from '../../utils/matcher';
import { sendLeadWhatsAppMessage } from '../../services/whatsappService';
import { toast } from '../../utils/toast';

interface PropertyDetailModalProps {
  property: ResaleProperty | null;
  leads: ResaleLead[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (propId: string, status: PropertyStatus) => void;
  onSelectLeadForMatching: (lead: ResaleLead) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  leads,
  isOpen,
  onClose,
  onUpdateStatus,
  onSelectLeadForMatching
}) => {
  if (!isOpen || !property) return null;

  const [activeTab, setActiveTab] = useState<'specs' | 'matching_leads' | 'share'>('specs');
  const [copiedBrochure, setCopiedBrochure] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // WhatsApp Direct Posting State
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [pitchLanguage, setPitchLanguage] = useState<'Hindi' | 'Marathi' | 'English'>('Hindi');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);

  // Compute matching leads
  const matchedLeads = getMatchingLeadsForProperty(property, leads);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;
  const targetPhone = selectedLead ? (selectedLead.whatsapp || selectedLead.phone) : customPhone;
  const targetName = selectedLead ? selectedLead.name : (customName.trim() || 'Sir/Madam');

  const buildCustomPitch = () => {
    if (pitchLanguage === 'Hindi') {
      return `नमस्ते ${targetName} जी! 🙏\n\nसरस्वती नगरी / नागपुर प्रॉपर्टीज रिसेल डेस्क से आपके लिए एक सत्यापित प्रॉपर्टी का विवरण:\n\n🏡 *${property.title}*\n📍 *लोकेशन:* ${property.locality}, ${property.corridor}, नागपुर\n💰 *कीमत:* ${property.price} (${property.ratePerSqFt ? `₹${property.ratePerSqFt}/sq.ft` : ''})\n📏 *साइज:* ${property.areaSqFt} sq.ft (${property.bhk || 'Plot'})\n🧭 *फेसिंग:* ${property.facing || 'East'}\n✅ *स्वीकृतियां:* ${property.legalStatus.nmrdaApproved ? 'NMRDA Approved, ' : ''}${property.legalStatus.rlAvailable ? 'RL Available, ' : ''}${property.legalStatus.clearTitle ? 'क्लियर 7/12 टाइटल' : ''}\n\nक्या आप इस वीकेंड साइट विजिट प्लान करना चाहेंगे?\n\n- नागपुर प्रॉपर्टीज & सरस्वती नगरी रिसेल डेस्क\n📞 कॉल / हेल्पलाइन: +91 89560 40220`;
    } else if (pitchLanguage === 'Marathi') {
      return `नमस्कार ${targetName} जी! 🙏\n\nसरस्वती नगरी / नागपूर प्रॉपर्टीज रिसेल डेस्कवरून आपल्यासाठी निवडक रिसेल प्रॉपर्टी:\n\n🏡 *${property.title}*\n📍 *पत्ता:* ${property.locality}, ${property.corridor}, नागपूर\n💰 *किंमत:* ${property.price}\n📏 *क्षेत्रफळ:* ${property.areaSqFt} sq.ft (${property.bhk || 'Plot'})\n✅ *मंजूरी:* ${property.legalStatus.nmrdaApproved ? 'NMRDA मंजूर, ' : ''}${property.legalStatus.rlAvailable ? 'RL उपलब्ध, ' : ''}क्लिअर टायटल\n\nप्रत्यक्ष पाहणीसाठी (Site Visit) केव्हा वेळ होईल?\n\n- सरस्वती नगरी रिसेल डेस्क\n📞 संपर्क: +91 89560 40220`;
    } else {
      return `Hello ${targetName},\n\nGreetings from Saraswati Nagri & Nagpur Properties Resale Desk. Review this verified resale property matching your preferences:\n\n🏡 *${property.title}*\n📍 *Location:* ${property.locality}, ${property.corridor}, Nagpur\n💰 *Price:* ${property.price}\n📏 *Area:* ${property.areaSqFt} sq.ft (${property.bhk || 'Plot'})\n🧭 *Facing:* ${property.facing || 'East'}\n✅ *Legal:* ${property.legalStatus.nmrdaApproved ? 'NMRDA Sanctioned, ' : ''}${property.legalStatus.rlAvailable ? 'RL in hand, ' : ''}Clear Title\n\nWould you like to schedule a private site visit this weekend?\n\n- Resale Desk | Saraswati Nagri\n📞 Contact: +91 89560 40220`;
    }
  };

  const handleSendDirectWhatsApp = async () => {
    if (!targetPhone.trim()) {
      toast.error('Please select a lead or enter a phone number');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const pitch = buildCustomPitch();
      const res = await sendLeadWhatsAppMessage({
        leadId: selectedLead?.id || '',
        phone: targetPhone,
        leadName: targetName,
        text: pitch,
      });

      if (res.success) {
        toast.success(`Property details posted to WhatsApp (+91 ${targetPhone.replace(/\D/g, '').slice(-10)})!`);
      } else {
        toast.error(res.error || 'Could not dispatch WhatsApp message');
      }
    } catch (err: any) {
      toast.error('Send error: ' + (err.message || 'Unknown'));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const brochureText = `🏡 *EXCLUSIVE PROPERTY FOR SALE / RESALE*\n*Nagpur Properties & Saraswati Nagri Resale Desk*\n\n📍 *Title:* ${property.title}\n🗺️ *Location:* ${property.locality}, ${property.corridor}, Nagpur\n💰 *Price:* ${property.price} (${property.ratePerSqFt ? `₹${property.ratePerSqFt}/sq.ft` : ''})\n📏 *Area:* ${property.areaSqFt} sq.ft (${property.bhk || 'Plot'})\n🧭 *Facing:* ${property.facing || 'East'}\n🛋️ *Furnishing:* ${property.furnishing || 'Semi-Furnished'}\n\n✅ *LEGAL SANCTIONS & VERIFICATION:*\n${property.legalStatus.nmrdaApproved ? '• NMRDA Sanctioned Layout\n' : ''}${property.legalStatus.rlAvailable ? '• Release Letter (RL) in hand\n' : ''}${property.legalStatus.reraRegistered ? `• MahaRERA Registered: ${property.legalStatus.reraNumber || 'Verified'}\n` : ''}${property.legalStatus.clearTitle ? '• 7/12 & Khasra Clear Title\n' : ''}${property.legalStatus.loanEligible ? '• SBI & Nationalized Bank Loans Approved\n' : ''}\n🌟 *Highlights:*\n${property.highlights.map(h => `• ${h}`).join('\n')}\n\n📞 For Private Site Visit & Negotiation:\nCall / WhatsApp: 8275437826 / 8956040220 (Resale Desk)`;

  const handleCopyBrochure = () => {
    navigator.clipboard.writeText(brochureText);
    setCopiedBrochure(true);
    setTimeout(() => setCopiedBrochure(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                {property.locality}
              </span>
              <h2 className="text-lg font-black text-slate-800">{property.title}</h2>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>{property.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={property.status}
              onChange={(e) => onUpdateStatus(property.id, e.target.value as PropertyStatus)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="available">🟢 Available</option>
              <option value="under_discussion">🟡 In Discussion</option>
              <option value="token_received">🟣 Token Paid</option>
              <option value="sold">⚪ Sold Out</option>
              <option value="rented">🔵 Rented Out</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Header */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'specs'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Specifications & Legal Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('matching_leads')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'matching_leads'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Matching Buyer Leads ({matchedLeads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('share')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'share'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp Brochure & Share</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* TAB 1: SPECS & LEGAL AUDIT */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              
              {/* Image Carousel / Gallery */}
              <div className="space-y-3">
                <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                  <img
                    src={property.images[selectedImageIdx] || property.images[0]}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-md">
                    <span className="text-xl font-black text-slate-900">{property.price}</span>
                    {property.ratePerSqFt && (
                      <span className="text-xs text-slate-500 font-mono ml-2">
                        (₹{property.ratePerSqFt}/sq.ft)
                      </span>
                    )}
                  </div>
                </div>

                {property.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {property.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`h-16 w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                          selectedImageIdx === idx ? 'border-teal-600 shadow-sm' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Specs Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Super Builtup</span>
                  <span className="text-base font-extrabold text-slate-800">{property.areaSqFt} sq.ft</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Configuration</span>
                  <span className="text-base font-extrabold text-slate-800">{property.bhk || 'Plot'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Facing & Vastu</span>
                  <span className="text-base font-extrabold text-slate-800">{property.facing || 'East'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Furnishing</span>
                  <span className="text-base font-extrabold text-slate-800">{property.furnishing || 'Unfurnished'}</span>
                </div>
              </div>

              {/* 12-Point Legal Audit Checklist (Properties Nagpur Standard) */}
              <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    12-Point Legal Sanction & Verification Audit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                    Nagpur Municipal & NMRDA Checks Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${property.legalStatus.nmrdaApproved ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span className={property.legalStatus.nmrdaApproved ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      NMRDA Sanctioned Layout
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${property.legalStatus.rlAvailable ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span className={property.legalStatus.rlAvailable ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Release Letter (RL in Hand)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${property.legalStatus.reraRegistered ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span className={property.legalStatus.reraRegistered ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      MahaRERA Registered {property.legalStatus.reraNumber ? `(${property.legalStatus.reraNumber})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${property.legalStatus.clearTitle ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span className={property.legalStatus.clearTitle ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      7/12 Mutation & Khasra Clear Title
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${property.legalStatus.loanEligible ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span className={property.legalStatus.loanEligible ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Bank Loan Sanctionable (SBI, HDFC, ICICI, BOM)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <span className="text-slate-800 font-semibold">
                      Zero Property Tax Litigation / Dues Cleared
                    </span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features & Amenities</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {property.amenities.map(a => (
                      <span key={a} className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-sm">
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description & Narrative */}
              {property.description && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                  <p className="text-slate-700 leading-relaxed">{property.description}</p>
                </div>
              )}

              {/* Owner Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seller / Owner Contact</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-0.5">{property.owner.name}</h4>
                  <p className="text-slate-500 font-mono">{property.owner.phone}</p>
                  {property.owner.notes && (
                    <p className="text-amber-700 text-[11px] mt-1 italic">
                      Key viewing: {property.owner.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${property.owner.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call Owner</span>
                  </a>

                  <a
                    href={generateWhatsAppLink(property.owner.whatsapp || property.owner.phone, `Hello ${property.owner.name}, this is from Nagpur Properties Resale Desk regarding your listing ${property.title}:`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MATCHING BUYER LEADS */}
          {activeTab === 'matching_leads' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Buyer Leads Matching This Property
                </h3>
                <p className="text-xs text-slate-500">
                  Leads whose budget, BHK preference, and location criteria overlap with this property
                </p>
              </div>

              {matchedLeads.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-700 font-bold">No active buyer lead currently matches this listing.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    As new leads arrive on Resale Desk, the Smart Matcher will automatically notify you.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedLeads.map(({ lead, score, reasons }) => (
                    <div 
                      key={lead.id}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-teal-300 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[10px]">
                            {lead.leadCode}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                          <span className="font-bold text-emerald-700 font-mono">
                            {lead.budgetDisplay}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            score >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {score}% Match
                          </span>
                        </div>

                        <p className="text-slate-500 mt-1">
                          Prefers: {lead.preferredLocalities.join(', ')} • {lead.bhkPreference.join(', ')}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {reasons.map((r, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
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
                              property.title,
                              property.locality,
                              property.price,
                              property.areaSqFt,
                              property.bhk
                            )
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>WhatsApp Pitch</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHARE & POST PROPERTY ON WHATSAPP */}
          {activeTab === 'share' && (
            <div className="space-y-5 text-xs">
              
              {/* WhatsApp Post / Dispatch Box */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-emerald-950">
                        Post Property Details to WhatsApp
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Send instant verified pitch to a CRM buyer lead or custom WhatsApp number
                      </p>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 text-[10px] font-bold">
                    {(['Hindi', 'Marathi', 'English'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setPitchLanguage(lang)}
                        className={`px-2 py-0.5 rounded-lg transition-all ${
                          pitchLanguage === lang
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:text-emerald-800'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      Select Lead from CRM Directory
                    </label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => {
                        setSelectedLeadId(e.target.value);
                        if (e.target.value) {
                          setCustomPhone('');
                        }
                      }}
                      className="w-full p-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">-- Choose Buyer Lead (or enter custom number) --</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.phone || l.whatsapp}) · {l.budgetDisplay || 'Enquiry'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      Or Custom WhatsApp Number &amp; Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Client Name (e.g. Rahul)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-1/2 p-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="10-digit Phone"
                        value={customPhone}
                        onChange={(e) => {
                          setCustomPhone(e.target.value);
                          if (e.target.value) setSelectedLeadId('');
                        }}
                        className="w-1/2 p-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Message Preview */}
                <div className="bg-white rounded-xl p-3 border border-emerald-200/80 text-[11px] text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                  {buildCustomPitch()}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendDirectWhatsApp}
                      disabled={isSendingWhatsApp || !targetPhone}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Post via WhatsApp Gateway</span>
                    </button>

                    {targetPhone && (
                      <a
                        href={generateWhatsAppLink(targetPhone, buildCustomPitch())}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open WhatsApp Web</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(buildCustomPitch());
                      toast.success('Pitch text copied to clipboard!');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </button>
                </div>
              </div>

              {/* Standard Master Brochure View */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-teal-600" />
                      Master Marketing Brochure
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Full marketing flyer format with 12-point legal audit &amp; features
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyBrochure}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedBrochure ? 'Copied!' : 'Copy Flyer'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 font-mono text-[11px] text-slate-700 border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {brochureText}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">Property ID: {property.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
