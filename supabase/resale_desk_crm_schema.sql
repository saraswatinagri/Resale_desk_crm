-- ==============================================================================
-- SARASWATI NAGRI & NAGPUR PROPERTIES RESALE DESK CRM - COMPLETE DATABASE SCHEMA
-- Compatible with Saraswati Nagri Supabase Architecture & Evolution WhatsApp Gateway
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (Staff, Admins, Sales Agents, Team Leads)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Sales Agent',
  avatar TEXT,
  color TEXT DEFAULT 'from-rose-500 to-amber-500',
  department TEXT DEFAULT 'Sales',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. RESALE PROPERTIES INVENTORY TABLE (Flats, Plots, Villas, Commercials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resale_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'resale',
  category TEXT NOT NULL DEFAULT 'flat',
  locality TEXT NOT NULL,
  corridor TEXT NOT NULL,
  address TEXT NOT NULL,
  landmark TEXT,
  maps_url TEXT,
  price TEXT NOT NULL,
  price_numeric BIGINT NOT NULL DEFAULT 0,
  rate_per_sqft INTEGER,
  maintenance_monthly NUMERIC DEFAULT 0,
  area_sqft INTEGER NOT NULL DEFAULT 1000,
  carpet_area_sqft INTEGER,
  bhk TEXT,
  bathrooms INTEGER DEFAULT 2,
  balconies INTEGER DEFAULT 1,
  floor TEXT DEFAULT '3rd Floor',
  furnishing TEXT DEFAULT 'Semi-Furnished',
  facing TEXT DEFAULT 'East',
  age_of_property TEXT DEFAULT 'Ready to Move',
  status TEXT NOT NULL DEFAULT 'available',
  is_verified BOOLEAN DEFAULT true,
  verification_badge TEXT DEFAULT 'Clear Title Verified',
  legal_status JSONB DEFAULT '{
    "nmrdaApproved": true,
    "rlAvailable": true,
    "reraRegistered": true,
    "nitApproved": false,
    "clearTitle": true,
    "loanEligible": true,
    "eligibleBanks": ["State Bank of India", "HDFC Bank", "ICICI Bank", "Bank of Maharashtra"]
  }'::jsonb,
  amenities TEXT[] DEFAULT ARRAY[
    'Covered Car Parking',
    'Elevator / Lift',
    '24x7 Security & Guard',
    '24 Hours Water (Borewell + NMC)'
  ],
  highlights TEXT[] DEFAULT ARRAY[
    'Prime location in Nagpur growth corridor',
    'Clear Title & 100% bank loan possible'
  ],
  images TEXT[] DEFAULT ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'
  ],
  description TEXT,
  owner JSONB DEFAULT '{
    "name": "Owner / Resale Desk",
    "phone": "+91 89560 40220",
    "whatsapp": "+91 89560 40220",
    "negotiable": true,
    "commissionPercent": 2
  }'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lightning-fast search & filtering on public website & CRM
CREATE INDEX IF NOT EXISTS idx_resale_props_status ON public.resale_properties(status);
CREATE INDEX IF NOT EXISTS idx_resale_props_locality ON public.resale_properties(locality);
CREATE INDEX IF NOT EXISTS idx_resale_props_category ON public.resale_properties(category);
CREATE INDEX IF NOT EXISTS idx_resale_props_price ON public.resale_properties(price_numeric);

-- ==============================================================================
-- 4. LEADS TABLE (Exact Saraswati Nagri CRM Compatibility)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  entity TEXT DEFAULT 'Saraswati Nagri',
  source TEXT DEFAULT 'Resale Desk',
  status TEXT DEFAULT 'New Inquiry',
  stage TEXT DEFAULT 'lead_captured',
  property_type TEXT DEFAULT 'Wants to Buy a Property (Resale)',
  plot_interest TEXT,
  location_preference TEXT,
  budget_min BIGINT DEFAULT 0,
  budget_max BIGINT DEFAULT 0,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  site_visit_date TIMESTAMPTZ,
  site_visit_status TEXT,
  interaction_count INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);

