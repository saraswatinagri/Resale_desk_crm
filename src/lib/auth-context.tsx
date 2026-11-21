import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseDb, supabaseAuth, isSupabaseConfigured } from './supabase';
import { EMPLOYEE_ROLES } from './public-config';
import type { CrmUserProfile } from '../types/crm';

export interface AuthState {
  user: CrmUserProfile | null;
  profiles: CrmUserProfile[];
  isLoading: boolean;
  isLiveSupabase: boolean;
  signInWithPassword: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CrmUserProfile | null>(null);
  const [profiles, setProfiles] = useState<CrmUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileAndRoster = useCallback(async (userId: string, emailFallback?: string) => {
    if (!supabaseDb) return false;

    try {
      const [{ data: myProfile }, { data: roster }] = await Promise.all([
        supabaseDb
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar, color, is_active, department')
          .eq('id', userId)
          .maybeSingle(),
        supabaseDb
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar, color, is_active, department')
          .eq('is_active', true)
          .order('full_name', { ascending: true }),
      ]);

      const mapRow = (p: Record<string, unknown>): CrmUserProfile => {
        const fullName = String(p.full_name || emailFallback || 'CRM Executive');
        const av = typeof p.avatar === 'string' && p.avatar.trim().length <= 2 ? p.avatar.trim() : fullName.charAt(0).toUpperCase();
        return {
          id: String(p.id),
          fullName,
          email: String(p.email || emailFallback || ''),
          phone: String(p.phone || ''),
          role: String(p.role || 'Sales Agent'),
          avatar: av,
          color: String(p.color || 'from-rose-500 to-amber-500'),
          isActive: p.is_active !== false,
          department: typeof p.department === 'string' ? p.department : '',
        };
      };

      // No profile, inactive, or not a staff role = not allowed in. The server
      // enforces the same rule on every request; this just keeps the UI honest.
      const activeUser = myProfile ? mapRow(myProfile as Record<string, unknown>) : null;
      if (!activeUser || !activeUser.isActive || !EMPLOYEE_ROLES.includes(activeUser.role.trim().toLowerCase())) {
        setUser(null);
        setProfiles([]);
        await supabaseAuth?.auth.signOut().catch(() => {});
        return false;
      }

      setUser(activeUser);

      if (Array.isArray(roster)) {
        setProfiles(roster.map((r) => mapRow(r as Record<string, unknown>)));
      }
      return true;
    } catch (e) {
      console.warn('Profile/roster fetch warning:', e);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured || !supabaseAuth) {
        if (mounted) setIsLoading(false);
        return;
      }

      // Left over from the old build, which trusted this value as a login.
      window.localStorage.removeItem('omcrm_user_session');
      window.localStorage.removeItem('resale_desk_demo_mode');

      try {
        const { data: { session } } = await supabaseAuth.auth.getSession();
        if (session?.user && mounted) {
          await loadProfileAndRoster(session.user.id, session.user.email);
        }
      } catch (err) {
        console.error('Supabase session init failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    if (supabaseAuth) {
      const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          // Deferred: awaiting Supabase calls inside this callback deadlocks the auth client.
          const { id, email } = session.user;
          setTimeout(() => {
            if (mounted) void loadProfileAndRoster(id, email);
          }, 0);
        } else {
          setUser(null);
          setProfiles([]);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [loadProfileAndRoster]);

  const signInWithPassword = async (identifier: string, password: string) => {
    if (!supabaseAuth) return { success: false, error: 'Database client not initialized' };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.access_token || !payload?.refresh_token) {
        return { success: false, error: payload?.error || 'Login failed. Please try again.' };
      }

      const { data, error } = await supabaseAuth.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (error || !data.user) {
        return { success: false, error: error?.message || 'Login failed. Please try again.' };
      }

      const allowed = await loadProfileAndRoster(data.user.id, data.user.email);
      return allowed
        ? { success: true }
        : { success: false, error: 'This account cannot use the Resale Desk.' };
    } catch {
      return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
    }
  };

  const signOut = async () => {
    if (supabaseAuth) {
      await supabaseAuth.auth.signOut().catch(() => {});
    }
    setUser(null);
    setProfiles([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        isLoading,
        isLiveSupabase: Boolean(isSupabaseConfigured && supabaseDb),
        signInWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
