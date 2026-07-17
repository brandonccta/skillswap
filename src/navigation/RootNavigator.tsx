import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';

export default function RootNavigator() {
  const { session, loading, setSession } = useAuthStore();

  useEffect(() => {
    // Read persisted session on mount, then validate it server-side.
    // getSession() only reads from localStorage — getUser() actually hits the
    // network, so it catches cases where the account was deleted but the token
    // is still cached locally.
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!error && data.session) {
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          // Token is stale / user deleted — wipe local storage and go to login
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(data.session);
        }
      } else {
        setSession(null);
      }
    });

    // Listen for subsequent auth changes (sign in, sign out, token refresh).
    // INITIAL_SESSION is intentionally ignored — the getSession()+getUser()
    // block above handles the startup validation and controls loading state.
    // Letting INITIAL_SESSION through would set loading:false before getUser()
    // finishes and bypass the blank-screen guard.
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        setSession(session);
      }
    );
    const subscription = data?.subscription;

    return () => subscription?.unsubscribe();
  }, [setSession]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return session ? <AppTabs /> : <AuthStack />;
}
