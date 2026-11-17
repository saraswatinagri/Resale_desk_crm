import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  ChevronDown,
  Users,
  FileWarning,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { supabaseDb } from '../../lib/supabase';
import {
  SHEET_MARKER,
  buildVisitAudit,
  dedupeSheetTexts,
  last10Digits,
  parseVisitSheet,
  type AuditMissingVisit,
  type LeadRef,
  type ParsedSheet,
  type VisitAuditData,
} from '../../lib/leads/visit-sheet-audit';

interface VisitAuditPanelProps {
  onOpenLeadByPhone?: (phone: string, leadId?: string | null) => void;
}

export const VisitAuditPanel: React.FC<VisitAuditPanelProps> = ({ onOpenLeadByPhone }) => {
  const [data, setData] = useState<VisitAuditData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const runAudit = useCallback(async () => {
    if (!supabaseDb) {
      setLoadError('Database not connected');
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      // 1. Fetch all WhatsApp slips containing SHEET_MARKER
      const { data: messages, error: msgErr } = await supabaseDb
        .from('whatsapp_messages')
        .select('text, message_timestamp')
        .ilike('text', `%${SHEET_MARKER}%`)
        .order('message_timestamp', { ascending: true });

      if (msgErr) throw msgErr;

      const rawRows = messages || [];
      const sheets: ParsedSheet[] = dedupeSheetTexts(rawRows.map((r: any) => r.text)).map(parseVisitSheet);

      // 2. Fetch leads for matching
      const { data: leadRows, error: leadsErr } = await supabaseDb
        .from('leads')
        .select('id, lead_number, name, phone, status, site_visit_date, assigned_to');

      if (leadsErr) throw leadsErr;

      // 3. Fetch site visit interactions
      const { data: interactions, error: intErr } = await supabaseDb
        .from('lead_interactions')
        .select('lead_id')
        .eq('type', 'site_visit');

      if (intErr) console.warn('Could not load interactions:', intErr);

      // 4. Fetch profiles for owner names
      const { data: profiles } = await supabaseDb
        .from('profiles')
        .select('id, full_name');

      const ownerNameById = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        ownerNameById.set(p.id, p.full_name || 'Staff');
      });

      const leadsByLast10 = new Map<string, LeadRef>();
      (leadRows || []).forEach((l: any) => {
        const last10 = last10Digits(l.phone);
        if (last10 && !leadsByLast10.has(last10)) {
          leadsByLast10.set(last10, {
            id: l.id,
            leadNo: l.lead_number,
            name: l.name,
            phone: l.phone,
            status: l.status,
            siteVisitDate: l.site_visit_date,
            assignedTo: l.assigned_to,
          });
        }
      });

      const leadIdsWithVisitEntry = new Set<string>();
      (interactions || []).forEach((i: any) => {
        if (i.lead_id) leadIdsWithVisitEntry.add(i.lead_id);
      });

      const now = new Date();
      const computedAt = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

      const auditResult = buildVisitAudit({
        sheets,
        leadsByLast10,
        leadIdsWithVisitEntry,
        ownerNameById,
        window: { from: 'All WhatsApp Slips', to: 'Live' },
        computedAt,
      });

      setData(auditResult);
    } catch (err: any) {
      console.error('Visit audit calculation error:', err);
      setLoadError(err?.message || 'Audit calculation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        <span className="text-xs font-bold text-slate-700">WhatsApp Visit Sheets CRM se match ho rahi hain…</span>
        <span className="text-[11px] text-slate-400">Reconciling whatsapp_messages vs leads &amp; interactions</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold">{loadError}</p>
        </div>
        <button
          onClick={runAudit}
          className="rounded-full bg-white border border-red-200 px-4 py-1.5 text-xs font-black text-red-700 cursor-pointer hover:bg-red-100 transition-colors"
        >
          Dobara try karo
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <AuditBody
      data={data}
      loading={loading}
      onRefresh={runAudit}
      searchFilter={searchFilter}
      onSearchChange={setSearchFilter}
      onOpenLeadByPhone={onOpenLeadByPhone}
    />
  );
};

function AuditBody({
  data,
  loading,
  onRefresh,
  searchFilter,
  onSearchChange,
  onOpenLeadByPhone,
}: {
  data: VisitAuditData;
  loading: boolean;
  onRefresh: () => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
  onOpenLeadByPhone?: (phone: string, leadId?: string | null) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, AuditMissingVisit[]>();
    for (const row of data.missing) {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const match =
          row.client.toLowerCase().includes(q) ||
          row.mobile.includes(q) ||
          row.site.toLowerCase().includes(q) ||
          row.visitBy.toLowerCase().includes(q) ||
          row.owner.toLowerCase().includes(q);
        if (!match) continue;
      }
      const list = map.get(row.period);
      if (list) list.push(row);
      else map.set(row.period, [row]);
    }
    return [...map.entries()].map(([period, rows]) => ({ period, rows }));
  }, [data.missing, searchFilter]);

  const [openPeriods, setOpenPeriods] = useState<Set<string>>(
    () => new Set(grouped.slice(0, 2).map((g) => g.period))
  );
  const [showPeople, setShowPeople] = useState(true);

  const unusableTotal = data.unusable.blankSheet + data.unusable.noMobileWritten + data.unusable.mobileNotInCrm;
  const maxNamed = Math.max(1, ...data.byPerson.map((p) => p.namedOn));
  const zeroSheet = data.byPerson.filter((p) => p.namedOn === 0).map((p) => p.name);
  const missingPct = Math.round((data.tally.missing / Math.max(1, data.tally.checkable)) * 100);

  const togglePeriod = (period: string) => {
    setOpenPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Verdict Card (Saraswati Nagri CRM design) ── */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm md:text-base font-black text-amber-950 leading-snug">
                {data.tally.missing} visit WhatsApp slips par likhi hain, CRM me nahi
              </p>
              <p className="text-xs font-semibold text-amber-900/80 leading-relaxed">
                {data.tally.checkable} visits check ho sakti thi — {missingPct}% ka CRM me koi entry nahi. Sheet bani, customer property / layout par gaya, CRM me record nahi hua.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold shadow-sm hover:bg-amber-100/60 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="SS Sales Group WhatsApp slips se re-audit karo"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Auditing...' : 'Re-Audit Slips'}</span>
          </button>
        </div>

        {/* 4-Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-amber-200 divide-x divide-amber-200 bg-white/60">
          {[
            { k: 'Sheet mili', v: data.tally.sheets, tone: 'text-slate-800' },
            { k: 'Check ho sakti', v: data.tally.checkable, tone: 'text-slate-800' },
            { k: 'CRM me hai', v: data.tally.inCrm, tone: 'text-emerald-700' },
            { k: 'CRM me nahi', v: data.tally.missing, tone: 'text-red-700' },
          ].map((c, i) => (
            <div key={c.k} className={`px-4 py-3 ${i < 2 ? 'border-b border-amber-200 md:border-b-0' : ''}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 leading-none">{c.k}</p>
              <p className={`mt-1.5 text-2xl font-black tabular-nums leading-none ${c.tone}`}>{c.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Search Filter ── */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter missing visits by client name, mobile, site or executive..."
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
        />
      </div>

      {/* ── Missing Visits Breakdown ── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 md:px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              CRM me daalni hain — {data.tally.missing}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {grouped.reduce((sum, g) => sum + g.rows.length, 0)} visits showing
          </span>
        </div>

        {grouped.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            Koi missing visit filter se match nahi hui.
          </div>
        ) : (
          grouped.map(({ period, rows }) => {
            const open = openPeriods.has(period);
            return (
              <div key={period} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => togglePeriod(period)}
                  className="w-full flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{period}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-600">
                      {rows.length}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {open && (
                  <ul className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <li key={`${row.leadNo}:${row.sheetDate}:${i}`} className="px-4 md:px-5 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-black text-slate-800 leading-tight truncate">
                              {row.client}
                              {row.note && <span className="ml-1.5 text-[10px] font-bold text-slate-400 normal-case">({row.note})</span>}
                            </p>
                            <p className="text-xs font-bold text-slate-500 tabular-nums">
                              {row.mobile} · L-{row.leadNo}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                              <span className="text-slate-400">Site:</span> <span className="font-bold text-slate-700">{row.site}</span>
                              <span className="mx-1.5 text-slate-300">•</span>
                              <span className="text-slate-400">Visit ki:</span> <span className="font-bold text-slate-700">{row.visitBy}</span>
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400">
                              CRM owner: <span className="text-slate-600 font-bold">{row.owner}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 tabular-nums whitespace-nowrap">
                              {row.sheetDate}
                            </span>
                            {onOpenLeadByPhone && (
                              <button
                                type="button"
                                onClick={() => onOpenLeadByPhone(row.mobile, row.leadId)}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[10px] font-black transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                              >
                                Lead kholo <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* ── Kiska naam sheet par hai (Breakdown by Sales Executive) ── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPeople((v) => !v)}
          className="w-full px-4 py-3 md:px-5 border-b border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Kiska naam sheet par hai (Staff Breakdown)
            </span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${showPeople ? 'rotate-180' : ''}`} />
        </button>

        {showPeople && (
          <>
            <ul className="divide-y divide-slate-100">
              {data.byPerson.map((p) => (
                <li key={p.name} className="px-4 md:px-5 py-3 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-black text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] font-bold text-slate-400 tabular-nums shrink-0 whitespace-nowrap">
                      {p.namedOn} sheet
                    </p>
                  </div>
                  {/* Visual Bar: Green = in CRM, Red = missing, Gray = not in CRM */}
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="bg-emerald-500" style={{ width: `${(p.inCrm / maxNamed) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(p.missing / maxNamed) * 100}%` }} />
                    <div className="bg-slate-300" style={{ width: `${(p.customerNotInCrm / maxNamed) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold tabular-nums">
                    <span className="text-emerald-700">{p.inCrm} CRM me</span>
                    <span className="text-red-700">{p.missing} nahi hai</span>
                    {p.customerNotInCrm > 0 && (
                      <span className="text-slate-400">{p.customerNotInCrm} lead hi nahi bani</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 md:px-5 py-3 bg-slate-50 border-t border-slate-100 space-y-1.5 text-[11px] font-semibold text-slate-600">
              <p>Ek sheet par 2-3 naam hote hain, to un teeno ka count hota hai.</p>
              {zeroSheet.length > 0 && (
                <p>
                  <b className="text-slate-800">{zeroSheet.join(', ')}</b> ka naam kisi bhi sheet par nahi mila.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Unusable Sheets ── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 md:px-5 border-b border-slate-100 flex items-center gap-2">
          <FileWarning className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Check hi nahi ho sakti — {unusableTotal}
          </p>
        </div>
        <ul className="divide-y divide-slate-100 text-xs">
          {[
            { n: data.unusable.blankSheet, t: 'Sheet khaali chhod di', s: 'Na naam, na number — visit hui par kiski pata nahi' },
            { n: data.unusable.noMobileWritten, t: 'Naam hai, mobile nahi likha', s: 'Lead se jodne ka koi tareeka nahi' },
            { n: data.unusable.mobileNotInCrm, t: 'Number hai, lead hi nahi bani', s: 'Customer aaya, CRM me kabhi enter hi nahi hua' },
          ].map((r) => (
            <li key={r.t} className="px-4 md:px-5 py-3 flex items-start gap-3">
              <span className="mt-0.5 w-7 shrink-0 text-right text-base font-black tabular-nums text-slate-700">{r.n}</span>
              <span className="min-w-0">
                <span className="block text-xs font-black text-slate-700 leading-snug">{r.t}</span>
                <span className="block text-[11px] font-semibold text-slate-400 leading-relaxed">{r.s}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Provenance Note ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:px-5 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Ye data kahan se aaya</p>
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
          Team ke WhatsApp par aane wali handwritten slips &amp; text slips (<span className="font-bold text-slate-700">SS Group_Sales</span>) se live sync kiya jata hai. Har slip se customer ka mobile number aur details read karke CRM leads se reconcile kiya jata hai.
        </p>
        <p className="text-[10px] font-bold text-slate-400 tabular-nums pt-0.5">
          Live calculated on {data.computedAt} from Supabase whatsapp_messages table.
        </p>
      </div>
    </div>
  );
}

export default VisitAuditPanel;
