import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useTradeStore } from '../../store/tradeStore';
import { getTrades } from '../../services/tradeService';
import TradeCard from '../../components/TradeCard';
import EmptyState from '../../components/EmptyState';
import { Trade } from '../../types';
import { TradesStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Spacing,
} from '../../theme';

type Nav = StackNavigationProp<TradesStackParamList, 'TradeList'>;

export default function TradeListScreen() {
  const navigation = useNavigation<Nav>();
  // useNavigation typed to the parent tab navigator for cross-tab navigation
  const rootNavigation = useNavigation<any>();
  const { session } = useAuthStore();
  const { trades, setTrades } = useTradeStore();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const data = await getTrades(session.user.id);
    setTrades(data);
    setLoading(false);
    setRefreshing(false);
  }, [session, setTrades]);

  useEffect(() => { load(); }, [load]);

  const userId = session?.user.id ?? '';

  const incoming = trades.filter(
    (t) => t.target_user_id === userId && t.status === 'pending'
  );
  const active = trades.filter(
    (t) =>
      ['accepted', 'in_progress', 'awaiting_confirmation'].includes(t.status) &&
      (t.requester_id === userId || t.target_user_id === userId)
  );
  const completed = trades.filter((t) => t.status === 'completed' || t.status === 'declined');

  const sections: { title: string; data: Trade[] }[] = [
    { title: 'Incoming', data: incoming },
    { title: 'Active', data: active },
    { title: 'Completed / Declined', data: completed },
  ].filter((s) => s.data.length > 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(t) => t.trade_id}
      renderItem={({ item }) => (
        <TradeCard
          trade={item}
          currentUserId={userId}
          onPress={() => navigation.navigate('TradeDetail', { tradeId: item.trade_id })}
        />
      )}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      ListEmptyComponent={
        <EmptyState
          category="Other"
          title="No trades yet"
          subtitle="Browse skills nearby and propose your first swap."
          ctaLabel="Browse skills"
          onCta={() => rootNavigation.navigate('ExploreTab')}
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={Colors.terracotta}
        />
      }
      contentContainerStyle={styles.contentContainer}
    />
  );
}

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
  sectionHeader: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xxs,
    backgroundColor: Colors.cream,
  },
  contentContainer: {
    paddingVertical: Spacing.s,
    flexGrow: 1,
  },
});