-- ==============================================================================
-- 5. WHATSAPP SESSIONS TABLE (Multi-Instance & Office Master Gateway Line)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID UNIQUE NOT NULL,
  instance_name TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'evolution',
  phone_number TEXT,
  status TEXT DEFAULT 'connected',
  qrcode TEXT,
  pairing_code TEXT,
  last_connected_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 6. WHATSAPP MESSAGES TABLE (Real-Time Inbound/Outbound Audit Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'evolution',
  instance_name TEXT,
  chat_jid TEXT NOT NULL,
  wa_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT,
  to_number TEXT,
  text TEXT,
  media_url TEXT,
  media_type TEXT,
  push_name TEXT,
  is_group BOOLEAN DEFAULT false,
  message_timestamp TIMESTAMPTZ DEFAULT now(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_jid ON public.whatsapp_messages(chat_jid);
CREATE INDEX IF NOT EXISTS idx_wa_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_wa_messages_lead_id ON public.whatsapp_messages(lead_id);

-- ==============================================================================
-- 7. LEAD INTERACTIONS (Timeline Events & AI Auto-Reply Audits)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'call',
  content TEXT,
  outcome TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON public.lead_interactions(lead_id);

-- ==============================================================================
-- 8. SITE VISITS TABLE (Audited Driver & Executive Site Visits)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id TEXT,
  visit_date DATE NOT NULL,
  visit_time TEXT,
  pickup_location TEXT,
  driver_name TEXT,
  status TEXT DEFAULT 'scheduled',
  feedback TEXT,
  outcome TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resale_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow full read/write for authenticated users & anon (backed by application logic)
DROP POLICY IF EXISTS "Public and auth access for profiles" ON public.profiles;
CREATE POLICY "Public and auth access for profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for resale_properties" ON public.resale_properties;
CREATE POLICY "Public and auth access for resale_properties" ON public.resale_properties FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for leads" ON public.leads;
CREATE POLICY "Public and auth access for leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "Public and auth access for whatsapp_sessions" ON public.whatsapp_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Public and auth access for whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for lead_interactions" ON public.lead_interactions;
CREATE POLICY "Public and auth access for lead_interactions" ON public.lead_interactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for site_visits" ON public.site_visits;
CREATE POLICY "Public and auth access for site_visits" ON public.site_visits FOR ALL USING (true) WITH CHECK (true);

-- Grant privileges to standard Supabase roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 10. SEED DATA (Saraswati Nagri Office Master & Nagpur Resale Inventory)
-- ==============================================================================
-- Master Admin Profile
INSERT INTO public.profiles (id, full_name, email, phone, role, avatar, color, department, is_active)
VALUES (
  'dbc71212-d38b-40cc-8df2-4a99828ff449',
  'SaraswatiNagri (Office)',
  'saraswatinagri@gmail.com',
  '+91 89560 40220',
  'Super Admin',
  'SN',
  'from-rose-500 to-amber-500',
  'Management',
  true
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- Master Office WhatsApp Connected Session
INSERT INTO public.whatsapp_sessions (agent_id, instance_name, provider, phone_number, status, last_connected_at, last_seen_at)
VALUES (
  'dbc71212-d38b-40cc-8df2-4a99828ff449',
  'agent_dbc71212-d38b-40cc-8df2-4a99828ff449',
  'evolution',
  '918956040220',
  'connected',
  now(),
  now()
)
ON CONFLICT (agent_id) DO UPDATE SET
  status = 'connected',
  phone_number = '918956040220',
  last_seen_at = now();

-- Sample Verified Resale Properties in Nagpur Corridors
INSERT INTO public.resale_properties (
  property_code, title, transaction_type, category, locality, corridor, address,
  price, price_numeric, rate_per_sqft, area_sqft, carpet_area_sqft, bhk, furnishing, facing, status
)
VALUES
  (
    'RD-2024-001',
    '3 BHK Luxurious Apartment in Manish Nagar near Besa Square',
    'resale',
    'flat',
    'Manish Nagar',
    'South Nagpur',
    'Near Besa Square, Manish Nagar, Nagpur',
    '₹68 Lakhs',
    6800000,
    4689,
    1450,
    1100,
    '3 BHK',
    'Semi-Furnished',
    'East',
    'available'
  ),
  (
    'RD-2024-002',
    'NMRDA Sanctioned & RL Released Residential Plot in Besa',
    'resale',
    'plot',
    'Besa',
    'South Nagpur',
    'Ghogli Road, Besa, Nagpur',
    '₹48 Lakhs',
    4800000,
    3200,
    1500,
    1500,
    'Plot / Open Land',
    'Unfurnished',
    'East',
    'available'
  ),
  (
    'RD-2024-003',
    'Ready to Move 2 BHK Flat in Narendra Nagar',
    'resale',
    'flat',
    'Narendra Nagar',
    'South Nagpur',
    'Near Ring Road, Narendra Nagar, Nagpur',
    '₹46 Lakhs',
    4600000,
    4380,
    1050,
    800,
    '2 BHK',
    'Fully Furnished',
    'North',
    'available'
  ),
  (
    'RD-2024-004',
    '4 BHK Independent Duplex Bungalow in Wardha Road',
    'resale',
    'house_villa',
    'Wardha Road',
    'South Nagpur',
    'Near MIHAN & Airport Metro, Wardha Road, Nagpur',
    '₹1.25 Crore',
    12500000,
    5681,
    2200,
    1800,
    '4 BHK',
    'Semi-Furnished',
    'West',
    'available'
  )
ON CONFLICT (property_code) DO NOTHING;
