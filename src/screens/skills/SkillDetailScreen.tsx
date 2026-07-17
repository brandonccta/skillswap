import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getSkillById } from '../../services/skillService';
import { supabase } from '../../lib/supabase';
import { Skill } from '../../types';
import RatingStars from '../../components/RatingStars';
import Button from '../../components/Button';
import CategoryIconMark from '../../components/CategoryIconMark';
import { SkillsStackParamList } from '../../navigation/AppTabs';
import { useAuthStore } from '../../store/authStore';
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

type Route = RouteProp<SkillsStackParamList, 'SkillDetail'>;
type Nav = StackNavigationProp<SkillsStackParamList, 'SkillDetail'>;

export default function SkillDetailScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { session } = useAuthStore();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSkillById(params.skillId).then((r) => {
      if (r.status === 'success') setSkill(r.data!);
      setLoading(false);
    });
  }, [params.skillId]);

  const isOwner = !!session && !!skill && session.user.id === skill.user_id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Skill',
      'Are you sure you want to delete this skill? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase
              .from('skills')
              .delete()
              .eq('skill_id', params.skillId);
            setDeleting(false);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleProposeTrade = () => {
    if (!skill) return;
    // Navigate to ProposeTrade targeting the skill owner
    // Cross-stack navigation: cast params to any to satisfy TS across stack boundaries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).navigate('ProposeTrade', { targetUserId: skill.user_id });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!skill) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Skill not found.</Text>
      </View>
    );
  }

  // ── Category inference (same logic as SkillCard) ─────────────────────────
  const tags = skill.tags ? skill.tags.split(',').filter(Boolean) : [];
  const rawCategory = tags[0]
    ? ((tags[0].charAt(0).toUpperCase() + tags[0].slice(1).toLowerCase()) as SkillCategory)
    : 'Other';
  const category: SkillCategory = rawCategory in CategoryStyles ? rawCategory : 'Other';
  const catStyle = CategoryStyles[category];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Category icon mark */}
      <View style={styles.iconRow}>
        <CategoryIconMark category={category} size={52} />
      </View>

      {/* Skill name */}
      <Text style={styles.name}>{skill.skill_name}</Text>

      {/* Media image */}
      {!!skill.media_url && (
        <Image
          source={{ uri: skill.media_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Proficiency card */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Proficiency</Text>
        <View style={styles.proficiencyRow}>
          <RatingStars value={skill.proficiency} size={20} />
          <Text style={styles.proficiencyText}>{skill.proficiency} / 5</Text>
        </View>
      </View>

      {/* Tags card */}
      {tags.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tagsRow}>
            {tags.map((t) => (
              <View
                key={t}
                style={[styles.chip, { backgroundColor: catStyle.tint }]}
              >
                <Text style={[styles.chipText, { color: catStyle.textColor }]}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* About card */}
      {!!skill.portfolio_description && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>About</Text>
          <Text style={styles.description}>{skill.portfolio_description}</Text>
        </View>
      )}

      {/* CTAs */}
      <View style={styles.ctaSection}>
        {/* Propose Trade — shown to non-owners */}
        {!isOwner && (
          <Button
            label="Propose Trade"
            onPress={handleProposeTrade}
            variant="primary"
            style={styles.ctaButton}
          />
        )}

        {/* Owner controls */}
        {isOwner && (
          <>
            <Button
              label="Edit Skill"
              onPress={() => navigation.navigate('CreateSkill')}
              variant="secondary"
              style={styles.ctaButton}
            />
            <Button
              label="Delete Skill"
              onPress={handleDelete}
              variant="text"
              loading={deleting}
              style={styles.deleteButton}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['4xl'],
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
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: Radii.xl,
  },
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: Spacing.s,
  },
  proficiencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  proficiencyText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.inkSoft,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    borderRadius: Radii.xs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
  },
  chipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  description: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
    lineHeight: Math.round(FontSize.md * 1.55),
  },
  ctaSection: {
    gap: Spacing.md,
    marginTop: Spacing.s,
  },
  ctaButton: {
    alignSelf: 'stretch',
  },
  deleteButton: {
    alignSelf: 'center',
  },
});
