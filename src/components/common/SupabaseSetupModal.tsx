import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLiveSupabase: boolean;
  propertiesTableMissing: boolean;
  leadsCount: number;
  propertiesCount: number;
  projectsCount: number;
  onRetrySync: () => void;
}

const RESALE_PROPERTIES_SQL = `-- Run in Supabase SQL Editor (Project: bdrmbhbzlbudpfvqdjga)
CREATE TABLE IF NOT EXISTS public.resale_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_code TEXT UNIQUE,
  title TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'resale' CHECK (transaction_type IN ('resale', 'rent')),
  category TEXT NOT NULL DEFAULT 'flat' CHECK (category IN ('flat', 'house_villa', 'plot', 'commercial', 'farmhouse')),
  locality TEXT NOT NULL,
  corridor TEXT NOT NULL DEFAULT 'South Nagpur',
  address TEXT NOT NULL,
  landmark TEXT,
  maps_url TEXT,
  price TEXT NOT NULL,
  price_numeric BIGINT NOT NULL DEFAULT 0,
  rate_per_sqft INTEGER,
  maintenance_monthly INTEGER DEFAULT 0,
  area_sqft INTEGER NOT NULL DEFAULT 0,
  carpet_area_sqft INTEGER,
  bhk TEXT,
  bathrooms INTEGER DEFAULT 2,
  balconies INTEGER DEFAULT 1,
  floor TEXT,
  furnishing TEXT DEFAULT 'Semi-Furnished',
  facing TEXT DEFAULT 'East',
  age_of_property TEXT DEFAULT 'Ready to Move',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'under_discussion', 'token_received', 'sold', 'rented')),
  is_verified BOOLEAN NOT NULL DEFAULT true,
  verification_badge TEXT,
  legal_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  highlights TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  owner JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resale_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resale_properties_select ON public.resale_properties;
CREATE POLICY resale_properties_select ON public.resale_properties FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));

DROP POLICY IF EXISTS resale_properties_insert ON public.resale_properties;
CREATE POLICY resale_properties_insert ON public.resale_properties FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));

DROP POLICY IF EXISTS resale_properties_update ON public.resale_properties;
CREATE POLICY resale_properties_update ON public.resale_properties FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));

DROP POLICY IF EXISTS resale_properties_delete ON public.resale_properties;
CREATE POLICY resale_properties_delete ON public.resale_properties FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Sales Manager', 'Operational Manager')));

NOTIFY pgrst, 'reload schema';`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  isLiveSupabase,
  propertiesTableMissing,
  leadsCount,
  propertiesCount,
  projectsCount,
  onRetrySync,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(RESALE_PROPERTIES_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Saraswati Nagri Supabase Connection</h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Project: <span className="font-mono text-teal-700">bdrmbhbzlbudpfvqdjga.supabase.co</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>public.leads</span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1 font-semibold">
                {isLiveSupabase ? `${leadsCount} synced live` : 'Connected when signed in'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>public.projects</span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1 font-semibold">
                {isLiveSupabase ? `${projectsCount} SN layouts synced` : 'Connected when signed in'}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              propertiesTableMissing
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className={`flex items-center gap-1.5 font-black ${
                propertiesTableMissing ? 'text-amber-800' : 'text-emerald-700'
              }`}>
                {propertiesTableMissing ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>public.resale_properties</span>
              </div>
              <p className={`text-[11px] mt-1 font-semibold ${
                propertiesTableMissing ? 'text-amber-700' : 'text-emerald-800'
              }`}>
                {propertiesTableMissing ? 'SQL migration pending' : `${propertiesCount} properties synced`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-black text-slate-800">
                {propertiesTableMissing
                  ? 'Run this SQL once in Supabase SQL Editor to store Resale Properties in Supabase:'
                  : 'Supabase Migration SQL (public.resale_properties)'}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'SQL Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-56 leading-relaxed">
              {RESALE_PROPERTIES_SQL}
            </pre>
            <div className="flex items-center justify-between pt-1">
              <a
                href="https://supabase.com/dashboard/project/bdrmbhbzlbudpfvqdjga/sql/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-teal-700 hover:underline font-bold"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onRetrySync();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
              >
                Verify &amp; Refresh Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

