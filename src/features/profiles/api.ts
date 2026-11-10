import { supabase } from '@/lib/supabase';

export type DriverProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type DriverProfileDraft = {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  real_name: string;
};

const usernamePattern = /^[a-z0-9_]{3,24}$/;
const reservedUsernames = new Set([
  'admin',
  'administrator',
  'support',
  'moderator',
  'milebud',
]);

export function validateProfileDraft(draft: DriverProfileDraft) {
  const username = draft.username.trim().toLowerCase();
  if (!usernamePattern.test(username)) {
    throw new Error('Username must be 3–24 lowercase letters, numbers, or underscores.');
  }
  if (reservedUsernames.has(username)) {
    throw new Error('That username is reserved. Choose another one.');
  }

  const displayName = draft.display_name.trim();
  if (displayName.length > 80) {
    throw new Error('Display name must be 80 characters or fewer.');
  }
  if (draft.bio.length > 500) {
    throw new Error('Bio must be 500 characters or fewer.');
  }
  if (draft.real_name.trim().length > 120) {
    throw new Error('Real name must be 120 characters or fewer.');
  }

  let avatarUrl: string | null = null;
  const rawAvatarUrl = draft.avatar_url.trim();
  if (rawAvatarUrl) {
    let parsed: URL;
    try {
      parsed = new URL(rawAvatarUrl);
    } catch {
      throw new Error('Avatar URL must be a valid HTTPS address.');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Avatar URL must use HTTPS.');
    }
    avatarUrl = parsed.toString();
  }

  return {
    username,
    display_name: displayName || null,
    avatar_url: avatarUrl,
    bio: draft.bio.trim() || null,
    real_name: draft.real_name.trim() || null,
  };
}

export async function getMyProfile(userId: string): Promise<{
  profile: DriverProfile;
  realName: string | null;
}> {
  const [profileResult, privateProfileResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .eq('id', userId)
      .single(),
    supabase
      .from('private_profiles')
      .select('real_name')
      .eq('user_id', userId)
      .single(),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (privateProfileResult.error) {
    throw privateProfileResult.error;
  }

  return {
    profile: profileResult.data,
    realName: privateProfileResult.data.real_name,
  };
}

export async function updateMyProfile(
  userId: string,
  draft: DriverProfileDraft,
): Promise<DriverProfile> {
  const validated = validateProfileDraft(draft);
  const { real_name: realName, ...publicFields } = validated;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update(publicFields)
    .eq('id', userId)
    .select('id, username, display_name, avatar_url, bio')
    .single();

  if (profileError) {
    throw profileError;
  }

  const { error: privateProfileError } = await supabase
    .from('private_profiles')
    .update({ real_name: realName })
    .eq('user_id', userId);

  if (privateProfileError) {
    throw new Error(
      `Public profile saved, but private profile could not be saved: ${privateProfileError.message}`,
    );
  }

  return profile;
}
