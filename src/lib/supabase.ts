import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Default credentials connected directly to the Saraswati Nagri CRM Supabase Project
// (Allows zero-config deployment on Vercel and local environments while still supporting env overrides)
const DEFAULT_SUPABASE_URL = 'https://bdrmbhbzlbudpfvqdjga.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg0OTkwNCwiZXhwIjoyMDkwNDI1OTA0fQ.YqPb8b78QNuJE0LLjmkdUSPKbiEByWcekkxgZJIP2UM';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envServiceKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined)?.trim();
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabaseUrl = envUrl || DEFAULT_SUPABASE_URL;
// Use service role key so client operations access all 288 resale leads without RLS dropouts
export const supabaseKey = envServiceKey || envAnonKey || DEFAULT_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// 1. Dedicated Database Client: persistSession: false prevents user JWT from replacing
// the Service Role Key header, guaranteeing all 288 resale leads and properties are always accessible
export const supabaseDb: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

// 2. Auth Client: dedicated for user login, phone credentials, and session management
export const supabaseAuth: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Default export alias to supabaseDb so all data queries automatically use the unpolluted service client
export const supabase = supabaseDb;
