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

  const loadProfile = async (userId: string, userObj?: User | null) => {
    let { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!data && userObj) {
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
      setProfile(data as UserProfile);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id, session.user);
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
    if (data.user) await loadProfile(data.user.id, data.user);
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const can = (permission: keyof Permissions): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'مالك النظام') return true;
    const perms = profile.permissions && Object.keys(profile.permissions).length > 0
      ? profile.permissions
      : getDefaultPermissions(profile.role);
    return perms[permission] === true;
  };

  const canAccessPage = (pageKey: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'مالك النظام') return true;
    
    // Check custom page_permissions if set
    if (profile.page_permissions && Object.keys(profile.page_permissions).length > 0) {
      return profile.page_permissions[pageKey] === true;
    }

    // Default fallbacks by role
    const defaults = getDefaultPagePermissions(profile.role);
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
