import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AuthStack';
import Button from '../../components/Button';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
  TextStyles,
} from '../../theme';

type Nav = StackNavigationProp<AuthStackParamList, 'Welcome'>;

/** View-based approximation of the two-tone SkillSwap logo mark. */
function LogoMark() {
  return (
    <View style={logoStyles.container}>
      {/* Terracotta circle — left/teach side */}
      <View style={[logoStyles.circle, logoStyles.terracottaCircle]} />
      {/* Sage circle — right/learn side, overlapping */}
      <View style={[logoStyles.circle, logoStyles.sageCircle]} />
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 18,
    position: 'relative',
    marginRight: Spacing.xs,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: 1,
  },
  terracottaCircle: {
    backgroundColor: Colors.terracotta,
    left: 0,
  },
  sageCircle: {
    backgroundColor: Colors.sage,
    left: 10,
  },
});

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  async function handleGoogleSignIn() {
    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return;
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
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top: logo bar ── */}
        <View style={styles.logoBar}>
          <LogoMark />
          <Text style={styles.wordmark}>SkillSwap</Text>
        </View>

        {/* ── Center: hero ── */}
        <View style={styles.heroSection}>
          {/* 104px mustard-tinted circle with swap icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.swapIcon}>⇄</Text>
          </View>

          <Text style={styles.heroHeading}>Trade skills,{'\n'}not dollars.</Text>
          <Text style={styles.heroSubtext}>
            Teach what you know. Learn what you love.{'\n'}No money needed.
          </Text>
        </View>

        {/* ── Bottom: inputs + CTA ── */}
        <View style={styles.bottomSection}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.inkFaint}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            placeholder="Email address"
            placeholderTextColor={Colors.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.ctaSpacing}>
            <Button
              label="Get started"
              onPress={() => navigation.navigate('Register')}
              variant="primary"
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>Already swapping? Log in</Text>
          </TouchableOpacity>

          {/* Pagination dots */}
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing['4xl'],
  },

  // ── Logo bar ──
  logoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['5xl'],
  },
  wordmark: {
    ...TextStyles.logoWordmark,
  },

  // ── Hero ──
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.mustardTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },
  swapIcon: {
    fontSize: 72,
    color: Colors.mustard,
    lineHeight: 80,
  },
  heroHeading: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: Math.round(FontSize.h1 * 1.15),
    marginBottom: Spacing.lg,
  },
  heroSubtext: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: Math.round(FontSize.md * 1.55),
  },

  // ── Bottom section ──
  bottomSection: {
    gap: 0,
  },
  input: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    height: 52,
    paddingHorizontal: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  inputSpaced: {
    marginTop: Spacing.md,
  },
  ctaSpacing: {
    marginTop: Spacing['2xl'],
  },
  loginLink: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  loginLinkText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.sage,
  },

  // ── Pagination dots ──
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing['2xl'],
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.terracotta,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(46,38,32,0.15)',
  },
});
