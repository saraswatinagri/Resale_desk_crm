import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  Check,
  Loader2,
  Clock,
  Sparkles,
  User,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { ResaleLead, CallLog } from '../../types/crm';
import { SALES_AGENTS } from '../../data/constants';
import { useAuth } from '../../lib/auth-context';

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
}

const OUTCOME_OPTIONS: Array<{
  value: CallLog['outcome'];
  label: string;
  hinglish: string;
  color: string;
}> = [
  { value: 'Interested', label: 'Interested', hinglish: 'Follow-up chahiye', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { value: 'Scheduled Visit', label: 'Visit Scheduled', hinglish: 'Site visit tay hui', color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
  { value: 'Site Visit Done', label: 'Visit Done', hinglish: 'Visit ho gayi', color: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
  { value: 'Follow-up Needed', label: 'Follow-up Needed', hinglish: 'Baad me baat karenge', color: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100' },
  { value: 'Ringing / No Answer', label: 'Ringing / No Answer', hinglish: 'Call nahi uthaya', color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' },
  { value: 'Price Too High', label: 'Price Too High', hinglish: 'Price zyada laga', color: 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100' },
  { value: 'Already Sold', label: 'Already Sold', hinglish: 'Sold out ho gaya', color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' },
  { value: 'Already Rented', label: 'Already Rented', hinglish: 'Rent pe de diya', color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' },
  { value: 'Bought Elsewhere', label: 'Bought Elsewhere', hinglish: 'Kahin aur le liya', color: 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200' },
  { value: 'Requirement Closed', label: 'Deal Closed', hinglish: 'Token / Registry Done', color: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
  { value: 'Not Interested', label: 'Not Interested', hinglish: 'Interested nahi hai', color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
];

export const CallOutcomePromptModal: React.FC<CallOutcomePromptModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveOutcome
}) => {
  const { user, profiles } = useAuth();
  if (!isOpen || !lead) return null;

  const defaultCaller = user?.fullName || lead.assignedTo || SALES_AGENTS[0].name;

  const [caller, setCaller] = useState(defaultCaller);
  const [outcome, setOutcome] = useState<CallLog['outcome']>('Interested');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Suggested preset notes
  const PRESET_NOTES = [
    'Client responded positively. Discussed preferred location & budget.',
    'Site visit booked for this weekend. Will send location on WhatsApp.',
    'Number was ringing, no response. Will re-dial tomorrow.',
    'Price expectation is lower than quoted. Need to negotiate with seller.',
    'Customer confirmed they purchased another property.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveOutcome(lead.id, {
        caller,
        notes: notes.trim() || `Call outcome: ${outcome}`,
        outcome,
        nextFollowUpDate: followUpDate || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error saving call outcome:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                Log Call Outcome — {lead.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {lead.phone} · {lead.leadCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Outcome Chips */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
              Select Call Outcome
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20'
                        : opt.color
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] leading-tight">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <span className={`text-[10px] ${isSelected ? 'text-teal-100 font-medium' : 'text-slate-500'}`}>
                      {opt.hinglish}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caller / Executive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Caller Executive
              </label>
              <select
                value={caller}
                onChange={(e) => setCaller(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {user?.fullName && <option value={user.fullName}>{user.fullName} (You)</option>}
                {SALES_AGENTS.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Next Follow Up */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Next Follow-up (Date &amp; Time)
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Discussion Note */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Discussion Summary / Notes
            </label>
            <textarea
              rows={2}
              placeholder="What did the client say? Next steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PRESET_NOTES.slice(0, 3).map((pn, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(pn)}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  + {pn.slice(0, 35)}…
                </button>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              Updates lead stage &amp; writes to timeline
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Call Outcome</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CallOutcomePromptModal;
