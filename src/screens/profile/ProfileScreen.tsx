import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { getUserSkills } from '../../services/skillService';
import { getReviewsForUser } from '../../services/reviewService';
import { getProfile, upsertProfile } from '../../services/profileService';
import CategoryIconMark from '../../components/CategoryIconMark';
import RatingStars from '../../components/RatingStars';
import Button from '../../components/Button';
import { Skill } from '../../types';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
  SkillCategory,
  CategoryStyles,
} from '../../theme';

type Tab = 'offering' | 'wanting';

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';

  const [skills, setSkills] = useState<Skill[]>([]);
  const [reviews, setReviews] = useState<
    { overall_rating: number; comment: string; review_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('offering');

  useEffect(() => {
    async function load() {
      const [s, r, p] = await Promise.all([
        getUserSkills(userId),
        getReviewsForUser(userId),
        getProfile(userId),
      ]);
      setSkills(s);
      setReviews(
        r as { overall_rating: number; comment: string; review_id: string }[],
      );
      setDisplayName(p?.display_name ?? '');
      setBio(p?.bio ?? '');
      setLoading(false);
    }
    if (userId) load();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    const { error } = await upsertProfile(userId, {
      display_name: displayName.trim(),
      bio: bio.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setEditMode(false);
    }
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
      : 0;

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const offeringSkills = skills.filter((s) => !s.is_seeking);
  const wantingSkills = skills.filter((s) => s.is_seeking);
  const tabSkills = activeTab === 'offering' ? offeringSkills : wantingSkills;

  const joinYear = session?.user.created_at
    ? new Date(session.user.created_at).getFullYear()
    : '—';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header band ── */}
        <View style={styles.headerBand}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {editMode ? (
            <View style={styles.editBlock}>
              <TextInput
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor={Colors.inkFaint}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={40}
              />
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Bio (optional)"
                placeholderTextColor={Colors.inkFaint}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditMode(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.displayName}>
                {displayName || 'No display name set'}
              </Text>
              {!!bio && <Text style={styles.bio}>{bio}</Text>}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{skills.length}</Text>
                  <Text style={styles.statLabel}>Trades</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {reviews.length > 0 ? avgRating.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{joinYear}</Text>
                  <Text style={styles.statLabel}>Since</Text>
                </View>
              </View>

              {reviews.length > 0 && (
                <View style={styles.ratingRow}>
                  <RatingStars value={Math.round(avgRating)} size={18} />
                  <Text style={styles.ratingCount}>
                    {' '}
                    ({reviews.length} reviews)
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Tab toggle ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('offering')}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'offering' && styles.tabLabelActive,
              ]}
            >
              Offering
            </Text>
            {activeTab === 'offering' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('wanting')}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'wanting' && styles.tabLabelActive,
              ]}
            >
              Wanting
            </Text>
            {activeTab === 'wanting' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        {/* ── Skill list ── */}
        {tabSkills.length === 0 ? (
          <Text style={styles.empty}>
            {activeTab === 'offering'
              ? 'No skills to offer yet. Go to My Skills tab to add one.'
              : 'No skills wanted yet.'}
          </Text>
        ) : (
          tabSkills.map((s) => <SkillListItem key={s.skill_id} skill={s} />)
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Reviews Received</Text>
            {reviews.map((r) => (
              <View key={r.review_id} style={styles.reviewCard}>
                <RatingStars value={r.overall_rating} size={16} />
                {!!r.comment && (
                  <Text style={styles.reviewComment}>{r.comment}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Sign out ── */}
        <View style={styles.signOutWrapper}>
          <Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
          />
        </View>
      </ScrollView>

    </View>
  );
}

// ---------------------------------------------------------------------------
// Inline skill list item — replaces SkillCard for the list view
// ---------------------------------------------------------------------------

function SkillListItem({ skill }: { skill: Skill }) {
  const tags = skill.tags ? skill.tags.split(',').filter(Boolean) : [];
  const rawCategory = tags[0]
    ? ((tags[0].charAt(0).toUpperCase() +
        tags[0].slice(1).toLowerCase()) as SkillCategory)
    : 'Other';
  const category: SkillCategory =
    rawCategory in CategoryStyles ? rawCategory : 'Other';

  // Proficiency dots
  const dots = Array.from({ length: 5 }, (_, i) => i < skill.proficiency);

  return (
    <View style={listStyles.item}>
      <CategoryIconMark category={category} size={38} />
      <View style={listStyles.textBlock}>
        <Text style={listStyles.title} numberOfLines={1}>
          {skill.skill_name}
        </Text>
        {!!skill.portfolio_description && (
          <Text style={listStyles.desc} numberOfLines={1}>
            {skill.portfolio_description}
          </Text>
        )}
        <View style={listStyles.dotsRow}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                listStyles.dot,
                filled ? listStyles.dotFilled : listStyles.dotEmpty,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const listStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xxs,
    gap: Spacing.md,
    ...Shadows.card,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 14.5,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  desc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.inkSoft,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotFilled: {
    backgroundColor: Colors.terracotta,
  },
  dotEmpty: {
    backgroundColor: Colors.line,
  },
});

// ---------------------------------------------------------------------------
// Main screen styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    minHeight: 118,
    backgroundColor: 'rgba(127,163,127,0.22)',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.paper,
    borderWidth: 3,
    borderColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.avatar,
  },
  avatarText: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: 22,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
  },

  // ── Name / bio ────────────────────────────────────────────────────────────
  displayName: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    marginTop: 10,
    textAlign: 'center',
  },
  bio: {
    fontFamily: FontFamily.body,
    fontSize: 12.5,
    color: Colors.inkSoft,
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Stats row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 28,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
  },
  statLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10.5,
    color: Colors.inkFaint,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.line,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  ratingCount: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.inkSoft,
  },

  // ── Edit profile ──────────────────────────────────────────────────────────
  editBtn: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.sage,
    borderRadius: Radii.button,
    paddingVertical: 7,
    paddingHorizontal: Spacing.xl,
  },
  editBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.sageDark,
  },
  editBlock: {
    width: '100%',
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radii.s,
    padding: Spacing.md,
    fontSize: FontSize.md,
    fontFamily: FontFamily.body,
    color: Colors.ink,
    backgroundColor: Colors.cream,
    width: '100%',
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xxs,
  },
  saveBtn: {
    backgroundColor: Colors.terracotta,
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    ...Shadows.buttonPrimary,
  },
  saveBtnText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cancelText: {
    fontFamily: FontFamily.body,
    color: Colors.inkFaint,
    fontSize: FontSize.md,
  },

  // ── Tab toggle ────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  tabLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.inkFaint,
  },
  tabLabelActive: {
    color: Colors.ink,
    fontFamily: FontFamily.bodyBold,
    fontWeight: FontWeight.bold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: Colors.terracotta,
    borderRadius: 1,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    fontFamily: FontFamily.body,
    color: Colors.inkFaint,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.lg,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxs,
  },

  // ── Review card ───────────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.base,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xxs,
  },
  reviewComment: {
    fontFamily: FontFamily.body,
    color: Colors.ink,
    fontSize: FontSize.md,
    marginTop: Spacing.xxs,
  },

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOutWrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
  },

});
