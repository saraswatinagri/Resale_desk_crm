import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://bdrmbhbzlbudpfvqdjga.supabase.co';

const supabaseKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL ||
  process.env.VITE_EVOLUTION_API_URL ||
  ''
).replace(/\/+$/, '');

export const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || '';

export function isEvolutionConfigured(): boolean {
  return Boolean(EVOLUTION_API_URL && EVOLUTION_API_KEY);
}

export const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || process.env.VITE_WHATSAPP_PROVIDER || 'evolution';
export const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

export function isMetaConfigured(): boolean {
  return Boolean(META_PHONE_NUMBER_ID && META_ACCESS_TOKEN);
}

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization'
  );
}

export const RESALE_APP_URL =
  process.env.VITE_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://resaledesk.saraswatinagri.com';
