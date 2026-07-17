import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors, FontFamily, FontSize, FontWeight, Spacing } from '../theme';

import SkillListScreen from '../screens/skills/SkillListScreen';
import CreateSkillScreen from '../screens/skills/CreateSkillScreen';
import SkillDetailScreen from '../screens/skills/SkillDetailScreen';

import TradeListScreen from '../screens/trades/TradeListScreen';
import TradeDetailScreen from '../screens/trades/TradeDetailScreen';
import ProposeTradeScreen from '../screens/trades/ProposeTradeScreen';
import MessageThreadScreen from '../screens/trades/MessageThreadScreen';

import ExploreScreen from '../screens/explore/ExploreScreen';
import UserProfileScreen from '../screens/explore/UserProfileScreen';

import ProfileScreen from '../screens/profile/ProfileScreen';

export type SkillsStackParamList = {
  SkillList: undefined;
  CreateSkill: undefined;
  SkillDetail: { skillId: string };
};

export type TradesStackParamList = {
  TradeList: undefined;
  TradeDetail: { tradeId: string };
  ProposeTrade: { targetUserId: string };
  MessageThread: { tradeId: string };
};

export type ExploreStackParamList = {
  Explore: undefined;
  UserProfile: { userId: string };
  ProposeTrade: { targetUserId: string };
  SkillDetail: { skillId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator();
const SkillsStack = createStackNavigator<SkillsStackParamList>();
const TradesStack = createStackNavigator<TradesStackParamList>();
const ExploreStack = createStackNavigator<ExploreStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Shared header styling for all stack navigators
const stackScreenOptions = {
  headerStyle: { backgroundColor: Colors.cream },
  headerTintColor: Colors.terracotta,
  headerTitleStyle: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.extraBold as '800',
    color: Colors.ink,
  },
  cardStyle: { backgroundColor: Colors.cream },
};

function SkillsNavigator() {
  return (
    <SkillsStack.Navigator screenOptions={stackScreenOptions}>
      <SkillsStack.Screen name="SkillList" component={SkillListScreen} options={{ headerShown: false }} />
      <SkillsStack.Screen name="CreateSkill" component={CreateSkillScreen} options={{ title: 'Add Skill' }} />
      <SkillsStack.Screen name="SkillDetail" component={SkillDetailScreen} options={{ title: 'Skill' }} />
    </SkillsStack.Navigator>
  );
}

function TradesNavigator() {
  return (
    <TradesStack.Navigator screenOptions={stackScreenOptions}>
      <TradesStack.Screen name="TradeList" component={TradeListScreen} options={{ headerShown: false }} />
      <TradesStack.Screen name="TradeDetail" component={TradeDetailScreen} options={{ title: 'Trade' }} />
      <TradesStack.Screen name="ProposeTrade" component={ProposeTradeScreen} options={{ title: 'Propose Trade' }} />
      <TradesStack.Screen name="MessageThread" component={MessageThreadScreen} options={{ title: 'Messages' }} />
    </TradesStack.Navigator>
  );
}

function ExploreNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={stackScreenOptions}>
      <ExploreStack.Screen name="Explore" component={ExploreScreen} options={{ headerShown: false }} />
      <ExploreStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
      <ExploreStack.Screen name="ProposeTrade" component={ProposeTradeScreen} options={{ title: 'Propose Trade' }} />
      <ExploreStack.Screen name="SkillDetail" component={SkillDetailScreen} options={{ title: 'Skill' }} />
    </ExploreStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Geometric tab icons — plain View shapes (no SVG/emoji)
// ---------------------------------------------------------------------------

interface TabIconProps {
  focused: boolean;
  color: string;
}

/** Discover — solid circle */
function DiscoverIcon({ color, focused }: TabIconProps) {
  return (
    <View style={[tabIconStyles.circle, { backgroundColor: color, opacity: focused ? 1 : 0.5 }]} />
  );
}

/** Trades — rotated square (diamond) */
function TradesIcon({ color, focused }: TabIconProps) {
  return (
    <View
      style={[
        tabIconStyles.diamond,
        { backgroundColor: color, opacity: focused ? 1 : 0.5, transform: [{ rotate: '45deg' }] },
      ]}
    />
  );
}

/** Skills — speech-bubble circle (flat bottom-left corner) */
function SkillsIcon({ color, focused }: TabIconProps) {
  return (
    <View style={[tabIconStyles.bubble, { backgroundColor: color, opacity: focused ? 1 : 0.5 }]} />
  );
}

/** Profile — smaller solid circle */
function ProfileIcon({ color, focused }: TabIconProps) {
  return (
    <View style={[tabIconStyles.smallCircle, { backgroundColor: color, opacity: focused ? 1 : 0.5 }]} />
  );
}

const tabIconStyles = StyleSheet.create({
  circle:      { width: 20, height: 20, borderRadius: 10 },
  diamond:     { width: 16, height: 16, borderRadius: 4 },
  bubble:      { width: 20, height: 20, borderRadius: 10, borderBottomLeftRadius: 4 },
  smallCircle: { width: 18, height: 18, borderRadius: 9 },
});

// ---------------------------------------------------------------------------
// Main tab navigator
// ---------------------------------------------------------------------------

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.terracotta,
        tabBarInactiveTintColor: Colors.inkFaint,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopWidth: 1,
          borderTopColor: Colors.line,
          paddingTop: Spacing.xs,
          paddingBottom: Spacing.xs,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.bodyBold,
          fontSize: FontSize.xxs,
          fontWeight: FontWeight.bold as '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="ExploreTab"
        component={ExploreNavigator}
        options={{ title: 'Discover', tabBarIcon: (p) => <DiscoverIcon {...p} /> }}
      />
      <Tab.Screen
        name="TradesTab"
        component={TradesNavigator}
        options={{ title: 'Trades', tabBarIcon: (p) => <TradesIcon {...p} /> }}
      />
      <Tab.Screen
        name="SkillsTab"
        component={SkillsNavigator}
        options={{ title: 'Skills', tabBarIcon: (p) => <SkillsIcon {...p} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ title: 'Profile', tabBarIcon: (p) => <ProfileIcon {...p} /> }}
      />
    </Tab.Navigator>
  );
}
