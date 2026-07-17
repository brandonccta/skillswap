import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Skill } from '../types';
import RatingStars from './RatingStars';
import CategoryIconMark from './CategoryIconMark';
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
} from '../theme';

interface Props {
  skill: Skill;
  onPress?: () => void;
}

export default function SkillCard({ skill, onPress }: Props) {
  const tags = skill.tags ? skill.tags.split(',').filter(Boolean) : [];

  // Infer category from tags or fall back to 'Other'
  const rawCategory = tags[0]
    ? (tags[0].charAt(0).toUpperCase() + tags[0].slice(1).toLowerCase()) as SkillCategory
    : 'Other';
  const category: SkillCategory = rawCategory in CategoryStyles ? rawCategory : 'Other';
  const catStyle = CategoryStyles[category];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.88}
    >
      {!!skill.media_url && (
        <Image
          source={{ uri: skill.media_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}

      {/* Header row: avatar icon + name + meta */}
      <View style={styles.headerRow}>
        <CategoryIconMark category={category} size={40} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {skill.skill_name}
          </Text>
          <View style={styles.ratingRow}>
            <RatingStars value={skill.proficiency} size={7} />
            <Text style={styles.metaText}>
              {'  '}Proficiency {skill.proficiency}/5
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {!!skill.portfolio_description && (
        <Text style={styles.desc} numberOfLines={2}>
          {skill.portfolio_description}
        </Text>
      )}

      {/* Tags row — Offers chips */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.slice(0, 3).map((t) => (
            <View
              key={t}
              style={[styles.offerChip, { backgroundColor: catStyle.tint }]}
            >
              <Text style={[styles.offerChipText, { color: catStyle.textColor }]}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxs,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkFaint,
  },
  desc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.inkSoft,
    lineHeight: Math.round(FontSize.sm * 1.4),
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  offerChip: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.xs,
  },
  offerChipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
