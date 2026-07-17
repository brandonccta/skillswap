import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useTradeStore } from '../../store/tradeStore';
import { getTradeById, acceptTrade, declineTrade } from '../../services/tradeService';
import { confirmTrade, hasUserConfirmedTrade } from '../../services/confirmService';
import { submitReview } from '../../services/reviewService';
import { getSkillById } from '../../services/skillService';
import { getProfiles } from '../../services/profileService';
import { Trade, Skill, Profile } from '../../types';
import RatingStars from '../../components/RatingStars';
import Button from '../../components/Button';
import { TradesStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
} from '../../theme';

type Nav = StackNavigationProp<TradesStackParamList, 'TradeDetail'>;
type Route = RouteProp<TradesStackParamList, 'TradeDetail'>;

type TradeStatus = Trade['status'];

interface StatusStyle {
  bg: string;
  text: string;
  border?: string;
}

function getStatusStyle(status: TradeStatus): StatusStyle {
  switch (status) {
    case 'pending':
      return { bg: Colors.mustardTint, text: Colors.mustardDark };
    case 'accepted':
    case 'in_progress':
      return { bg: Colors.sageTint, text: Colors.sageDark };
    case 'awaiting_confirmation':
    case 'declined':
      return { bg: Colors.terracottaTint, text: Colors.terracottaDark };
    case 'completed':
    default:
      return { bg: Colors.line, text: Colors.inkSoft };
  }
}

