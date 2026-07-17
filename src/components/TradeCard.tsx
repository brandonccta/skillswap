import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trade, TradeStatus } from '../types';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
} from '../theme';

interface Props {
  trade: Trade;
  currentUserId: string;
  onPress?: () => void;
}

// Status badge palette — mapped to warm design system tones
const STATUS_COLORS: Record<TradeStatus, { bg: string; text: string }> = {
  pending:               { bg: Colors.mustardTint,    text: Colors.mustardDark },
  accepted:              { bg: Colors.sageTint,       text: Colors.sageDark },
  in_progress:           { bg: Colors.sageTint,       text: Colors.sageDark },
  awaiting_confirmation: { bg: Colors.terracottaTint, text: Colors.terracottaDark },
  completed:             { bg: 'rgba(46,38,32,0.08)', text: Colors.inkSoft },
  declined:              { bg: Colors.terracottaTint, text: Colors.terracottaDark },
};

const STATUS_LABELS: Record<TradeStatus, string> = {
  pending:               'Pending',
  accepted:              'Accepted',
  in_progress:           'In Progress',
  awaiting_confirmation: 'Awaiting Confirmation',
  completed:             'Completed',
  declined:              'Declined',
};

export default function TradeCard({ trade, currentUserId, onPress }: Props) {
  const isRequester = trade.requester_id === currentUserId;
  const role = isRequester ? 'You offered' : 'Incoming offer';
  const colors = STATUS_COLORS[trade.status];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.88}
    >
      <View style={styles.header}>
        <Text style={styles.role}>{role}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {STATUS_LABELS[trade.status]}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.date}>
        {new Date(trade.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  role: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    borderRadius: Radii.xs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
  },
  badgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.line,
    marginBottom: Spacing.sm,
  },
  date: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkFaint,
  },
});
