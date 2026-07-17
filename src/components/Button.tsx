import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, FontFamily, FontSize, FontWeight, Radii, Shadows, Spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'text' | 'disabled';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  style,
  labelStyle,
}: Props) {
  const isDisabled = variant === 'disabled' || loading;

  const containerStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'text' && styles.textBtn,
    variant === 'disabled' && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.label,
    variant === 'primary' && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'text' && styles.labelText,
    variant === 'disabled' && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.white : Colors.terracotta}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  // Primary — terracotta fill
  primary: {
    backgroundColor: Colors.terracotta,
    ...Shadows.buttonPrimary,
  },
  // Secondary — sage outline
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.sage,
  },
  // Text / link — no bg, underline accent
  textBtn: {
    minHeight: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: Colors.terracotta,
    borderRadius: 0,
  },
  // Disabled — muted fill
  disabled: {
    backgroundColor: 'rgba(46,38,32,0.08)',
  },

  // Labels
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  labelPrimary: {
    color: Colors.white,
  },
  labelSecondary: {
    color: Colors.sageDark,
  },
  labelText: {
    color: Colors.terracotta,
  },
  labelDisabled: {
    color: 'rgba(46,38,32,0.35)',
  },
});
