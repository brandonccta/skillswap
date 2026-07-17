import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
  SkillCategory,
} from '../theme';
import Button from './Button';
import CategoryIconMark from './CategoryIconMark';

interface Props {
  title: string;
  subtitle?: string;
  /** Renders the geometric category icon inside the placeholder bubble. */
  category?: SkillCategory;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({
  title,
  subtitle,
  category = 'Other',
  ctaLabel,
  onCta,
}: Props) {
  return (
    <View style={styles.container}>
      <CategoryIconMark category={category} size={64} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!ctaLabel && !!onCta && (
        <Button
          label={ctaLabel}
          onPress={onCta}
          variant="primary"
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderStyle: 'dashed',
    borderRadius: Radii.xxl,
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.base,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: Math.round(FontSize.base * 1.5),
  },
  cta: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing['2xl'],
    height: 44,
  },
});
