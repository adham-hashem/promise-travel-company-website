import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Permissions, UserRole } from '../lib/permissions';
import { getDefaultPermissions, getDefaultPagePermissions } from '../lib/permissions';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: string;
  permissions: Permissions;
  page_permissions?: Record<string, boolean>;
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  can: (permission: keyof Permissions) => boolean;
  canAccessPage: (pageKey: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, userObj?: User | null): Promise<boolean> => {
    let { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!data && userObj) {
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true });

      if ((count || 0) > 0) {
        setProfile(null);
        return false;
      }

      const fallbackProfile = {
        id: userId,
        name: userObj.user_metadata?.name || userObj.email?.split('@')[0] || 'المدير العام',
        email: userObj.email || '',
        role: 'super_admin' as UserRole,
        status: 'نشط',
        permissions: {},
        page_permissions: {},
        created_at: new Date().toISOString()
      };

      const { data: created } = await supabase
        .from('user_profiles')
        .upsert(fallbackProfile)
        .select('*')
        .maybeSingle();

      data = created || fallbackProfile;
    }

    if (data) {
      if (data.status !== 'نشط') {
        setProfile(null);
        return false;
      }
      setProfile(data as UserProfile);
      return true;
    }

    setProfile(null);
    return false;
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user).then((active) => {
          if (!active) supabase.auth.signOut();
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const active = await loadProfile(session.user.id, session.user);
          if (!active) await supabase.auth.signOut();
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message;
    if (data.user) {
      const active = await loadProfile(data.user.id, data.user);
      if (!active) {
        await supabase.auth.signOut();
        return 'هذا الحساب غير نشط أو تم حذفه من النظام';
      }
    }
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const can = (permission: keyof Permissions): boolean => {
    if (!profile) return false;
    if (profile.status !== 'نشط') return false;
    if (profile.role === 'super_admin' || profile.role === 'مالك النظام') return true;
    const perms = profile.permissions && Object.keys(profile.permissions).length > 0
      ? profile.permissions
      : getDefaultPermissions(profile.role);
    return perms[permission] === true;
  };

  const canAccessPage = (pageKey: string): boolean => {
    if (!profile) return false;
    if (profile.status !== 'نشط') return false;
    if (profile.role === 'super_admin' || profile.role === 'مالك النظام') return true;

    // Default fallbacks by role
    const defaults = getDefaultPagePermissions(profile.role);

    // Check custom page_permissions if set — but fall back to defaults for missing keys
    if (profile.page_permissions && Object.keys(profile.page_permissions).length > 0) {
      const custom = profile.page_permissions[pageKey];
      if (custom !== undefined) return custom === true;
      // Key not in custom permissions → fall back to role defaults
      return defaults[pageKey] === true;
    }

    return defaults[pageKey] === true;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, can, canAccessPage, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
