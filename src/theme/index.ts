/**
 * SkillSwap Design Tokens
 *
 * Translated from the SkillSwap Visual System (HTML/CSS) into
 * React Native-compatible values. No CSS — only plain JS constants.
 *
 * Font loading: Bitter (serif headings) and Karla (sans body) must be
 * loaded via expo-font before these family names resolve.
 * Add `@expo-google-fonts/bitter` and `@expo-google-fonts/karla` to
 * package.json and call `useFonts(...)` in App.tsx (handled in Step 3).
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const Colors = {
  // Core brand palette
  terracotta: '#E4633A',   // primary action — buttons, active states
  sage: '#7FA37F',          // secondary/teaching — outline buttons, category tints
  mustard: '#E8B33D',       // accent/add — FAB, send button, mustard CTAs
  cream: '#FBF3E7',         // screen background
  paper: '#F5E7D2',         // card / input background
  ink: '#2E2620',           // primary text

  // Ink opacity variants (semi-transparent over cream/paper)
  inkSoft: 'rgba(46,38,32,0.62)',   // secondary text
  inkFaint: 'rgba(46,38,32,0.38)',  // placeholder, tertiary text
  line: 'rgba(46,38,32,0.14)',      // subtle borders and dividers

  // Category tint backgrounds (used behind icon marks and chips)
  terracottaTint: 'rgba(228,99,58,0.14)',   // Music, Coding tint
  sageTint: 'rgba(127,163,127,0.16)',       // Language, Craft tint
  mustardTint: 'rgba(232,179,61,0.22)',     // Cooking, Fitness tint

  // Category active dot/icon fill (base colors re-aliased for clarity)
  musicIcon: '#E4633A',
  languageIcon: '#7FA37F',
  cookingIcon: '#E8B33D',
  codingIcon: '#E4633A',
  craftIcon: '#7FA37F',
  fitnessIcon: '#E8B33D',

  // Darker foreground variants — text on category tint backgrounds
  terracottaDark: '#a3441f',
  sageDark: '#4d6b4d',
  mustardDark: '#8a6413',

  // Message bubbles
  bubbleSelf: '#E4633A',      // sent message background
  bubbleSelfText: '#ffffff',
  bubbleOther: '#F5E7D2',     // received message background (paper)
  bubbleOtherText: '#2E2620',

  white: '#ffffff',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Font family names after expo-font loading.
 * Package names to install:
 *   npx expo install @expo-google-fonts/bitter @expo-google-fonts/karla expo-font
 *
 * Usage in App.tsx:
 *   import { useFonts, Bitter_400Regular, Bitter_700Bold, Bitter_800ExtraBold } from '@expo-google-fonts/bitter';
 *   import { Karla_400Regular, Karla_500Medium, Karla_600SemiBold, Karla_700Bold } from '@expo-google-fonts/karla';
 */
export const FontFamily = {
  heading: 'Bitter_700Bold',
  headingExtraBold: 'Bitter_800ExtraBold',
  headingRegular: 'Bitter_400Regular',
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodySemiBold: 'Karla_600SemiBold',
  bodyBold: 'Karla_700Bold',
} as const;

/** Numeric type scale (sp/pt — device-pixel-aware via RN internals) */
export const FontSize = {
  xxs: 10,    // uppercase micro labels
  xs: 11,     // card meta / sub-labels
  sm: 12,     // chip text, small body
  base: 13,   // body small, message text
  md: 14,     // body default, input text
  lg: 15,     // body large, primary buttons
  xl: 17,     // card titles
  h4: 20,     // section headings
  h3: 21,     // profile name
  h2: 26,     // screen titles (Discover, Trades…)
  h1: 29,     // onboarding hero
  display: 40, // marketing / large hero
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
} as const;

/** Multipliers for lineHeight = fontSize * lineHeightMultiplier */
export const LineHeight = {
  tight: 1.15,
  snug: 1.3,
  base: 1.4,
  relaxed: 1.55,
  loose: 1.6,
} as const;

