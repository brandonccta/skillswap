import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signIn: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  register: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  setSession: (session) => set({ session, loading: false }),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const isInvalidCreds =
        error.message.toLowerCase().includes('invalid') ||
        error.message.toLowerCase().includes('credentials') ||
        error.message.toLowerCase().includes('password');
      return {
        status: isInvalidCreds ? 'invalid_credentials' : 'error',
        message: error.message,
      };
    }
    return { status: 'success' };
  },

  register: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const isDuplicate =
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('user already');
      return {
        status: isDuplicate ? 'exists' : 'error',
        message: error.message,
      };
    }
    return { status: 'success' };
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      set({ session: null });
    }
  },
}));
