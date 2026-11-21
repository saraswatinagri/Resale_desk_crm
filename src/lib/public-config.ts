// Values that are PUBLIC by design. The anon key is shipped to every browser by
// Supabase's own model and can only do what row-level security allows.
//
// NEVER put the service-role key (or any other secret) in this file or in any
// VITE_-prefixed variable: Vite copies those into the JavaScript that every
// visitor downloads. Secrets live only in server env vars read by /api routes.

export const PUBLIC_SUPABASE_URL = 'https://bdrmbhbzlbudpfvqdjga.supabase.co';

export const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcm1iaGJ6bGJ1ZHBmdnFkamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDk5MDQsImV4cCI6MjA5MDQyNTkwNH0.o9n1G_21xuYofTY2g0HqoGWU1tUAvyJ6bLCwoJH0pOY';

/** Roles allowed to use the Resale Desk at all (lower-case). */
export const EMPLOYEE_ROLES: readonly string[] = [
  'super admin',
  'director',
  'team lead',
  'sales agent',
  'operational manager',
  'staff',
  'admin',
  'accounts & finance',
  'intern',
  'driver',
];

/** Roles allowed to delete leads / properties (lower-case). */
export const ADMIN_ROLES: readonly string[] = [
  'super admin',
  'director',
  'admin',
  'operational manager',
];
