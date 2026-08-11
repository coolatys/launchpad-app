'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  hasCompletedProfile: boolean;
  setHasCompletedProfile: React.Dispatch<React.SetStateAction<boolean>>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null; message?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const ADMIN_EMAILS = ['obaloluwaakerele@email.com', 'seyifunmiakerele@gmail.com'];

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  hasCompletedProfile: false,
  setHasCompletedProfile: () => {},
  signInWithGoogle: async () => {},
  signInWithMagicLink: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signInWithEmail: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  const checkUserProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setHasCompletedProfile(false);
      return;
    }
    try {
      const res = await fetch(`/api/profile?user_id=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile && (data.profile.onboarding_completed || data.profile.cv_master)) {
          setHasCompletedProfile(true);
          return;
        }
      }
    } catch (e) {
      console.error('Profile check error:', e);
    }
    setHasCompletedProfile(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkUserProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkUserProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
      },
    });
  };

  const signInWithMagicLink = async (email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: origin,
      },
    });
    return { error: error ? error.message : null };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || '' },
        emailRedirectTo: `${origin}/onboarding`,
      },
    });
    if (error) return { error: error.message };
    return {
      error: null,
      message: data.user?.identities?.length === 0 ? 'User already exists' : 'Registration successful! Check your email for confirmation link.',
    };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? error.message : null };
  };

  const resetPassword = async (email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login?mode=reset`,
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        hasCompletedProfile,
        setHasCompletedProfile,
        signInWithGoogle,
        signInWithMagicLink,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