export const LetterSpacing = {
  label: 0.9,   // uppercase chip/label text (~0.08em at 11px)
  tight: -0.2,  // large serif headings
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

/** 4-pt base grid. Use these values for padding, margin, gap. */
export const Spacing = {
  xxs: 4,
  xs: 6,
  s: 8,
  sm: 10,
  md: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
  '5xl': 48,
  '6xl': 56,
} as const;

// Convenient aliases for the most common values
export const S = Spacing;

// ---------------------------------------------------------------------------
// Border Radii
// ---------------------------------------------------------------------------

export const Radii = {
  xs: 10,     // color swatches
  s: 14,      // input fields
  md: 16,     // chips / category pills
  lg: 18,     // skill list items, small cards
  xl: 20,     // skill cards
  xxl: 22,    // empty states
  '2xl': 24,  // profile header corners
  button: 26, // primary/secondary buttons
  fab: 9999,  // circular FAB
  avatar: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadows / Elevation
// ---------------------------------------------------------------------------

/** Cross-platform shadows. Spread onto StyleSheet objects. */
export const Shadows = {
  /** Skill / trade cards */
  card: {
    shadowColor: '#2E2620',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  /** Primary terracotta button */
  buttonPrimary: {
    shadowColor: '#E4633A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },

  /** Mustard FAB / send button */
  buttonMustard: {
    shadowColor: '#E8B33D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },

  /** Skill category icon marks */
  icon: {
    shadowColor: '#2E2620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },

  /** Avatar rings */
  avatar: {
    shadowColor: '#2E2620',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

// ---------------------------------------------------------------------------
// Composed text styles
// Convenience objects you can spread into StyleSheet.create() entries.
// ---------------------------------------------------------------------------

export const TextStyles = {
  displayHero: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold,
    lineHeight: Math.round(FontSize.display * LineHeight.tight),
    letterSpacing: LetterSpacing.tight,
    color: Colors.ink,
  },
  h1: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.extraBold,
    lineHeight: Math.round(FontSize.h1 * LineHeight.tight),
    letterSpacing: LetterSpacing.tight,
    color: Colors.ink,
  },
  h2: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.extraBold,
    lineHeight: Math.round(FontSize.h2 * LineHeight.tight),
    color: Colors.ink,
  },
  h3: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    lineHeight: Math.round(FontSize.h3 * LineHeight.snug),
    color: Colors.ink,
  },
  cardTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  cardSubtitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
  },
  bodyLarge: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.regular,
    lineHeight: Math.round(FontSize.lg * LineHeight.relaxed),
    color: Colors.ink,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: Math.round(FontSize.md * LineHeight.base),
    color: Colors.ink,
  },
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: Math.round(FontSize.sm * LineHeight.base),
    color: Colors.inkSoft,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase' as const,
    letterSpacing: LetterSpacing.label,
    color: Colors.mustard,
  },
  chipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkFaint,
  },
  buttonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  logoWordmark: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    letterSpacing: LetterSpacing.tight,
    color: Colors.ink,
  },
} as const;

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

export type SkillCategory =
  | 'Music'
  | 'Language'
  | 'Cooking'
  | 'Coding'
  | 'Craft'
  | 'Fitness'
  | 'Other';

export interface CategoryStyle {
  tint: string;
  icon: string;
  textColor: string;
}

export const CategoryStyles: Record<SkillCategory, CategoryStyle> = {
  Music:    { tint: Colors.terracottaTint, icon: Colors.terracotta, textColor: Colors.terracottaDark },
  Coding:   { tint: Colors.terracottaTint, icon: Colors.terracotta, textColor: Colors.terracottaDark },
  Language: { tint: Colors.sageTint,       icon: Colors.sage,       textColor: Colors.sageDark },
  Craft:    { tint: Colors.sageTint,       icon: Colors.sage,       textColor: Colors.sageDark },
  Cooking:  { tint: Colors.mustardTint,    icon: Colors.mustard,    textColor: Colors.mustardDark },
  Fitness:  { tint: Colors.mustardTint,    icon: Colors.mustard,    textColor: Colors.mustardDark },
  Other:    { tint: Colors.sageTint,       icon: Colors.sage,       textColor: Colors.sageDark },
};
