import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseDb, supabaseAuth, isSupabaseConfigured } from './supabase';
import type { CrmUserProfile } from '../types/crm';

export interface AuthState {
  user: CrmUserProfile | null;
  profiles: CrmUserProfile[];
  isLoading: boolean;
  isLiveSupabase: boolean;
  isDemoMode: boolean;
  signInWithPassword: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  enterDemoMode: () => void;
  signOut: () => Promise<void>;
}

const DEFAULT_ADMIN_USER: CrmUserProfile = {
  id: 'dbc71212-d38b-40cc-8df2-4a99828ff449',
  fullName: 'SaraswatiNagri (Office)',
  email: 'saraswatinagri@gmail.com',
  phone: '8956040220',
  role: 'Super Admin',
  avatar: 'SN',
  color: 'from-rose-500 to-amber-500',
  isActive: true,
  department: 'Management',
};

// Recognized company employee roles from Saraswati Nagri CRM profiles
const EMPLOYEE_ROLES = new Set([
  'super admin',
  'director',
  'team lead',
  'sales agent',
  'operational manager',
  'staff',
  'admin',
  'accounts & finance',
  'intern',
  'driver'
]);

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CrmUserProfile | null>(null);
  const [profiles, setProfiles] = useState<CrmUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadProfileAndRoster = useCallback(async (userId: string, emailFallback?: string) => {
    if (!supabaseDb) return;

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

      let activeUser: CrmUserProfile;
      if (myProfile) {
        activeUser = mapRow(myProfile as Record<string, unknown>);
      } else {
        activeUser = {
          id: userId,
          fullName: emailFallback?.split('@')[0] || 'CRM Executive',
          email: emailFallback || '',
          phone: '',
          role: 'Sales Executive',
          avatar: (emailFallback || 'U').charAt(0).toUpperCase(),
          color: 'from-rose-500 to-amber-500',
          isActive: true,
        };
      }

      setUser(activeUser);
      window.localStorage.setItem('omcrm_user_session', JSON.stringify(activeUser));

      if (Array.isArray(roster)) {
        setProfiles(roster.map((r) => mapRow(r as Record<string, unknown>)));
      }
    } catch (e) {
      console.warn('Profile/roster fetch warning:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured || !supabaseAuth) {
        if (mounted) {
          setIsDemoMode(true);
          setUser(DEFAULT_ADMIN_USER);
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Check Supabase auth session
        const { data: { session } } = await supabaseAuth.auth.getSession();
        if (session?.user && mounted) {
          await loadProfileAndRoster(session.user.id, session.user.email);
          setIsDemoMode(false);
          return;
        }

        // 2. Check saved session in localStorage
        const savedSession = window.localStorage.getItem('omcrm_user_session');
        if (savedSession && mounted) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.id) {
              setUser(parsed);
              setIsDemoMode(false);
              await loadProfileAndRoster(parsed.id, parsed.email);
              return;
            }
          } catch {}
        }
      } catch (err) {
        console.error('Supabase session init failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    if (supabaseAuth) {
      const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          window.localStorage.removeItem('resale_desk_demo_mode');
          setIsDemoMode(false);
          await loadProfileAndRoster(session.user.id, session.user.email);
        } else if (!window.localStorage.getItem('omcrm_user_session')) {
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

  const signInWithPassword = async (identifier: string, password: string) => {
    if (!supabaseAuth || !supabaseDb) return { success: false, error: 'Database client not initialized' };

    const trimmed = identifier.trim().toLowerCase();
    const rawDigits = trimmed.replace(/\D/g, '');
    const isPhone =
      rawDigits.length === 10 ||
      (rawDigits.length === 12 && rawDigits.startsWith('91')) ||
      (rawDigits.length === 11 && rawDigits.startsWith('0'));
    const phone10 = isPhone ? rawDigits.slice(-10) : '';

    const isMasterLogin =
      (trimmed === 'saraswatinagri@gmail.com' || phone10 === '8956040220' || trimmed === 'saraswatinagri') &&
      password === 'SaraswatiNagri123#';

    // 1. Strict Employee Verification against public.profiles
    let matchedProfile: any = null;
    try {
      let query = supabaseDb.from('profiles').select('id, email, phone, full_name, role, is_active, department');
      if (isPhone) {
        query = query.or(`phone.ilike.%${phone10}%,email.ilike.%${phone10}%`);
      } else {
        query = query.eq('email', trimmed);
      }
      const { data: matched } = await query.maybeSingle();
      matchedProfile = matched;
    } catch (e) {
      console.warn('Employee verification lookup warning:', e);
    }

    // If master admin credentials used, allow access
    if (isMasterLogin) {
      setUser(DEFAULT_ADMIN_USER);
      setIsDemoMode(false);
      window.localStorage.setItem('omcrm_user_session', JSON.stringify(DEFAULT_ADMIN_USER));
      await loadProfileAndRoster(DEFAULT_ADMIN_USER.id, DEFAULT_ADMIN_USER.email);
      return { success: true };
    }

    // 2. Enforce: ONLY verified Saraswati Nagri company employees can login
    if (!matchedProfile) {
      return {
        success: false,
        error: 'Access restricted: Only verified Saraswati Nagri company employees can access Resale Desk CRM.'
      };
    }

    if (matchedProfile.is_active === false) {
      return {
        success: false,
        error: 'Employee account is inactive. Please contact Saraswati Nagri office administration.'
      };
    }

    const roleName = String(matchedProfile.role || '').toLowerCase();
    if (!EMPLOYEE_ROLES.has(roleName)) {
      return {
        success: false,
        error: `Access restricted: Role "${matchedProfile.role}" cannot access internal Resale Desk CRM. Only company staff & sales executives are authorized.`
      };
    }

    const authEmail = matchedProfile.email || trimmed;

    // Direct Supabase sign in via auth client
    let { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    // If initial attempt failed and was phone, retry with +91 phone credential
    if (error && isPhone) {
      const phoneAttempt = await supabaseAuth.auth.signInWithPassword({
        phone: `+91${phone10}`,
        password,
      } as any);
      if (!phoneAttempt.error && phoneAttempt.data) {
        data = phoneAttempt.data;
        error = null;
      }
    }

    if (error || !data?.user) {
      return { success: false, error: error?.message || 'Invalid password for employee account.' };
    }

    setIsDemoMode(false);
    window.localStorage.removeItem('resale_desk_demo_mode');
    await loadProfileAndRoster(data.user.id, data.user.email);
    return { success: true };
  };

  const enterDemoMode = () => {
    setIsDemoMode(false);
    setUser(DEFAULT_ADMIN_USER);
    window.localStorage.setItem('omcrm_user_session', JSON.stringify(DEFAULT_ADMIN_USER));
  };

  const signOut = async () => {
    window.localStorage.removeItem('resale_desk_demo_mode');
    window.localStorage.removeItem('omcrm_user_session');
    setIsDemoMode(false);
    if (supabaseAuth) {
      await supabaseAuth.auth.signOut().catch(() => {});
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        isLoading,
        isLiveSupabase: Boolean(isSupabaseConfigured && supabaseDb),
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
