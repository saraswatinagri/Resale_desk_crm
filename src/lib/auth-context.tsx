import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { CrmUserProfile } from '../types/crm';

export interface AuthState {
  user: CrmUserProfile | null;
  profiles: CrmUserProfile[];
  isLoading: boolean;
  isLiveSupabase: boolean;
  isDemoMode: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  enterDemoMode: () => void;
  signOut: () => Promise<void>;
}

const DEMO_USER: CrmUserProfile = {
  id: 'demo-nilesh',
  fullName: 'Nilesh Thakre',
  email: 'nilesh@saraswatinagri.com',
  phone: '9822451080',
  role: 'Resale Desk Head',
  avatar: 'NT',
  color: 'from-rose-500 to-amber-500',
  isActive: true,
  department: 'Sales',
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CrmUserProfile | null>(null);
  const [profiles, setProfiles] = useState<CrmUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadProfileAndRoster = useCallback(async (userId: string, emailFallback?: string) => {
    if (!supabase) return;

    const [{ data: myProfile }, { data: roster }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, avatar, color, is_active, department')
        .eq('id', userId)
        .maybeSingle(),
      supabase
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

    if (myProfile) {
      setUser(mapRow(myProfile as Record<string, unknown>));
    } else {
      setUser({
        id: userId,
        fullName: emailFallback?.split('@')[0] || 'CRM Executive',
        email: emailFallback || '',
        phone: '',
        role: 'Sales Executive',
        avatar: (emailFallback || 'U').charAt(0).toUpperCase(),
        color: 'from-rose-500 to-amber-500',
        isActive: true,
      });
    }

    if (Array.isArray(roster)) {
      setProfiles(roster.map((r) => mapRow(r as Record<string, unknown>)));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) {
          setIsDemoMode(true);
          setUser(DEMO_USER);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await loadProfileAndRoster(session.user.id, session.user.email);
          setIsDemoMode(false);
        } else if (window.localStorage.getItem('resale_desk_demo_mode') === '1' && mounted) {
          setIsDemoMode(true);
          setUser(DEMO_USER);
        }
      } catch (err) {
        console.error('Supabase session init failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          window.localStorage.removeItem('resale_desk_demo_mode');
          setIsDemoMode(false);
          await loadProfileAndRoster(session.user.id, session.user.email);
        } else if (window.localStorage.getItem('resale_desk_demo_mode') !== '1') {
          setUser(null);
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

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { success: false, error: 'Supabase URL/Key missing in .env.local' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || 'Invalid credentials' };
    }

    window.localStorage.removeItem('resale_desk_demo_mode');
    setIsDemoMode(false);
    await loadProfileAndRoster(data.user.id, data.user.email);
    return { success: true };
  };

  const enterDemoMode = () => {
    window.localStorage.setItem('resale_desk_demo_mode', '1');
    setIsDemoMode(true);
    setUser(DEMO_USER);
  };

  const signOut = async () => {
    window.localStorage.removeItem('resale_desk_demo_mode');
    setIsDemoMode(false);
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        isLoading,
        isLiveSupabase: Boolean(isSupabaseConfigured && user && !isDemoMode),
        isDemoMode,
        signInWithPassword,
        enterDemoMode,
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

