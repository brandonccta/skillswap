import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Spacing,
} from '../theme';

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.content, isOwn ? styles.contentOwn : styles.contentOther]}>
          {message.content}
        </Text>
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: Spacing.xxs,
    marginHorizontal: Spacing.md,
  },
  rowLeft: { alignItems: 'flex-start' },
  rowRight: { alignItems: 'flex-end' },

  bubble: {
    maxWidth: '75%',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },

  // Own message — terracotta, flat bottom-right corner
  bubbleOwn: {
    backgroundColor: Colors.bubbleSelf,
    borderRadius: Radii.md,
    borderBottomRightRadius: Spacing.xxs,
  },
  // Other message — paper, flat bottom-left corner
  bubbleOther: {
    backgroundColor: Colors.bubbleOther,
    borderRadius: Radii.md,
    borderBottomLeftRadius: Spacing.xxs,
  },

  content: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    lineHeight: Math.round(FontSize.base * 1.4),
  },
  contentOwn: { color: Colors.bubbleSelfText },
  contentOther: { color: Colors.bubbleOtherText },

  time: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xxs,
    marginTop: Spacing.xxs,
  },
  timeOwn: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  timeOther: { color: Colors.inkFaint },
});
