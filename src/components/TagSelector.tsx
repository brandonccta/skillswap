import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Colors,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Spacing,
} from '../theme';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagSelector({
  tags,
  onChange,
  placeholder = 'Add a tag',
}: Props) {
  const [input, setInput] = useState('');

  function addTag() {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <View>
      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.inkFaint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTag}
          returnKeyType="done"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addTag} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Chips */}
      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={styles.chip}
              onPress={() => removeTag(tag)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipText}>{tag} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.s,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: Radii.s,
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    paddingHorizontal: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  addBtn: {
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.button,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.s,
  },
  chip: {
    backgroundColor: Colors.sageTint,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xxs + 2,
    paddingHorizontal: Spacing.sm,
  },
  chipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.sageDark,
  },
});
