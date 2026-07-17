import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import {
  Bitter_400Regular,
  Bitter_600SemiBold,
  Bitter_700Bold,
  Bitter_800ExtraBold,
} from '@expo-google-fonts/bitter';
import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
} from '@expo-google-fonts/karla';
import { supabase } from './src/lib/supabase';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/theme';

// Deep-link prefix for Google OAuth redirect (skillswap://auth/callback)
const linking = {
  prefixes: [Linking.createURL('/'), 'skillswap://'],
  config: {
    screens: {},
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Bitter_400Regular,
    Bitter_600SemiBold,
    Bitter_700Bold,
    Bitter_800ExtraBold,
    Karla_400Regular,
    Karla_500Medium,
    Karla_600SemiBold,
    Karla_700Bold,
  });

  useEffect(() => {
    // Handle OAuth deep-link redirect — parse tokens from URL fragment
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (!url.includes('access_token')) return;
      const parsed = new URL(url.replace('#', '?'));
      const access_token = parsed.searchParams.get('access_token');
      const refresh_token = parsed.searchParams.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
