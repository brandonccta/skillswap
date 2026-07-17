import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { getAllSkills } from '../../services/skillService';
import SkillCard from '../../components/SkillCard';
import EmptyState from '../../components/EmptyState';
import { Skill } from '../../types';
import { ExploreStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Spacing,
  SkillCategory,
} from '../../theme';

type Nav = StackNavigationProp<ExploreStackParamList, 'Explore'>;

// ---------------------------------------------------------------------------
// Category chip data
// ---------------------------------------------------------------------------

interface CategoryChip {
  label: string;
  /** Tag value passed to getAllSkills(); undefined means "All". */
  tag: string | undefined;
  /** Category used for EmptyState icon when this chip is active. */
  category: SkillCategory;
}

const CHIPS: CategoryChip[] = [
  { label: 'All',      tag: undefined,   category: 'Other'    },
  { label: 'Music',    tag: 'music',     category: 'Music'    },
  { label: 'Cooking',  tag: 'cooking',   category: 'Cooking'  },
  { label: 'Language', tag: 'language',  category: 'Language' },
  { label: 'Craft',    tag: 'craft',     category: 'Craft'    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuthStore();
  const userId = session?.user.id ?? '';

  const [skills, setSkills]       = useState<Skill[]>([]);
  const [query, setQuery]         = useState('');
  const [activeChip, setActiveChip] = useState<CategoryChip>(CHIPS[0]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keep a ref to the latest query so refresh picks it up without stale closure.
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(
    async (tag?: string) => {
      const data = await getAllSkills(tag);
      // Exclude the current user's own skills
      setSkills(data.filter((s) => s.user_id !== userId));
      setLoading(false);
      setRefreshing(false);
    },
    [userId],
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(text: string) {
    setQuery(text);
    // Free-text search takes priority; reset active chip to "All".
    setActiveChip(CHIPS[0]);
    load(text);
  }

  function handleChipPress(chip: CategoryChip) {
    setActiveChip(chip);
    setQuery('');
    load(chip.tag);
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Discover</Text>

        {/* Notification bell */}
        <View style={styles.bellWrapper}>
          {/* Bell icon approximation using text glyph */}
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.bellDot} />
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          {/* Magnifier glyph */}
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills or people"
            placeholderTextColor={Colors.inkFaint}
            value={query}
            onChangeText={handleSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        {CHIPS.map((chip) => {
          const isActive = chip.label === activeChip.label;
          return (
            <TouchableOpacity
              key={chip.label}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => handleChipPress(chip)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Skill list ── */}
      <FlatList
        data={skills}
        keyExtractor={(s) => s.skill_id}
        renderItem={({ item }) => (
          <SkillCard
            skill={item}
            onPress={() =>
              navigation.navigate('UserProfile', { userId: item.user_id })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No skills found"
            subtitle={
              query
                ? `No results for "${query}". Try a different search term.`
                : `Nothing in ${activeChip.label} yet. Check back soon!`
            }
            category={activeChip.category}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              // Refresh using whichever filter is currently active.
              const tag = query || activeChip.tag;
              load(tag);
            }}
            tintColor={Colors.terracotta}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  screenTitle: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.extraBold,
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  // Bell
  bellWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 16,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.terracotta,
  },

  // Search bar
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: Colors.paper,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(46,38,32,0.1)',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 13.5,
    color: Colors.ink,
    // Remove default Android underline
    paddingVertical: 0,
  },

  // Category chips
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  chipsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  chipActive: {
    backgroundColor: Colors.terracotta,
  },
  chipInactive: {
    backgroundColor: Colors.sageTint,
  },
  chipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12.5,
    fontWeight: FontWeight.bold,
  },
  chipTextActive: {
    color: Colors.white,
  },
  chipTextInactive: {
    color: Colors.sageDark,
  },

  // List
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing['2xl'],
    flexGrow: 1,
  },
});
