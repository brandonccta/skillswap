/**
 * RatingStars — redesigned as proficiency dot indicators.
 *
 * API is unchanged (value 1-5, onChange?, size?) so all existing
 * call sites continue to work without modification.
 *
 * Visual: 5 small circles filled in terracotta up to `value`, then
 * muted for the remainder — matching the SkillSwap Visual System.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface Props {
  value: number; // 1-5
  onChange?: (val: number) => void;
  /** Dot diameter in pts. Default 7 (matches design). */
  size?: number;
}

export default function RatingStars({ value, onChange, size = 7 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange?.(n)}
          disabled={!onChange}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor:
                  n <= value ? Colors.terracotta : 'rgba(46,38,32,0.15)',
              },
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {},
});
