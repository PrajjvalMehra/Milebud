import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  InlineMessage,
  PrimaryButton,
  SurfaceCard,
  TextButton,
  TextField,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { getMyProfile, updateMyProfile, type DriverProfileDraft } from './api';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function ProfileField({
  accessibilityLabel,
  label,
  maxLength,
  multiline,
  onChangeText,
  value,
}: {
  accessibilityLabel: string;
  label: string;
  maxLength?: number;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <TextField
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={label === 'Username' ? 'none' : 'sentences'}
      label={label}
      maxLength={maxLength}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={label}
      value={value}
    />
  );
}

export function ProfileEditor({ userId }: { userId: string }) {
  const theme = useTheme();
  const [draft, setDraft] = useState<DriverProfileDraft>({
    username: '',
    display_name: '',
    avatar_url: '',
    bio: '',
    real_name: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { profile, realName } = await getMyProfile(userId);
        if (active) {
          setDraft({
            username: profile.username,
            display_name: profile.display_name ?? '',
            avatar_url: profile.avatar_url ?? '',
            bio: profile.bio ?? '',
            real_name: realName ?? '',
          });
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getErrorMessage(error, 'Unable to load your profile.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  function updateDraft<Key extends keyof DriverProfileDraft>(
    key: Key,
    value: DriverProfileDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const profile = await updateMyProfile(userId, draft);
      setDraft((current) => ({
        ...current,
        username: profile.username,
        display_name: profile.display_name ?? '',
        avatar_url: profile.avatar_url ?? '',
        bio: profile.bio ?? '',
      }));
      setMessage('Profile saved.');
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to save your profile.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Your profile</ThemedText>
        {!isLoading && !isEditing && !errorMessage && (
          <TextButton
            label="Edit profile"
            onPress={() => {
              setMessage(null);
              setIsEditing(true);
            }}
          />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} />
      ) : errorMessage && !isEditing ? (
        <InlineMessage tone="danger">{errorMessage}</InlineMessage>
      ) : isEditing ? (
        <>
          <ProfileField
            accessibilityLabel="Public username"
            label="Username"
            maxLength={24}
            onChangeText={(value) => updateDraft('username', value)}
            value={draft.username}
          />
          <ProfileField
            accessibilityLabel="Public display name"
            label="Display name"
            maxLength={80}
            onChangeText={(value) => updateDraft('display_name', value)}
            value={draft.display_name}
          />
          <ProfileField
            accessibilityLabel="Public avatar image URL"
            label="Avatar URL (HTTPS)"
            onChangeText={(value) => updateDraft('avatar_url', value)}
            value={draft.avatar_url}
          />
          <ProfileField
            accessibilityLabel="Public profile bio"
            label="Bio"
            maxLength={500}
            multiline
            onChangeText={(value) => updateDraft('bio', value)}
            value={draft.bio}
          />
          <ProfileField
            accessibilityLabel="Private real name"
            label="Real name (private)"
            maxLength={120}
            onChangeText={(value) => updateDraft('real_name', value)}
            value={draft.real_name}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Your real name is private and is never shown on your public profile.
          </ThemedText>
          {errorMessage && <InlineMessage tone="danger">{errorMessage}</InlineMessage>}
          <PrimaryButton
            disabled={isSaving}
            isLoading={isSaving}
            label="Save profile"
            onPress={() => void saveProfile()}
          />
          <TextButton
            disabled={isSaving}
            label="Cancel"
            onPress={() => {
              setErrorMessage(null);
              setIsEditing(false);
            }}
          />
        </>
      ) : (
        <>
          <ThemedText type="subtitle">
            {draft.display_name.trim() || `@${draft.username}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            @{draft.username}
          </ThemedText>
          {!!draft.bio && <ThemedText>{draft.bio}</ThemedText>}
          {message && <InlineMessage tone="success">{message}</InlineMessage>}
        </>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