export default function TradeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { session } = useAuthStore();
  const { updateTrade } = useTradeStore();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [offeredSkill, setOfferedSkill] = useState<Skill | null>(null);
  const [desiredSkill, setDesiredSkill] = useState<Skill | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Review form state
  const [showReview, setShowReview] = useState(false);
  const [overallRating, setOverallRating] = useState(5);
  const [accuracyRating, setAccuracyRating] = useState(5);
  const [comment, setComment] = useState('');

  const userId = session?.user.id ?? '';

  const load = useCallback(async () => {
    const result = await getTradeById(params.tradeId);
    if (result.status === 'success' && result.data) {
      const t = result.data;
      setTrade(t);
      const [offered, desired, profileMap, confirmed] = await Promise.all([
        getSkillById(t.offered_skill_id),
        getSkillById(t.desired_skill_id),
        getProfiles([t.requester_id, t.target_user_id]),
        userId ? hasUserConfirmedTrade(t.trade_id, userId) : Promise.resolve(false),
      ]);
      if (offered.status === 'success') setOfferedSkill(offered.data!);
      if (desired.status === 'success') setDesiredSkill(desired.data!);
      setProfiles(profileMap);
      setHasConfirmed(confirmed);
    }
    setLoading(false);
  }, [params.tradeId, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAccept() {
    if (!trade) return;
    setActionLoading(true);
    setError('');
    const result = await acceptTrade(trade.trade_id, userId);
    setActionLoading(false);
    if (result.status === 'success') {
      updateTrade(trade.trade_id, { status: 'in_progress' });
      setTrade((t) => t ? { ...t, status: 'in_progress' } : t);
    } else {
      setError('missing' in result ? result.missing.join(', ') : (result.message ?? 'Error'));
    }
  }

  async function handleDecline() {
    if (!trade) return;
    Alert.alert('Decline Trade', 'Are you sure you want to decline this trade?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          setError('');
          const result = await declineTrade(trade.trade_id, userId);
          setActionLoading(false);
          if (result.status === 'success') {
            updateTrade(trade.trade_id, { status: 'declined' });
            setTrade((t) => t ? { ...t, status: 'declined' } : t);
            navigation.goBack();
          } else {
            setError('missing' in result ? result.missing.join(', ') : (result.message ?? 'Error'));
          }
        },
      },
    ]);
  }

  async function handleConfirm() {
    if (!trade) return;
    setActionLoading(true);
    setError('');
    const result = await confirmTrade({ tradeId: trade.trade_id, userId });
    setActionLoading(false);
    if (result.status === 'success' && result.data) {
      const newStatus = result.data.newStatus as Trade['status'];
      updateTrade(trade.trade_id, { status: newStatus });
      setTrade((t) => t ? { ...t, status: newStatus } : t);
      setHasConfirmed(true);
    } else {
      setError('missing' in result ? result.missing.join(', ') : (result.message ?? 'Error'));
    }
  }

  async function handleReview() {
    if (!trade) return;
    const reviewedUserId =
      trade.requester_id === userId ? trade.target_user_id : trade.requester_id;
    setActionLoading(true);
    setError('');
    const result = await submitReview({
      reviewerId: userId,
      reviewedUserId,
      tradeId: trade.trade_id,
      overallRating,
      skillAccuracyRating: accuracyRating,
      comment,
    });
    setActionLoading(false);
    if (result.status === 'success') {
      Alert.alert('Review submitted', 'Thank you for your feedback!');
      setShowReview(false);
    } else {
      setError('missing' in result ? result.missing.join(', ') : (result.message ?? 'Error'));
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  if (!trade) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Trade not found.</Text>
      </View>
    );
  }

  const isRequester = trade.requester_id === userId;
  const isTarget = trade.target_user_id === userId;
  const statusStyle = getStatusStyle(trade.status);
  const isActiveForConfirm = ['in_progress', 'awaiting_confirmation'].includes(trade.status);
  const isMatchNotification = trade.status === 'awaiting_confirmation';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {!!error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Trade info card */}
      <View style={styles.tradeCard}>
        {/* Offered Skill chip + info */}
        <View style={styles.skillRow}>
          <View style={styles.offersChip}>
            <Text style={styles.offersChipText}>Offers</Text>
          </View>
          <View style={styles.skillInfo}>
            <Text style={styles.skillName}>
              {offeredSkill?.skill_name ?? trade.offered_skill_id}
            </Text>
            <Text style={styles.meta}>
              by{' '}
              {isRequester
                ? 'You'
                : profiles[trade.requester_id]?.display_name ||
                  `User ${trade.requester_id.slice(0, 8)}`}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Desired Skill chip + info */}
        <View style={styles.skillRow}>
          <View style={styles.wantsChip}>
            <Text style={styles.wantsChipText}>Wants</Text>
          </View>
          <View style={styles.skillInfo}>
            <Text style={styles.skillName}>
              {desiredSkill?.skill_name ?? trade.desired_skill_id}
            </Text>
            <Text style={styles.meta}>
              by{' '}
              {isTarget
                ? 'You'
                : profiles[trade.target_user_id]?.display_name ||
                  `User ${trade.target_user_id.slice(0, 8)}`}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Status badge */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {trade.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Match / awaiting confirmation notification card */}
      {isMatchNotification && (
        <View style={styles.matchCard}>
          <Text style={styles.matchCardText}>
            Waiting for the other party to confirm completion.
          </Text>
        </View>
      )}

      {/* Target user actions for pending trade */}
      {isTarget && trade.status === 'pending' && (
        <View style={styles.actionsRow}>
          <Button
            label="Accept"
            onPress={handleAccept}
            variant="primary"
            loading={actionLoading}
            style={styles.actionButtonFlex}
          />
          <Button
            label="Decline"
            onPress={handleDecline}
            variant="secondary"
            loading={actionLoading}
            style={styles.actionButtonFlex}
          />
        </View>
      )}

      {/* Message button for active trades */}
      {isActiveForConfirm && (
        <Button
          label="View Messages"
          onPress={() => navigation.navigate('MessageThread', { tradeId: trade.trade_id })}
          variant="text"
          style={styles.messageButton}
        />
      )}

      {/* Confirm completion — hidden once the current user has already confirmed */}
      {!hasConfirmed && isActiveForConfirm && (
        <Button
          label="Mark as Complete"
          onPress={handleConfirm}
          variant="primary"
          loading={actionLoading}
        />
      )}

      {/* Review entry point for completed trades */}
      {trade.status === 'completed' && !showReview && (
        <Button
          label="Leave a Review"
          onPress={() => setShowReview(true)}
          variant="primary"
        />
      )}

      {/* Review form */}
      {showReview && (
        <View style={styles.reviewForm}>
          <Text style={styles.reviewTitle}>Leave a Review</Text>

          <Text style={styles.reviewLabel}>Overall Rating</Text>
          <RatingStars value={overallRating} onChange={setOverallRating} size={28} />

          <Text style={styles.reviewLabel}>Skill Accuracy</Text>
          <RatingStars value={accuracyRating} onChange={setAccuracyRating} size={28} />

          <Text style={styles.reviewLabel}>Comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience..."
            placeholderTextColor={Colors.inkFaint}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />

          <Button
            label="Submit Review"
            onPress={handleReview}
            variant="primary"
            loading={actionLoading}
          />

          <Button
            label="Cancel"
            onPress={() => setShowReview(false)}
            variant="text"
            style={styles.cancelButton}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing.xxl,
    gap: Spacing.md,
    paddingBottom: Spacing['5xl'],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
  notFound: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkFaint,
  },

  // Error card
  errorCard: {
    backgroundColor: Colors.terracottaTint,
    borderRadius: Radii.xs,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.terracottaDark,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracottaDark,
  },

  // Trade info card
  tradeCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.xxl,
    gap: Spacing.md,
    ...Shadows.card,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    marginBottom: Spacing.xxs,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkSoft,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.line,
  },

  // Skill chips
  offersChip: {
    backgroundColor: Colors.sageTint,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  offersChipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.sageDark,
  },
  wantsChip: {
    backgroundColor: Colors.terracottaTint,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.terracottaDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  wantsChipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.terracottaDark,
  },

  // Status row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
  },
  statusBadge: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },

  // Match notification card
  matchCard: {
    backgroundColor: 'rgba(228,99,58,0.1)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(228,99,58,0.4)',
    borderStyle: 'dashed',
    padding: Spacing.lg,
  },
  matchCardText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracottaDark,
    textAlign: 'center',
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButtonFlex: {
    flex: 1,
  },
  messageButton: {
    alignSelf: 'center',
  },

  // Review form
  reviewForm: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.xxl,
    gap: Spacing.md,
    ...Shadows.card,
  },
  reviewTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  reviewLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  commentInput: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radii.s,
    padding: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    alignSelf: 'center',
  },
});
