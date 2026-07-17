import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { getUserSkills } from '../../services/skillService';
import { getReviewsForUser } from '../../services/reviewService';
import { getProfile } from '../../services/profileService';
import { Skill, Profile } from '../../types';
import RatingStars from '../../components/RatingStars';
import Button from '../../components/Button';
import CategoryIconMark from '../../components/CategoryIconMark';
import { ExploreStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
  SkillCategory,
} from '../../theme';

type Nav = StackNavigationProp<ExploreStackParamList, 'UserProfile'>;
type Route = RouteProp<ExploreStackParamList, 'UserProfile'>;

const KNOWN_CATEGORIES: SkillCategory[] = [
  'Music',
  'Language',
  'Cooking',
  'Coding',
  'Craft',
  'Fitness',
];

function deriveCategory(skill: Skill): SkillCategory {
  const firstTag = skill.tags.split(',')[0].trim();
  const match = KNOWN_CATEGORIES.find(
    (c) => c.toLowerCase() === firstTag.toLowerCase()
  );
  return match ?? 'Other';
}

function ProficiencyDots({ value }: { value: number }) {
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= value ? Colors.terracotta : Colors.line },
          ]}
        />
      ))}
    </View>
  );
}

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { session } = useAuthStore();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [reviews, setReviews] = useState<
    { overall_rating: number; comment: string; review_id: string }[]
  >([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'offering' | 'wanting'>(
    'offering'
  );

  useEffect(() => {
    async function load() {
      const [s, r, p] = await Promise.all([
        getUserSkills(params.userId),
        getReviewsForUser(params.userId),
        getProfile(params.userId),
      ]);
      setSkills(s);
      setReviews(
        r as { overall_rating: number; comment: string; review_id: string }[]
      );
      setProfile(p);
      setLoading(false);
    }
    load();
  }, [params.userId]);

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

  const isSelf = params.userId === session?.user.id;
  const name =
    profile?.display_name || `User ${params.userId.slice(0, 8)}\u2026`;
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : params.userId.slice(0, 2).toUpperCase();

  const offeringSkills = skills.filter((s) => !s.is_seeking);
  const wantingSkills = skills.filter((s) => s.is_seeking);
  const visibleSkills =
    activeTab === 'offering' ? offeringSkills : wantingSkills;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ── Header band ── */}
      <View style={styles.headerBand}>
        {/* Avatar */}
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.displayName}>{name}</Text>

        {/* Bio / tagline */}
        {!!profile?.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{skills.length}</Text>
            <Text style={styles.statLabel}>SKILLS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{reviews.length}</Text>
            <Text style={styles.statLabel}>REVIEWS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>
              {reviews.length > 0 ? avgRating.toFixed(1) : '\u2014'}
            </Text>
            <Text style={styles.statLabel}>AVG RATING</Text>
          </View>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <View style={styles.tabItem}>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'offering'
                ? styles.tabLabelActive
                : styles.tabLabelInactive,
            ]}
            onPress={() => setActiveTab('offering')}
          >
            Offering
          </Text>
          {activeTab === 'offering' && <View style={styles.tabUnderline} />}
        </View>
        <View style={styles.tabItem}>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'wanting'
                ? styles.tabLabelActive
                : styles.tabLabelInactive,
            ]}
            onPress={() => setActiveTab('wanting')}
          >
            Wanting
          </Text>
          {activeTab === 'wanting' && <View style={styles.tabUnderline} />}
        </View>
      </View>

      {/* ── Skill list ── */}
      <View style={styles.skillList}>
        {visibleSkills.length === 0 ? (
          <Text style={styles.empty}>
            {activeTab === 'offering'
              ? 'No skills offered yet.'
              : 'No skills listed as wanted.'}
          </Text>
        ) : (
          visibleSkills.map((s) => {
            const category = deriveCategory(s);
            return (
              <View key={s.skill_id} style={styles.skillItem}>
                <CategoryIconMark category={category} size={38} />
                <View style={styles.skillMeta}>
                  <Text style={styles.skillTitle} numberOfLines={1}>
                    {s.skill_name}
                  </Text>
                  {s.tags ? (
                    <Text style={styles.skillTags} numberOfLines={1}>
                      {s.tags.split(',').slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <ProficiencyDots value={s.proficiency} />
              </View>
            );
          })
        )}
      </View>

      {/* ── Reviews section ── */}
      {reviews.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Reviews</Text>
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

      {/* ── Propose Trade CTA ── */}
      {!isSelf && (
        <Button
          label="Propose Trade"
          variant="primary"
          style={styles.proposeBtn}
          onPress={() =>
            navigation.navigate('ProposeTrade', { targetUserId: params.userId })
          }
        />
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
    paddingBottom: Spacing['5xl'],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    height: 118,
    backgroundColor: 'rgba(127,163,127,0.22)',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    // Extend past top to cover status bar area
    marginBottom: Spacing['5xl'],
  },

  // ── Avatar ───────────────────────────────────────────────────────────────
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radii.avatar,
    borderWidth: 3,
    borderColor: Colors.cream,
    position: 'absolute',
    // Position avatar so it sits straddling the bottom of the band
    top: 118 - 44, // centre of avatar at band bottom edge
    ...Shadows.avatar,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: 22,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
  },

  // Name & bio sit below the band (offset by avatar height)
  displayName: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    marginTop: 54, // pushes text below the overlapping avatar
    textAlign: 'center',
  },
  bio: {
    fontFamily: FontFamily.body,
    fontSize: 12.5,
    color: Colors.inkSoft,
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  statCol: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
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
    marginTop: 2,
    letterSpacing: 0.6,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.line,
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: Spacing.s,
  },
  tabLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
  },
  tabLabelActive: {
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  tabLabelInactive: {
    fontWeight: FontWeight.regular,
    color: Colors.inkFaint,
    opacity: 0.45,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: Spacing.xl,
    right: Spacing.xl,
    height: 2,
    backgroundColor: Colors.terracotta,
    borderRadius: 2,
  },

  // ── Skill list ────────────────────────────────────────────────────────────
  skillList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.s,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  skillMeta: {
    flex: 1,
  },
  skillTitle: {
    fontFamily: FontFamily.heading,
    fontSize: 14.5,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  skillTags: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkFaint,
    marginTop: 2,
  },

  // Proficiency dots
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },

  // ── Review cards ──────────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.base,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xxs,
    ...Shadows.card,
  },
  reviewComment: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
    marginTop: Spacing.xxs,
  },

  // ── Propose trade button ──────────────────────────────────────────────────
  proposeBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },

  // (kept for potential future use — no hardcoded colors)
  empty: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkFaint,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.xxs,
    paddingTop: Spacing.s,
  },
});
