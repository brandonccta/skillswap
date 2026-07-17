import React, { useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useSkillStore } from '../../store/skillStore';
import { getUserSkills } from '../../services/skillService';
import SkillCard from '../../components/SkillCard';
import EmptyState from '../../components/EmptyState';
import { SkillsStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Shadows,
  Spacing,
  TextStyles,
} from '../../theme';

type Nav = StackNavigationProp<SkillsStackParamList, 'SkillList'>;

export default function SkillListScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuthStore();
  const { skills, setSkills } = useSkillStore();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const data = await getUserSkills(session.user.id);
    setSkills(data);
    setLoading(false);
    setRefreshing(false);
  }, [session, setSkills]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={skills}
        keyExtractor={(s) => s.skill_id}
        renderItem={({ item }) => (
          <SkillCard
            skill={item}
            onPress={() => navigation.navigate('SkillDetail', { skillId: item.skill_id })}
          />
        )}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>My Skills</Text>
        }
        ListEmptyComponent={
          <EmptyState
            category="Other"
            title="No skills yet"
            subtitle="Add your first skill and start swapping with people around you."
            ctaLabel="Add a skill"
            onCta={() => navigation.navigate('CreateSkill')}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.terracotta}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Mustard FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSkill')}
        activeOpacity={0.82}
      >
        {/* Ink cross — horizontal bar */}
        <View style={styles.crossH} />
        {/* Ink cross — vertical bar */}
        <View style={styles.crossV} />
      </TouchableOpacity>
    </View>
  );
}

const FAB_SIZE = 52;
const CROSS_LONG = 20;
const CROSS_THICK = 2.5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
  listContent: {
    paddingTop: Spacing['2xl'],
    paddingBottom: FAB_SIZE + Spacing['2xl'] * 2,
    flexGrow: 1,
  },
  screenTitle: {
    ...TextStyles.h2,
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Mustard FAB
  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing['2xl'],
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radii.fab,
    backgroundColor: Colors.mustard,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttonMustard,
  },
  crossH: {
    position: 'absolute',
    width: CROSS_LONG,
    height: CROSS_THICK,
    borderRadius: CROSS_THICK / 2,
    backgroundColor: Colors.ink,
  },
  crossV: {
    position: 'absolute',
    width: CROSS_THICK,
    height: CROSS_LONG,
    borderRadius: CROSS_THICK / 2,
    backgroundColor: Colors.ink,
  },
});
