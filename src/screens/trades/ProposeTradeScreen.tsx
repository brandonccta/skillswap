import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { getUserSkills, getAllSkills } from '../../services/skillService';
import { submitTrade } from '../../services/tradeService';
import { Skill } from '../../types';
import { TradesStackParamList } from '../../navigation/AppTabs';
import Button from '../../components/Button';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Shadows,
  Spacing,
  TextStyles,
} from '../../theme';

type Nav = StackNavigationProp<TradesStackParamList, 'ProposeTrade'>;
type Route = RouteProp<TradesStackParamList, 'ProposeTrade'>;

export default function ProposeTradeScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { session } = useAuthStore();

  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [theirSkills, setTheirSkills] = useState<Skill[]>([]);
  const [selectedMySkill, setSelectedMySkill] = useState<string>('');
  const [selectedTheirSkill, setSelectedTheirSkill] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const userId = session?.user.id ?? '';

  useEffect(() => {
    async function load() {
      const [mine, theirs] = await Promise.all([
        getUserSkills(userId),
        getAllSkills(),
      ]);
      setMySkills(mine.filter((s) => !s.is_seeking));
      setTheirSkills(theirs.filter((s) => s.user_id === params.targetUserId && !s.is_seeking));
      setLoading(false);
    }
    load();
  }, [userId, params.targetUserId]);

  async function handleSubmit() {
    setError('');
    if (!selectedMySkill || !selectedTheirSkill) {
      setError('Please select both skills.');
      return;
    }

    setSubmitting(true);
    const result = await submitTrade({
      requesterId: userId,
      offeredSkillId: selectedMySkill,
      targetUserId: params.targetUserId,
      desiredSkillId: selectedTheirSkill,
    });
    setSubmitting(false);

    if (result.status === 'success') {
      Alert.alert('Trade Proposed', 'Your trade request has been sent!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      const msg =
        'missing' in result
          ? `Missing: ${result.missing.join(', ')}`
          : (result.message ?? 'Failed to submit trade.');
      setError(msg);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Offering section */}
      <Text style={styles.sectionLabel}>Offering</Text>
      <View style={styles.pickerCard}>
        {mySkills.length === 0 ? (
          <Text style={styles.empty}>You have no skills to offer yet. Add one under My Skills.</Text>
        ) : (
          mySkills.map((s) => (
            <TouchableOpacity
              key={s.skill_id}
              style={[
                styles.skillItem,
                selectedMySkill === s.skill_id && styles.skillItemSelected,
              ]}
              onPress={() => setSelectedMySkill(s.skill_id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.skillItemText,
                  selectedMySkill === s.skill_id && styles.skillItemTextSelected,
                ]}
              >
                {s.skill_name}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Wanting section */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Wanting</Text>
      <View style={styles.pickerCard}>
        {theirSkills.length === 0 ? (
          <Text style={styles.empty}>This user has no skills to offer.</Text>
        ) : (
          theirSkills.map((s) => (
            <TouchableOpacity
              key={s.skill_id}
              style={[
                styles.skillItem,
                selectedTheirSkill === s.skill_id && styles.skillItemSelected,
              ]}
              onPress={() => setSelectedTheirSkill(s.skill_id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.skillItemText,
                  selectedTheirSkill === s.skill_id && styles.skillItemTextSelected,
                ]}
              >
                {s.skill_name}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Submit */}
      <Button
        label="Propose Trade"
        onPress={handleSubmit}
        variant={submitting ? 'disabled' : 'primary'}
        loading={submitting}
        style={styles.submitBtn}
      />

      {/* Cancel */}
      <View style={styles.cancelWrapper}>
        <Button
          label="Cancel"
          onPress={() => navigation.goBack()}
          variant="text"
        />
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
    padding: Spacing.xxl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.s,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },

  // Error banner
  errorBanner: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.terracotta,
    borderRadius: Radii.s,
    padding: Spacing.md,
    marginBottom: Spacing.s,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracotta,
  },

  // Section labels — mustard, uppercase, Karla Bold, 10px
  sectionLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
    color: Colors.mustard,
    marginBottom: Spacing.xs,
  },
  sectionLabelSpaced: {
    marginTop: Spacing.lg,
  },

  // Picker card — paper bg, 20px radius, 1px line border
  pickerCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
    ...Shadows.card,
  },

  // Skill list items inside the picker card
  skillItem: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  skillItemSelected: {
    backgroundColor: Colors.terracottaTint,
  },
  skillItemText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
  },
  skillItemTextSelected: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.terracottaDark,
  },

  empty: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkFaint,
    fontStyle: 'italic',
    padding: Spacing.lg,
  },

  // Submit button
  submitBtn: {
    marginTop: Spacing.xxl,
    alignSelf: 'stretch',
  },

  // Cancel link
  cancelWrapper: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
