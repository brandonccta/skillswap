/**
 * CategoryIconMark
 *
 * Renders the geometric mark for each skill category using plain View
 * elements — no SVG dependency required. Each mark is a circular
 * container (tint bg) with two overlapping shapes (circle + rotated
 * square, or two circles, etc.) matching the SkillSwap Visual System.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CategoryStyles, SkillCategory } from '../theme';

interface Props {
  category: SkillCategory;
  /** Outer circle diameter in pts. Inner shapes scale proportionally. Default 52. */
  size?: number;
}

export default function CategoryIconMark({ category, size = 52 }: Props) {
  const s = size / 52; // scale factor relative to base 52pt design
  const style = CategoryStyles[category] ?? CategoryStyles.Other;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: style.tint,
        },
      ]}
    >
      {renderInner(category, s, style.icon)}
    </View>
  );
}

function renderInner(category: SkillCategory, s: number, color: string) {
  switch (category) {
    case 'Music':
      // Circle top-left + rotated square bottom-right
      return (
        <>
          <View
            style={[
              styles.circle,
              {
                width: 20 * s,
                height: 20 * s,
                borderRadius: 10 * s,
                backgroundColor: color,
                top: 6 * s,
                left: 6 * s,
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              {
                width: 16 * s,
                height: 16 * s,
                borderRadius: 4 * s,
                backgroundColor: color,
                bottom: 6 * s,
                right: 6 * s,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        </>
      );

    case 'Language':
      // Two overlapping circles
      return (
        <>
          <View
            style={[
              styles.circle,
              {
                width: 24 * s,
                height: 24 * s,
                borderRadius: 12 * s,
                backgroundColor: color,
                top: 6 * s,
                left: 5 * s,
                opacity: 0.85,
              },
            ]}
          />
          <View
            style={[
              styles.circle,
              {
                width: 24 * s,
                height: 24 * s,
                borderRadius: 12 * s,
                backgroundColor: color,
                bottom: 6 * s,
                right: 5 * s,
                opacity: 0.55,
              },
            ]}
          />
        </>
      );

    case 'Cooking':
      // Large circle top-center + smaller circle bottom-left
      return (
        <>
          <View
            style={[
              styles.circle,
              {
                width: 22 * s,
                height: 22 * s,
                borderRadius: 11 * s,
                backgroundColor: color,
                top: 8 * s,
                left: 15 * s,
              },
            ]}
          />
          <View
            style={[
              styles.circle,
              {
                width: 16 * s,
                height: 16 * s,
                borderRadius: 8 * s,
                backgroundColor: color,
                bottom: 10 * s,
                left: 8 * s,
              },
            ]}
          />
        </>
      );

    case 'Coding':
      // Two rotated squares
      return (
        <>
          <View
            style={[
              styles.shape,
              {
                width: 15 * s,
                height: 15 * s,
                borderRadius: 3 * s,
                backgroundColor: color,
                top: 10 * s,
                left: 9 * s,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              {
                width: 15 * s,
                height: 15 * s,
                borderRadius: 3 * s,
                backgroundColor: color,
                bottom: 10 * s,
                right: 9 * s,
                opacity: 0.6,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        </>
      );

    case 'Craft':
      // Circle top-center + rotated square bottom-left
      return (
        <>
          <View
            style={[
              styles.circle,
              {
                width: 20 * s,
                height: 20 * s,
                borderRadius: 10 * s,
                backgroundColor: color,
                top: 6 * s,
                left: 11 * s,
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              {
                width: 14 * s,
                height: 14 * s,
                borderRadius: 3 * s,
                backgroundColor: color,
                bottom: 8 * s,
                left: 8 * s,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        </>
      );

    case 'Fitness':
      // Rotated square top-right + circle bottom-left
      return (
        <>
          <View
            style={[
              styles.shape,
              {
                width: 16 * s,
                height: 16 * s,
                borderRadius: 3 * s,
                backgroundColor: color,
                top: 8 * s,
                right: 10 * s,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.circle,
              {
                width: 20 * s,
                height: 20 * s,
                borderRadius: 10 * s,
                backgroundColor: color,
                bottom: 6 * s,
                left: 9 * s,
                opacity: 0.7,
              },
            ]}
          />
        </>
      );

    default:
      // Other — two sage circles
      return (
        <>
          <View
            style={[
              styles.circle,
              {
                width: 20 * s,
                height: 20 * s,
                borderRadius: 10 * s,
                backgroundColor: color,
                top: 8 * s,
                left: 8 * s,
                opacity: 0.75,
              },
            ]}
          />
          <View
            style={[
              styles.circle,
              {
                width: 16 * s,
                height: 16 * s,
                borderRadius: 8 * s,
                backgroundColor: color,
                bottom: 8 * s,
                right: 8 * s,
                opacity: 0.45,
              },
            ]}
          />
        </>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
  },
  shape: {
    position: 'absolute',
  },
});
