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
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthStack';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Spacing,
  Radii,
  Shadows,
  LetterSpacing,
} from '../../theme';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await register(email.trim(), password);
    setLoading(false);

    if (result.status === 'exists') {
      setError('An account with this email already exists.');
    } else if (result.status !== 'success') {
      setError(result.message ?? 'Registration failed. Please try again.');
    }
    // On success, supabase.auth.signUp auto-signs in and onAuthStateChange fires
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Logo / wordmark */}
        <Text style={styles.logo}>SkillSwap</Text>

        {/* Hero heading */}
        <Text style={styles.title}>Create your{'\n'}account</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
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
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 6 characters"
            placeholderTextColor={Colors.inkFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Confirm Password field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor={Colors.inkFaint}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.terracotta} />
          ) : (
            <Text style={styles.primaryBtnText}>Get started</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
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
  back: {
    marginBottom: Spacing.s,
  },
  backText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.sage,
  },
  logo: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    letterSpacing: LetterSpacing.tight,
    color: Colors.ink,
    marginBottom: Spacing.xxs,
  },
  title: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.extraBold,
    letterSpacing: LetterSpacing.tight,
    color: Colors.ink,
    lineHeight: Math.round(FontSize.h1 * 1.15),
    marginBottom: Spacing.s,
  },
  errorBox: {
    backgroundColor: Colors.terracottaTint,
    borderRadius: Radii.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracottaDark,
  },
  fieldGroup: {
    gap: Spacing.xxs,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
    color: Colors.mustard,
  },
  input: {
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderColor: 'rgba(46,38,32,0.22)',
    borderStyle: 'dashed',
    borderRadius: Radii.s,
    height: 48,
    paddingHorizontal: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  primaryBtn: {
    backgroundColor: Colors.terracotta,
    borderRadius: Radii.button,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.s,
    ...Shadows.buttonPrimary,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  linkText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.sage,
    textAlign: 'center',
    marginTop: Spacing.s,
  },
});
