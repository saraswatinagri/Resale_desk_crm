import React, { useState, useEffect } from 'react';
import {
  X,
  ThumbsUp,
  CalendarCheck,
  PhoneOff,
  Ban,
  XCircle,
  Home,
  Handshake,
  Building2,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { ResaleLead, CallLog } from '../../types/crm';
import { useAuth } from '../../lib/auth-context';
import { canUserCallLead } from '../../lib/lead-permissions';

interface CallOutcomePromptModalProps {
  lead: ResaleLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveOutcome: (leadId: string, log: {
    caller: string;
    notes: string;
    outcome: CallLog['outcome'];
    nextFollowUpDate?: string;
  }) => Promise<void>;
  attemptedAt?: number | null;
}

type Step = 'outcome' | 'interested' | 'visit' | 'lost' | 'lost-other' | 'resale';

interface FollowUpChip {
  label: string;
  dateStr: string;
  iso: string;
}

/** Get current hour in IST (UTC+5:30) */
function getIstHour(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  return ist.getHours();
}

/** Helper to generate ISO strings for upcoming days at standard 11:00 AM */
function getFutureIso(daysAhead: number, hour = 11, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Generate Saraswati Nagri CRM Follow-up day chips */
function getFollowUpChips(): FollowUpChip[] {
  const chips: FollowUpChip[] = [];
  const istHour = getIstHour();

  // If before 7:00 PM IST, show "Aaj" (Today evening)
  if (istHour < 19) {
    const todayEvening = new Date();
    todayEvening.setHours(18, 0, 0, 0);
    chips.push({
      label: 'Aaj',
      dateStr: `${formatDateShort(todayEvening.toISOString())} (Shaam)`,
      iso: todayEvening.toISOString(),
    });
  }

  const kalIso = getFutureIso(1, 11, 0);
  chips.push({
    label: 'Kal',
    dateStr: formatDateShort(kalIso),
    iso: kalIso,
  });

  const threeDaysIso = getFutureIso(3, 11, 0);
  chips.push({
    label: '3 din baad',
    dateStr: formatDateShort(threeDaysIso),
    iso: threeDaysIso,
  });

  const nextWeekIso = getFutureIso(7, 11, 0);
  chips.push({
    label: 'Next week',
    dateStr: formatDateShort(nextWeekIso),
    iso: nextWeekIso,
  });

  return chips;
}

/** Saraswati Nagri CRM Hinglish Lost Reasons */
const LOST_REASON_CHIPS: Array<{ label: string; value: string; outcomeValue: CallLog['outcome'] }> = [
  { label: 'Price zyada', value: 'Price Too High', outcomeValue: 'Price Too High' },
  { label: 'Budget issue', value: 'Budget Issue', outcomeValue: 'Budget Mismatch' },
  { label: 'Location pasand nahi', value: 'Location Not Suitable', outcomeValue: 'Location Not Suitable' },
  { label: 'Flat chahiye, plot nahi', value: 'Want Flat, Not Plot', outcomeValue: 'Not Interested' },
  { label: 'Plot chahiye, flat nahi', value: 'Want Plot, Not Flat', outcomeValue: 'Not Interested' },
  { label: 'Kahin aur kharida', value: 'Bought Elsewhere', outcomeValue: 'Bought Elsewhere' },
  { label: 'Family agree nahi', value: 'Family Not Agreed', outcomeValue: 'Not Interested' },
  { label: 'Abhi ready nahi', value: 'Not Ready to Buy', outcomeValue: 'Not Interested' },
  { label: 'Sirf dekh rahe the', value: 'Just Browsing', outcomeValue: 'Not Interested' },
  { label: 'Sold out ho gaya', value: 'Already Sold', outcomeValue: 'Already Sold' },
  { label: 'Rent pe de diya', value: 'Already Rented', outcomeValue: 'Already Rented' },
  { label: 'Other', value: 'Other', outcomeValue: 'Not Interested' },
];

export const CallOutcomePromptModal: React.FC<CallOutcomePromptModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveOutcome,
}) => {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('outcome');
  const [saving, setSaving] = useState(false);
  const [selectedChip, setSelectedChip] = useState<FollowUpChip | null>(null);
  const [customFollowUpDate, setCustomFollowUpDate] = useState('');
  const [showCustomFollowUp, setShowCustomFollowUp] = useState(false);
  const [notes, setNotes] = useState('');

  // Visit details
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('11:00 AM');
  const [visitNotes, setVisitNotes] = useState('');

  // Lost details
  const [lostCustomNote, setLostCustomNote] = useState('');

  // Resale details
  const [rIntent, setRIntent] = useState<'buy' | 'sell' | 'rent' | 'rent_out'>('buy');
  const [rKind, setRKind] = useState('Flat');
  const [rArea, setRArea] = useState('Besa');
  const [rBudget, setRBudget] = useState('');
  const [rNotes, setRNotes] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('outcome');
      setSaving(false);
      setSelectedChip(null);
      setCustomFollowUpDate('');
      setShowCustomFollowUp(false);
      setNotes('');
      setLostCustomNote('');
      const defaultVisit = new Date();
      defaultVisit.setDate(defaultVisit.getDate() + 1);
      setVisitDate(defaultVisit.toISOString().slice(0, 10));
      setVisitTime('11:00 AM');
      setVisitNotes('');
      setRIntent('buy');
      setRKind('Flat');
      setRArea(lead?.preferredLocalities?.[0] || 'Besa');
      setRBudget(lead?.budgetDisplay || '');
      setRNotes('');
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const callerName = user?.fullName || lead.assignedTo || 'Sales Executive';

  // Check permission: Is the caller authorized to call/log outcome for this lead?
  const { canCall, reason } = canUserCallLead(user, lead);

  // 1-Tap Save: Phone nahi utha (No answer)
  const handleSaveNoAnswer = async () => {
    setSaving(true);
    const kalIso = getFutureIso(1, 11, 0);
    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Ringing / No Answer',
        notes: `Call outcome: No answer — kal ke queue mein transfer hua (${formatDateShort(kalIso)})`,
        nextFollowUpDate: kalIso,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // 1-Tap Save: Invalid Phone No
  const handleSaveInvalidNumber = async () => {
    setSaving(true);
    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Invalid Number',
        notes: 'Call outcome: Invalid number — dusre agent se verification pending',
        nextFollowUpDate: undefined,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Save: Interested
  const handleSaveInterested = async (chip?: FollowUpChip) => {
    setSaving(true);
    const targetIso = chip ? chip.iso : (customFollowUpDate ? new Date(customFollowUpDate).toISOString() : getFutureIso(1, 11, 0));
    const whenLabel = chip ? `${chip.label} (${chip.dateStr})` : formatDateShort(targetIso);
    const noteText = notes.trim()
      ? `Call outcome: Interested — next follow-up ${whenLabel}. Note: ${notes.trim()}`
      : `Call outcome: Interested — next follow-up ${whenLabel}`;

    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Interested',
        notes: noteText,
        nextFollowUpDate: targetIso,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Save: Site Visit Fix
  const handleSaveVisit = async () => {
    if (!visitDate) return;
    setSaving(true);
    const visitIso = new Date(`${visitDate}T11:00:00+05:30`).toISOString();
    const formatted = `${visitDate} at ${visitTime}`;
    const noteText = visitNotes.trim()
      ? `Call outcome: Site visit fixed for ${formatted}. Note: ${visitNotes.trim()}`
      : `Call outcome: Site visit fixed for ${formatted}`;

    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Scheduled Visit',
        notes: noteText,
        nextFollowUpDate: visitIso,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Save: Lost / Not Interested
  const handleSaveLost = async (reasonObj: typeof LOST_REASON_CHIPS[0]) => {
    if (reasonObj.value === 'Other') {
      setStep('lost-other');
      return;
    }

    setSaving(true);
    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: reasonObj.outcomeValue,
        notes: `Call outcome: Not interested — ${reasonObj.value} (${reasonObj.label})`,
        nextFollowUpDate: undefined,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Save: Lost Other with custom text
  const handleSaveLostOther = async () => {
    if (!lostCustomNote.trim()) return;
    setSaving(true);
    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Not Interested',
        notes: `Call outcome: Not interested — Other reason: "${lostCustomNote.trim()}"`,
        nextFollowUpDate: undefined,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Save: Resale Detail Update
  const handleSaveResale = async () => {
    setSaving(true);
    const intentLabel =
      rIntent === 'buy' ? 'Kharidna hai (Buyer)' :
      rIntent === 'sell' ? 'Bechna hai (Seller)' :
      rIntent === 'rent' ? 'Rent pe lena hai' : 'Rent pe dena hai';
    const noteText = `Resale Desk: ${intentLabel} — ${rKind} in ${rArea} ${rBudget ? `(Budget: ${rBudget})` : ''}. ${rNotes ? `Details: ${rNotes.trim()}` : ''}`;
    const followIso = getFutureIso(2, 11, 0);

    try {
      await onSaveOutcome(lead.id, {
        caller: callerName,
        outcome: 'Interested',
        notes: noteText,
        nextFollowUpDate: followIso,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Quick preset pills for discussion note
  const PRESET_INTERESTED_NOTES = [
    'Client responded positively, budget aligns',
    'Wants WhatsApp brochure of property first',
    'Family discussion pending, will decide tomorrow',
    'Ready for site visit this weekend',
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:p-6 text-slate-800"
      >
        {/* Mobile grab handle */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />

        {/* Back Button (if inside sub-step) */}
        {step !== 'outcome' && (
          <button
            type="button"
            onClick={() => {
              if (step === 'lost-other') setStep('lost');
              else setStep('outcome');
            }}
            disabled={saving}
            className="absolute left-3 top-3 md:left-5 md:top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute right-3 top-3 md:right-5 md:top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title & Subtitle */}
        <div className="text-center mb-4 pt-1 px-8">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
            {step === 'outcome' && 'Call kaisi rahi?'}
            {step === 'interested' && 'Follow-up kab karna hai?'}
            {step === 'visit' && 'Site visit kab tay hui?'}
            {step === 'lost' && 'Kyun not interested?'}
            {step === 'lost-other' && 'Other reason — detail do'}
            {step === 'resale' && 'Resale property details'}
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
            {lead.leadCode} · {lead.name} · {lead.phone}
            {lead.assignedTo ? ` · Owner: ${lead.assignedTo}` : ''}
          </p>
        </div>

        {/* Permission Guard Alert (If current user is not authorized to call) */}
        {!canCall && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start gap-2.5">
            <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">Call permission restricted</p>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                {reason}
              </p>
            </div>
          </div>
        )}

        {/* Content Area */}
        {saving ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
            <p className="text-xs font-bold text-slate-700">Call outcome save ho raha hai…</p>
          </div>
        ) : (
          <>
            {/* ── STEP 1: PRIMARY OUTCOME CHOICES (Exact Saraswati Nagri CRM layout) ── */}
            {step === 'outcome' && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* 1. Interested hai */}
                <button
                  type="button"
                  onClick={() => setStep('interested')}
                  className="w-full flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-100 px-4 py-3 text-left text-emerald-900 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <ThumbsUp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black leading-tight text-emerald-900">
                      Interested hai
                    </span>
                    <span className="block text-[11px] font-semibold text-emerald-700 mt-0.5 opacity-80">
                      next follow-up date-time choose karo
                    </span>
                  </div>
                </button>

                {/* 2. Site visit fix */}
                <button
                  type="button"
                  onClick={() => setStep('visit')}
                  className="w-full flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 hover:bg-purple-100/80 active:bg-purple-100 px-4 py-3 text-left text-purple-900 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black leading-tight text-purple-900">
                      Site visit fix
                    </span>
                    <span className="block text-[11px] font-semibold text-purple-700 mt-0.5 opacity-80">
                      date-time set karo field executive ke liye
                    </span>
                  </div>
                </button>

                {/* 3. Phone nahi utha (1-tap save) */}
                <button
                  type="button"
                  onClick={handleSaveNoAnswer}
                  className="w-full flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 active:bg-amber-100 px-4 py-3 text-left text-amber-900 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <PhoneOff className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black leading-tight text-amber-900">
                      Phone nahi utha
                    </span>
                    <span className="block text-[11px] font-semibold text-amber-700 mt-0.5 opacity-80">
                      1-tap save · kal ke queue mein transfer hoga
                    </span>
                  </div>
                </button>

                {/* 4. Invalid phone no (1-tap save) */}
                <button
                  type="button"
                  onClick={handleSaveInvalidNumber}
                  className="w-full flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100/80 active:bg-orange-100 px-4 py-3 text-left text-orange-900 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black leading-tight text-orange-900">
                      Invalid phone no
                    </span>
                    <span className="block text-[11px] font-semibold text-orange-700 mt-0.5 opacity-80">
                      1-tap save · dusre agent se verify hoga
                    </span>
                  </div>
                </button>

                {/* 5. Not interested */}
                <button
                  type="button"
                  onClick={() => setStep('lost')}
                  className="w-full flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100/80 active:bg-rose-100 px-4 py-3 text-left text-rose-900 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black leading-tight text-rose-900">
                      Not interested
                    </span>
                    <span className="block text-[11px] font-semibold text-rose-700 mt-0.5 opacity-80">
                      reason choose karo (price, location, etc.)
                    </span>
                  </div>
                </button>

                {/* Bottom Quick Taps: Resale / Partner Desk */}
                <div className="grid grid-cols-3 gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setStep('resale')}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-teal-200 bg-teal-50 hover:bg-teal-100 p-2.5 text-teal-800 transition-colors cursor-pointer text-center"
                  >
                    <Home className="w-4 h-4 text-teal-600" />
                    <span className="text-[10px] font-black leading-tight">Resale Update</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotes('Lead is an independent channel partner / broker.');
                      setStep('interested');
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-sky-200 bg-sky-50 hover:bg-sky-100 p-2.5 text-sky-800 transition-colors cursor-pointer text-center"
                  >
                    <Handshake className="w-4 h-4 text-sky-600" />
                    <span className="text-[10px] font-black leading-tight">Broker hai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotes('Lead is a land developer / builder inquiry.');
                      setStep('interested');
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 p-2.5 text-indigo-800 transition-colors cursor-pointer text-center"
                  >
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black leading-tight">Developer</span>
                  </button>
                </div>

                <p className="pt-2 text-center text-[10px] font-semibold text-slate-400">
                  Baat nahi hui? “Phone nahi utha” tap karo — ek second mein save ho jayega.
                </p>
              </div>
            )}

            {/* ── STEP 2: INTERESTED (Follow-up Picker) ── */}
            {step === 'interested' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <p className="text-center text-[11px] font-bold text-slate-500">
                  Agli baat kab karni hai? Choose follow-up time:
                </p>

                {/* Day Window Chips */}
                <div className="grid grid-cols-2 gap-2">
                  {getFollowUpChips().map((chip) => {
                    const isSelected = selectedChip?.label === chip.label && !showCustomFollowUp;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setSelectedChip(chip);
                          setShowCustomFollowUp(false);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                            : 'border-slate-200 bg-white hover:bg-emerald-50 text-slate-700'
                        }`}
                      >
                        <span className="text-sm font-black">{chip.label}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {chip.dateStr}
                        </span>
                      </button>
                    );
                  })}

                  {/* Apna Time Custom Picker Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomFollowUp(!showCustomFollowUp);
                      setSelectedChip(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      showCustomFollowUp
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-sm font-black">Apna time</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${showCustomFollowUp ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Specific Date &amp; Time
                    </span>
                  </button>
                </div>

                {/* Custom Datetime Input */}
                {showCustomFollowUp && (
                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                    <label className="text-[11px] font-bold text-emerald-900 block">
                      Choose exact date and time:
                    </label>
                    <input
                      type="datetime-local"
                      value={customFollowUpDate}
                      onChange={(e) => setCustomFollowUpDate(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Discussion Note */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Discussion summary / notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Buyer ne kya kaha? Next steps..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Preset Note Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_INTERESTED_NOTES.map((pn, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNotes(pn)}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition-colors"
                      >
                        + {pn.slice(0, 32)}…
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveInterested(selectedChip || undefined)}
                    disabled={!selectedChip && !customFollowUpDate}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Save Call Outcome
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: SITE VISIT FIX ── */}
            {step === 'visit' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <p className="text-center text-[11px] font-bold text-slate-500">
                  Field visit kab schedule hui?
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {/* Quick Slots */}
                  {[
                    { label: 'Kal Subah', time: '10:00 AM', days: 1 },
                    { label: 'Kal Dopahar', time: '02:00 PM', days: 1 },
                    { label: 'Kal Shaam', time: '04:30 PM', days: 1 },
                    { label: 'This Weekend', time: '11:00 AM', days: 3 },
                  ].map((slot) => {
                    const isSelected = visitTime === slot.time;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + slot.days);
                          setVisitDate(d.toISOString().slice(0, 10));
                          setVisitTime(slot.time);
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-slate-200 bg-white hover:bg-purple-50 text-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-black">{slot.label}</span>
                        <span className={`block text-[10px] font-bold ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                          {slot.time}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      placeholder="e.g. 11:30 AM"
                      className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Executive / Location Notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Meet near Besa square, showing 3BHK flat..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    className="w-full p-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveVisit}
                  disabled={!visitDate}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Confirm Site Visit Fix 🎉
                </button>
              </div>
            )}

            {/* ── STEP 2: NOT INTERESTED (Reason Grid) ── */}
            {step === 'lost' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <p className="text-center text-[11px] font-bold text-slate-500">
                  Client ne kya reason diya? (1-tap to save)
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {LOST_REASON_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSaveLost(chip)}
                      className="p-3 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 text-left transition-colors cursor-pointer flex flex-col gap-0.5"
                    >
                      <span className="text-xs font-black">{chip.label}</span>
                      <span className="text-[10px] font-medium text-rose-700 opacity-70">
                        {chip.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: LOST OTHER (Detail Note) ── */}
            {step === 'lost-other' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <p className="text-center text-[11px] font-bold text-slate-500">
                  Client ne exactly kya bola? Detail likho:
                </p>

                <textarea
                  rows={3}
                  placeholder="E.g. Buyer shifted to Pune, or looking only for commercial shop..."
                  value={lostCustomNote}
                  onChange={(e) => setLostCustomNote(e.target.value)}
                  className="w-full p-3 text-xs font-medium rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                <button
                  type="button"
                  onClick={handleSaveLostOther}
                  disabled={!lostCustomNote.trim()}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Confirm Not Interested
                </button>
              </div>
            )}

            {/* ── STEP 2: RESALE PROPERTY UPDATE ── */}
            {step === 'resale' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <p className="text-center text-[11px] font-bold text-slate-500">
                  Resale desk ke liye requirement / listing update karo:
                </p>

                {/* Intent */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Intent (Kya karna hai?)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'buy', label: 'Kharidna hai (Buyer)' },
                      { id: 'sell', label: 'Bechna hai (Seller)' },
                      { id: 'rent', label: 'Rent pe lena hai' },
                      { id: 'rent_out', label: 'Rent pe dena hai' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRIntent(item.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          rIntent === item.id
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-teal-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kind & Area */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Property Kind
                    </label>
                    <select
                      value={rKind}
                      onChange={(e) => setRKind(e.target.value)}
                      className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Flat">Flat / Apartment</option>
                      <option value="Plot">Plot / Layout</option>
                      <option value="House">House / Villa</option>
                      <option value="Commercial">Commercial / Shop</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      value={rArea}
                      onChange={(e) => setRArea(e.target.value)}
                      placeholder="e.g. Besa, Wardha Rd"
                      className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Budget / Expected Price
                  </label>
                  <input
                    type="text"
                    value={rBudget}
                    onChange={(e) => setRBudget(e.target.value)}
                    placeholder="e.g. ₹45 - 55 Lakhs"
                    className="w-full p-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Additional Notes
                  </label>
                  <input
                    type="text"
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    placeholder="e.g. 2nd floor preferred, loan approved..."
                    className="w-full p-2 text-xs font-medium rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveResale}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Save Resale Update
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CallOutcomePromptModal;
