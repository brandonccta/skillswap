import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { getMessages, sendMessage } from '../../services/messageService';
import { getTradeById } from '../../services/tradeService';
import { getSkillById } from '../../services/skillService';
import { getProfile } from '../../services/profileService';
import { Message, MESSAGEABLE_TRADE_STATUSES, TradeStatus } from '../../types';
import MessageBubble from '../../components/MessageBubble';
import { useRealtime } from '../../hooks/useRealtime';
import { TradesStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  Radii,
  Shadows,
  Spacing,
} from '../../theme';

type Route = RouteProp<TradesStackParamList, 'MessageThread'>;

interface MatchInfo {
  partnerName: string;
  offeredSkillName: string;
  desiredSkillName: string;
  /** true when current user is the requester, false when target */
  currentUserIsRequester: boolean;
}

// ---------------------------------------------------------------------------
// Triangle send icon — pure View shape, no external SVG dependency
// ---------------------------------------------------------------------------
function SendTriangle() {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderLeftWidth: 13,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: Colors.ink,
        marginLeft: 3,
      }}
    />
  );
}

export default function MessageThreadScreen() {
  const { params } = useRoute<Route>();
  const { session } = useAuthStore();
  const userId = session?.user.id ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>('pending');
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const [msgs, tradeResult] = await Promise.all([
      getMessages(params.tradeId),
      getTradeById(params.tradeId),
    ]);
    setMessages(msgs);

    if (tradeResult.status === 'success' && tradeResult.data) {
      const trade = tradeResult.data;
      setTradeStatus(trade.status);

      // Fetch partner profile and both skill names for the match card
      const isRequester = trade.requester_id === userId;
      const partnerId = isRequester ? trade.target_user_id : trade.requester_id;

      const [partnerProfileResult, offeredSkillResult, desiredSkillResult] =
        await Promise.all([
          getProfile(partnerId),
          getSkillById(trade.offered_skill_id),
          getSkillById(trade.desired_skill_id),
        ]);

      const partnerName =
        partnerProfileResult?.display_name ?? 'your match';
      const offeredSkillName =
        offeredSkillResult.status === 'success'
          ? offeredSkillResult.data!.skill_name
          : 'a skill';
      const desiredSkillName =
        desiredSkillResult.status === 'success'
          ? desiredSkillResult.data!.skill_name
          : 'a skill';

      setMatchInfo({
        partnerName,
        offeredSkillName,
        desiredSkillName,
        currentUserIsRequester: isRequester,
      });
    }

    setLoading(false);
  }, [params.tradeId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Append new messages arriving via Supabase Realtime
  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      // Avoid duplicates (our own sends are already optimistically added)
      if (prev.some((m) => m.message_id === msg.message_id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useRealtime(params.tradeId, handleNewMessage);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    setContent('');
    const result = await sendMessage({
      senderId: userId,
      tradeId: params.tradeId,
      content: trimmed,
    });
    setSending(false);
    if (result.status === 'success') {
      // Reload to get server-assigned message_id (Realtime will also fire for others)
      const updated = await getMessages(params.tradeId);
      setMessages(updated);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const canMessage = MESSAGEABLE_TRADE_STATUSES.includes(tradeStatus);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.message_id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.sender_id === userId} />
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListHeaderComponent={
          matchInfo ? <MatchCard info={matchInfo} /> : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No messages yet. Say hello!</Text>
        }
        contentContainerStyle={styles.listContent}
      />

      {canMessage ? (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={Colors.inkFaint}
            value={content}
            onChangeText={setContent}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!content.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || !content.trim()}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color={Colors.ink} size="small" />
            ) : (
              <SendTriangle />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.disabledBar}>
          <Text style={styles.disabledText}>
            Messaging is only available on active trades.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Match notification card
// ---------------------------------------------------------------------------
interface MatchCardProps {
  info: MatchInfo;
}

function MatchCard({ info }: MatchCardProps) {
  const { partnerName, offeredSkillName, desiredSkillName, currentUserIsRequester } =
    info;

  // "You offered X, they offered Y" — from the current user's perspective
  const mySkill = currentUserIsRequester ? offeredSkillName : desiredSkillName;
  const theirSkill = currentUserIsRequester ? desiredSkillName : offeredSkillName;

  return (
    <View style={styles.matchCard}>
      {/* Icon circle */}
      <View style={styles.matchIconCircle}>
        {/* Two overlapping small circles to suggest a handshake / match */}
        <View style={styles.matchIconDotLeft} />
        <View style={styles.matchIconDotRight} />
      </View>

      <View style={styles.matchTextBlock}>
        <Text style={styles.matchTitle}>
          You matched with {partnerName}!
        </Text>
        <Text style={styles.matchSubtitle}>
          You offered {mySkill}, they offered {theirSkill}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
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
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },

  empty: {
    textAlign: 'center',
    color: Colors.inkFaint,
    marginTop: 80,
    fontSize: FontSize.md,
    fontFamily: FontFamily.body,
  },

  // ── Match card ────────────────────────────────────────────────────────────
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(228,99,58,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(228,99,58,0.40)',
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: Spacing.base,
    gap: Spacing.md,
  },

  matchIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.fab,
    backgroundColor: 'rgba(228,99,58,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },

  matchIconDotLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.terracotta,
    marginRight: -3,
  },

  matchIconDotRight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.mustard,
    marginLeft: -3,
  },

  matchTextBlock: {
    flex: 1,
  },

  matchTitle: {
    fontFamily: 'Bitter_700Bold',
    fontSize: 14.5,
    color: Colors.ink,
    lineHeight: Math.round(14.5 * 1.3),
  },

  matchSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: 11.5,
    color: Colors.inkSoft,
    marginTop: Spacing.xxs,
    lineHeight: Math.round(11.5 * 1.4),
  },

  // ── Input bar ─────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.cream,
  },

  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 13.5,
    color: Colors.ink,
    maxHeight: 100,
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: Radii.fab,
    backgroundColor: Colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Shadows.buttonMustard,
  },

  sendBtnDisabled: {
    opacity: 0.45,
  },

  // ── Disabled bar ──────────────────────────────────────────────────────────
  disabledBar: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.paper,
    alignItems: 'center',
  },

  disabledText: {
    fontFamily: FontFamily.body,
    color: Colors.inkFaint,
    fontSize: FontSize.base,
    textAlign: 'center',
  },
});
