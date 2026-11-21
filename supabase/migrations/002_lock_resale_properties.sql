-- ============================================================================
-- 002 — Close public access to resale_properties
-- Run once in the Supabase SQL Editor for project bdrmbhbzlbudpfvqdjga.
--
-- Migration 001 used to create policies that let ANYONE holding the public
-- anon key read, insert and update this table (owner names + phone numbers
-- included), and let any logged-in account do everything. The CRM no longer
-- needs them: it talks to the table through its own server.
--
-- Safe to run more than once. It deletes no data.
-- ============================================================================

ALTER TABLE public.resale_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resale_properties_all_auth ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_read ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_insert ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_anon_update ON public.resale_properties;
-- Older copies of the setup script (shown inside the app) used these names:
DROP POLICY IF EXISTS resale_properties_select ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_insert ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_update ON public.resale_properties;
DROP POLICY IF EXISTS resale_properties_delete ON public.resale_properties;

NOTIFY pgrst, 'reload schema';

-- Check: this must return zero rows.
-- SELECT policyname FROM pg_policies WHERE tablename = 'resale_properties';
