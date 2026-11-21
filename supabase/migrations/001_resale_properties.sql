-- ============================================================================
-- Nagpur Properties / Saraswati Nagri Resale Desk: resale_properties table
-- Run this once in the Supabase SQL Editor for project bdrmbhbzlbudpfvqdjga
-- ============================================================================

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
  legal_status JSONB NOT NULL DEFAULT '{
    "nmrdaApproved": true,
    "reraRegistered": false,
    "rlAvailable": true,
    "nitApproved": false,
    "clearTitle": true,
    "loanEligible": true,
    "eligibleBanks": ["State Bank of India", "HDFC Bank"]
  }'::jsonb,
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

CREATE INDEX IF NOT EXISTS resale_properties_locality_idx ON public.resale_properties (locality);
CREATE INDEX IF NOT EXISTS resale_properties_status_idx ON public.resale_properties (status);
CREATE INDEX IF NOT EXISTS resale_properties_transaction_idx ON public.resale_properties (transaction_type);
CREATE INDEX IF NOT EXISTS resale_properties_created_at_idx ON public.resale_properties (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_resale_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resale_properties_updated_at ON public.resale_properties;
CREATE TRIGGER trg_resale_properties_updated_at
  BEFORE UPDATE ON public.resale_properties
  FOR EACH ROW EXECUTE FUNCTION public.set_resale_properties_updated_at();

ALTER TABLE public.resale_properties ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. With row-level security ON and no policy, the anon
-- and authenticated keys can do NOTHING to this table. The CRM reaches it only
-- through its own server (/api/db), which checks the employee's login first.
DROP POLICY IF EXISTS resale_properties_all_auth ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_read ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_insert ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_update ON public.resale_properties;

NOTIFY pgrst, 'reload schema';
