import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthStack';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Shadows,
  Spacing,
  TextStyles,
} from '../../theme';
import Button from '../../components/Button';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.status === 'invalid_credentials') {
      setError('Wrong email or password.');
    } else if (result.status !== 'success') {
      setError(result.message ?? 'Sign in failed. Please try again.');
    }
    // On success, RootNavigator detects the new session automatically
  }

  async function handleGoogleSignIn() {
    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (oauthError || !data.url) {
      setError('Could not start Google sign-in.');
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      const parsed = new URL(result.url.replace('#', '?'));
      const access_token = parsed.searchParams.get('access_token');
      const refresh_token = parsed.searchParams.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        {/* Header wordmark */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>SkillSwap</Text>
        </View>

        {/* Back nav */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Form heading */}
        <Text style={styles.title}>Welcome back</Text>

        {/* Error banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <ActivityIndicator style={{ display: 'none' }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.inkFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={Colors.inkFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Primary CTA */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.terracotta} size="small" />
          </View>
        ) : (
          <Button
            label="Log in"
            onPress={handleSignIn}
            variant="primary"
            style={styles.loginBtn}
          />
        )}

        {/* Google sign-in */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Sign-up link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.signUpRow}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkTextBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  wordmark: {
    ...TextStyles.logoWordmark,
    fontSize: FontSize.xl,
  },

  // Back
  back: {
    marginBottom: Spacing.xs,
  },
  backText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.sage,
  },

  // Form heading
  title: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    marginBottom: Spacing.xs,
  },

  // Error
  errorBanner: {
    backgroundColor: Colors.terracottaTint,
    borderRadius: Radii.s,
    padding: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracottaDark,
  },

  // Field group
  fieldGroup: {
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    color: Colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
  },
  input: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    height: 48,
    paddingHorizontal: Spacing.base,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },

  // Login button
  loginBtn: {
    marginTop: Spacing.xs,
  },

  // Loading
  loadingRow: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },

  // Google button
  googleBtn: {
    height: 52,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.paper,
  },
  googleBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.inkSoft,
  },

  // Sign-up link
  signUpRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  linkText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
    textAlign: 'center',
  },
  linkTextBold: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.sage,
  },
});
