import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useSkillStore } from '../../store/skillStore';
import { createSkill, getUserSkills } from '../../services/skillService';
import { uploadMedia } from '../../services/mediaService';
import RatingStars from '../../components/RatingStars';
import TagSelector from '../../components/TagSelector';
import Button from '../../components/Button';
import { SkillsStackParamList } from '../../navigation/AppTabs';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radii,
  Spacing,
} from '../../theme';

type Nav = StackNavigationProp<SkillsStackParamList, 'CreateSkill'>;

export default function CreateSkillScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuthStore();
  const { setSkills } = useSkillStore();

  const [skillName, setSkillName] = useState('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [proficiency, setProficiency] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: Platform.OS === 'web',
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!session?.user.id) return;

    setLoading(true);
    try {
      let mediaUrl = '';
      if (imageUri) {
        const uploadResult = await uploadMedia(imageUri, imageBase64);
        if (uploadResult.status === 'success' && uploadResult.data) {
          mediaUrl = uploadResult.data.mediaUrl;
        } else {
          setError(uploadResult.message ?? 'Failed to upload image.');
          return;
        }
      }

      const result = await createSkill({
        userId: session.user.id,
        skillName: skillName.trim(),
        proficiency,
        tags,
        portfolioDescription: description.trim(),
        mediaUrl,
        isSeeking,
      });

      if (result.status === 'success') {
        // Refresh skill list in store
        const updated = await getUserSkills(session.user.id);
        setSkills(updated);
        navigation.goBack();
      } else if ('missing' in result) {
        setError(`Missing fields: ${result.missing.join(', ')}`);
      } else {
        setError(result.message ?? 'Failed to create skill.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Skill Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Python Programming"
        placeholderTextColor={Colors.inkFaint}
        value={skillName}
        onChangeText={setSkillName}
        maxLength={100}
      />

      <Text style={styles.label}>Skill Type *</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isSeeking && styles.toggleBtnActive]}
          onPress={() => setIsSeeking(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, !isSeeking && styles.toggleBtnTextActive]}>
            I can teach this
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, isSeeking && styles.toggleBtnActive]}
          onPress={() => setIsSeeking(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, isSeeking && styles.toggleBtnTextActive]}>
            I want to learn this
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Proficiency *</Text>
      <View style={styles.ratingRow}>
        <RatingStars value={proficiency} onChange={setProficiency} size={32} />
        <Text style={styles.proficiencyLabel}>{proficiency}/5</Text>
      </View>

      <Text style={styles.label}>Tags *</Text>
      <TagSelector tags={tags} onChange={setTags} />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe your experience, portfolio, etc."
        placeholderTextColor={Colors.inkFaint}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Photo (optional)</Text>
      <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.8}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <Text style={styles.photoBtnText}>Tap to select a photo</Text>
        )}
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          color={Colors.terracotta}
          size="small"
          style={styles.activityIndicator}
        />
      )}

      <Button
        label="Add Skill"
        onPress={handleSubmit}
        variant={loading ? 'disabled' : 'primary'}
        loading={loading}
        style={styles.submitBtn}
      />
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
    gap: Spacing.s,
    paddingBottom: 48,
  },

  // Error banner
  errorBanner: {
    backgroundColor: 'rgba(228,99,58,0.10)',
    borderRadius: Radii.s,
    padding: Spacing.md,
    marginBottom: Spacing.s,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.terracotta,
  },

  // Mustard uppercase field labels
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.label,
    color: Colors.mustard,
    marginBottom: 5,
    marginTop: Spacing.s,
  },

  // Standard text input — paper bg, dashed border, 14px radius
  input: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    paddingHorizontal: Spacing.lg,
    height: 48,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },

  // Multiline textarea variant
  multiline: {
    height: undefined,
    minHeight: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },

  // Proficiency row — stars + numeric badge
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  proficiencyLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.inkSoft,
  },

  // Photo picker
  photoBtn: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoBtnText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkFaint,
  },
  preview: {
    width: '100%',
    height: 140,
  },

  // Skill type toggle
  toggleRow: {
    flexDirection: 'row',
    borderRadius: Radii.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,38,32,0.22)',
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.paper,
  },
  toggleBtnActive: {
    backgroundColor: Colors.terracotta,
  },
  toggleBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.inkSoft,
  },
  toggleBtnTextActive: {
    color: Colors.white,
  },

  // Submit
  activityIndicator: {
    marginTop: Spacing.s,
  },
  submitBtn: {
    marginTop: Spacing.lg,
    width: '100%',
  },
});
