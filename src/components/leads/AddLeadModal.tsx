import React, { useState, useMemo } from 'react';
import { X, Save, AlertTriangle, Building2, Tag, UserPlus } from 'lucide-react';
import {
  ResaleLead,
  LeadIntent,
  LeadSource,
  CrmUserProfile,
} from '../../types/crm';
import { SALES_AGENTS } from '../../data/constants';
import {
  BUY_PROPERTY_TYPES,
  RESALE_BRAND,
  RESALE_BUY,
  RESALE_INTENT_OPTIONS,
  RESALE_KIND_OPTIONS,
  RESALE_LOCATION_OPTIONS,
  SARASWATI_LEAD_SOURCES,
  isResaleIntent,
  plotInterestToCategory,
  resalePriceFieldLabel,
  resalePriceOptionsFor,
} from '../../lib/resale';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads?: ResaleLead[];
  profiles?: CrmUserProfile[];
  onSaveLead: (
    lead: Omit<ResaleLead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt' | 'callLogs' | 'visits'>
  ) => Promise<void> | void;
}

const inp =
  'w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white';
const lbl = 'text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block';
const sel = `${inp} cursor-pointer`;

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  existingLeads = [],
  profiles = [],
  onSaveLead,
}) => {
  const [source, setSource] = useState<string>('');
  const [sourceOther, setSourceOther] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [name, setName] = useState('');

  const [propertyType, setPropertyType] = useState<string>(RESALE_BUY);
  const [resaleKind, setResaleKind] = useState<string>('Flat');
  const [resaleArea, setResaleArea] = useState<string>('Besa');
  const [resaleAreaOther, setResaleAreaOther] = useState<string>('');
  const [resalePriceIdx, setResalePriceIdx] = useState<string>('2');
  const [resaleCustomPrice, setResaleCustomPrice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isResale = isResaleIntent(propertyType);

  const agentOptions = useMemo(() => {
    if (profiles.length > 0) {
      return profiles.map((p) => ({ id: p.id, name: p.fullName }));
    }
    return SALES_AGENTS.map((a) => ({ id: a.id, name: a.name }));
  }, [profiles]);

  const cleanPhoneDigits = phone.replace(/\D/g, '').slice(-10);
  const duplicateMatches = useMemo(() => {
    if (cleanPhoneDigits.length < 6) return [];
    return existingLeads.filter((l) => l.phone.replace(/\D/g, '').slice(-10).includes(cleanPhoneDigits));
  }, [cleanPhoneDigits, existingLeads]);

  if (!isOpen) return null;

  const priceBands = resalePriceOptionsFor(propertyType);

  const handleResetAndClose = () => {
    setErrorMsg('');
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const storedSource = source === 'Other' ? (sourceOther.trim() ? `Other - ${sourceOther.trim()}` : 'Other') : source;
    if (!storedSource) {
      setErrorMsg('Lead kahan se aayi (Source) zaroori hai');
      return;
    }

    if (cleanPhoneDigits.length < 10) {
      setErrorMsg('10-digit valid mobile number zaroori hai');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Client ka pura naam zaroori hai');
      return;
    }

    let budgetMin: number | undefined;
    let budgetMax: number | undefined;
    let budgetDisplay = 'Budget missing';

    if (isResale) {
      if (resalePriceIdx === 'custom' && resaleCustomPrice.trim()) {
        budgetDisplay = resaleCustomPrice.trim();
        const num = Number(resaleCustomPrice.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(num) && num > 0) {
          budgetMin = resaleCustomPrice.toLowerCase().includes('lakh') || resaleCustomPrice.toLowerCase().includes('l') ? num * 100_000 : num;
          budgetMax = budgetMin;
        }
      } else if (resalePriceIdx !== '' && priceBands[Number(resalePriceIdx)]) {
        const band = priceBands[Number(resalePriceIdx)];
        budgetMin = band.min;
        budgetMax = band.max;
        budgetDisplay = band.label;
      }
    }

    const finalArea = resaleArea === 'Other' ? (resaleAreaOther.trim() || 'Nagpur') : resaleArea;
    const selectedAgent = agentOptions.find((a) => a.id === assignedToId);

    setIsSaving(true);
    try {
      await onSaveLead({
        name: name.trim(),
        phone: cleanPhoneDigits,
        whatsapp: whatsappSameAsPhone ? cleanPhoneDigits : (whatsapp.replace(/\D/g, '').slice(-10) || cleanPhoneDigits),
        entity: 'Saraswati Nagri',
        intent: propertyType as LeadIntent,
        plotInterest: isResale ? resaleKind : undefined,
        propertyCategory: isResale ? plotInterestToCategory(resaleKind) : 'plot',
        bhkPreference: [],
        preferredLocalities: finalArea ? [finalArea] : ['Nagpur'],
        budgetMin,
        budgetMax,
        budgetDisplay,
        timeline: 'immediate',
        source: storedSource as LeadSource,
        priority: 'warm',
        stage: 'new',
        assignedTo: 'Sagar Madhukar kamble',
        assignedToId: 'a342167a-c988-49cc-b304-29aed3fc81b4',
        nextFollowUp: !isResale && followUpDate ? followUpDate : undefined,
        notes: notes.trim(),
        interestedPropertyIds: [],
      });
      setName('');
      setPhone('');
      setWhatsapp('');
      setNotes('');
      handleResetAndClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 w-full max-w-md max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Exact Saraswati Nagri FastAddLeadModal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">Jaldi Lead Add Karo</h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">30 second mein basic details save karo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION A: MANDATORY */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-1">
                Section A — Mandatory
              </p>

              <div>
                <label className={lbl}>Lead kahan se aayi *</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className={sel}>
                  <option value="">-- Select Source --</option>
                  {SARASWATI_LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {source === 'Other' && (
                  <input
                    type="text"
                    value={sourceOther}
                    onChange={(e) => setSourceOther(e.target.value)}
                    placeholder="Kaunsi source? e.g. college friend, old brochure"
                    className={`${inp} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className={lbl}>Phone number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className={inp}
                />
                <div className="mt-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!whatsappSameAsPhone}
                      onChange={(e) => setWhatsappSameAsPhone(!e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">
                      Client ka WhatsApp number alag hai (Different WhatsApp No)
                    </span>
                  </label>
                  {!whatsappSameAsPhone && (
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+91 XXXXX XXXXX (WhatsApp)"
                      className={`${inp} mt-2`}
                    />
                  )}
                </div>
              </div>

              {duplicateMatches.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
                  <p className="text-[11px] font-black uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pehle se aisi lead hai — check karo
                  </p>
                  {duplicateMatches.slice(0, 2).map((m) => (
                    <div key={m.id} className="rounded-lg bg-white border border-amber-100 px-2.5 py-1.5 text-xs">
                      <p className="font-bold text-slate-800">
                        {m.leadCode} · {m.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {m.phone} · {m.rawStatus || m.stage} · {m.assignedTo}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className={lbl}>Pura naam *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className={inp}
                />
              </div>
            </div>

            {/* SECTION B: QUICK INFO */}
            <div className="space-y-4 pt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                Section B — Quick Info (Optional)
              </p>

              {/* Deal Type Switcher (Exact match to FastAddLeadModal lines 1009-1050) */}
              <div>
                <label className={lbl}>Deal Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPropertyType(BUY_PROPERTY_TYPES[0]);
                      setResalePriceIdx('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isResale
                        ? 'bg-white text-slate-900 shadow-sm font-black border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Plot Sale (SN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPropertyType(RESALE_BUY);
                      setResalePriceIdx('2');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isResale
                        ? 'bg-teal-600 text-white shadow-sm font-black'
                        : 'text-slate-600 hover:text-teal-700'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Resale Desk</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={lbl}>Kya chahiye</label>
                <select
                  value={propertyType}
                  onChange={(e) => {
                    setPropertyType(e.target.value);
                    setResalePriceIdx('');
                  }}
                  className={sel}
                >
                  <optgroup label="Resale Property (Nagpur Properties)">
                    {RESALE_INTENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Plot Sales (Saraswati Nagri)">
                    {BUY_PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {isResale && (
                <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">
                    Resale / listing detail
                  </p>
                  <div>
                    <label className={lbl}>Property kind *</label>
                    <select
                      value={resaleKind}
                      onChange={(e) => setResaleKind(e.target.value)}
                      className={sel}
                    >
                      {RESALE_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Property area *</label>
                    <select
                      value={resaleArea}
                      onChange={(e) => setResaleArea(e.target.value)}
                      className={sel}
                    >
                      {RESALE_LOCATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {resaleArea === 'Other' && (
                      <input
                        value={resaleAreaOther}
                        onChange={(e) => setResaleAreaOther(e.target.value)}
                        placeholder="Type area…"
                        className={`${inp} mt-1.5`}
                      />
                    )}
                  </div>
                  <div>
                    <label className={lbl}>{resalePriceFieldLabel(propertyType)}</label>
                    <select
                      value={resalePriceIdx}
                      onChange={(e) => setResalePriceIdx(e.target.value)}
                      className={sel}
                    >
                      <option value="">Optional…</option>
                      {priceBands.map((o, i) => (
                        <option key={o.label} value={String(i)}>
                          {o.label}
                        </option>
                      ))}
                      <option value="custom">Exact / Custom Amount…</option>
                    </select>
                    {resalePriceIdx === 'custom' && (
                      <input
                        type="text"
                        value={resaleCustomPrice}
                        onChange={(e) => setResaleCustomPrice(e.target.value)}
                        placeholder="e.g. 42 Lakhs ya 4200000"
                        className={`${inp} mt-1.5`}
                      />
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={lbl}>Notes / buyer ne kya kaha</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Short notes..."
                  className={`${inp} resize-none`}
                />
              </div>

              {isResale ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-black text-teal-900">
                      Resale Lead — Follow-up required nahi hai
                    </p>
                  </div>
                  <p className="text-[11px] text-teal-700 mt-1 font-medium leading-relaxed">
                    Yeh lead {RESALE_BRAND} Resale desk par move ho jayegi aur Saraswati Nagri CRM ke saath live sync rahegi.
                  </p>
                </div>
              ) : (
                <div>
                  <label className={lbl}>Agla follow-up kab hai</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={inp}
                  />
                </div>
              )}

              <div>
                <label className={lbl}>Assigned Incharge</label>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800">Sagar Madhukar kamble</p>
                    <p className="text-[10px] text-purple-700 font-bold">Resale Desk Head · All Resale Desk leads assigned exclusively</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || cleanPhoneDigits.length < 10 || !source}
              className="px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Save ho raha...' : 'Lead Save Karo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
