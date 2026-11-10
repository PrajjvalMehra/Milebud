import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  IconTile,
  InlineMessage,
  PageHeader,
  PageLayout,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  SurfaceCard,
  TextButton,
  TextField,
  type IconName,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { ProfileEditor } from '@/features/profiles/profile-editor';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password' | 'reset_password';

const benefits: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'parking',
    title: 'Share parking & fuel updates',
    description: 'Tell drivers what is open before they arrive.',
  },
  {
    icon: 'check',
    title: 'Confirm what you see',
    description: 'Corroborate or dispute reports to keep information accurate.',
  },
  {
    icon: 'shield',
    title: 'Your location stays private',
    description: 'Reports are about facilities, never your live position.',
  },
];

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

export default function AccountScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const linkingUrl = Linking.useLinkingURL();
  const handledAuthLinkUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset_password');
      }
      setIsLoading(false);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setErrorMessage(error.message);
        } else {
          setUserEmail(data.session?.user.email ?? null);
          setUserId(data.session?.user.id ?? null);
        }
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to read your sign-in session.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!linkingUrl || linkingUrl === handledAuthLinkUrl.current) {
      return;
    }
    const urlValue = linkingUrl;
    let active = true;

    async function handleRecoveryLink() {
      let url: URL;
      try {
        url = new URL(urlValue);
      } catch {
        return;
      }

      const query = url.searchParams;
      const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
      const linkType = query.get('type') ?? fragment.get('type');
      if (!['recovery', 'signup', 'email'].includes(linkType ?? '')) {
        return;
      }

      handledAuthLinkUrl.current = urlValue;
      try {
        let session = null;
        const code = query.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
          session = data.session;
        } else {
          const accessToken = fragment.get('access_token');
          const refreshToken = fragment.get('refresh_token');
          if (!accessToken || !refreshToken) {
            throw new Error('This password reset link is invalid or has expired.');
          }
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
          session = data.session;
        }

        if (!session) {
          throw new Error('The account link did not create a session.');
        }
        if (active) {
          setUserEmail(session.user.email ?? null);
          setUserId(session.user.id);
          setErrorMessage(null);
          setConfirmPassword('');
          setPassword('');
          setMode(linkType === 'recovery' ? 'reset_password' : 'sign_in');
          setMessage(linkType === 'recovery' ? null : 'Email confirmed. Your account is ready.');
        }
      } catch (error) {
        if (active) {
          const description = url.searchParams.get('error_description');
          setErrorMessage(
            description ?? getErrorMessage(error, 'Unable to complete this account link.'),
          );
        }
      }
    }

    void handleRecoveryLink();
    return () => {
      active = false;
    };
  }, [linkingUrl]);

  async function handleSubmit() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }
    if (mode === 'sign_up' && password.length < 8) {
      setErrorMessage('Choose a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      if (mode === 'sign_up') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: Linking.createURL('account'),
          },
        });
        if (error) {
          throw error;
        }
        if (data.session) {
          setUserEmail(data.user?.email ?? normalizedEmail);
        } else {
          setMessage('Check your email for a confirmation link to finish creating your account.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          throw error;
        }
        setUserEmail(data.user.email ?? normalizedEmail);
      }
      setPassword('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to authenticate.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordResetRequest() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage('Enter your account email address.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const redirectUrl = new URL(Linking.createURL('account'));
      redirectUrl.searchParams.set('type', 'recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl.toString(),
      });
      if (error) {
        throw error;
      }
      setMessage('If an account exists for that email, a password reset link is on its way.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to request a password reset.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (password.length < 8) {
      setErrorMessage('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      setPassword('');
      setConfirmPassword('');
      setMode('sign_in');
      setMessage('Your password has been updated.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to update your password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUserEmail(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to sign out.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setErrorMessage(null);
  }

  const isSignedIn = Boolean(userEmail && userId) && mode !== 'reset_password';
  const header =
    mode === 'reset_password'
      ? { title: 'New password', description: 'Choose a new password for your account.' }
      : isSignedIn
        ? { title: 'Account', description: 'Manage your driver profile.' }
        : mode === 'forgot_password'
          ? { title: 'Reset password', description: 'We will email you a secure reset link.' }
          : {
              title: mode === 'sign_up' ? 'Join Milebud' : 'Welcome back',
              description: 'The community for professional truck drivers.',
            };

  return (
    <PageLayout keyboardShouldPersistTaps="handled">
      <PageHeader description={header.description} eyebrow="Milebud" title={header.title} />

      {message && <InlineMessage tone="success">{message}</InlineMessage>}
      {errorMessage && <InlineMessage tone="danger">{errorMessage}</InlineMessage>}

      {isLoading ? (
        <ThemedText themeColor="textSecondary">Checking your session…</ThemedText>
      ) : mode === 'reset_password' ? (
        <SurfaceCard style={styles.form}>
          <TextField
            accessibilityLabel="New password"
            autoCapitalize="none"
            autoComplete="new-password"
            label="New password"
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
          />
          <TextField
            accessibilityLabel="Confirm new password"
            autoCapitalize="none"
            autoComplete="new-password"
            label="Confirm password"
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            secureTextEntry
            value={confirmPassword}
          />
          <PrimaryButton
            isLoading={isSubmitting}
            label="Update password"
            onPress={() => void handlePasswordReset()}
          />
        </SurfaceCard>
      ) : isSignedIn && userId ? (
        <>
          <SurfaceCard style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>
                {(userEmail ?? '?').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.identityText}>
              <ThemedText type="smallBold">Signed in</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {userEmail}
              </ThemedText>
            </View>
          </SurfaceCard>
          <ProfileEditor userId={userId} />
          <SecondaryButton
            isLoading={isSubmitting}
            label="Sign out"
            onPress={() => void handleSignOut()}
          />
        </>
      ) : mode === 'forgot_password' ? (
        <SurfaceCard style={styles.form}>
          <TextField
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <PrimaryButton
            isLoading={isSubmitting}
            label="Send reset link"
            onPress={() => void handlePasswordResetRequest()}
          />
          <TextButton label="Back to sign in" onPress={() => switchMode('sign_in')} />
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard style={styles.form}>
            <SegmentedControl
              onChange={switchMode}
              options={[
                { label: 'Sign in', value: 'sign_in' },
                { label: 'Create account', value: 'sign_up' },
              ]}
              value={mode}
            />
            <TextField
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />
            <TextField
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
              label="Password"
              onChangeText={setPassword}
              placeholder={mode === 'sign_up' ? 'At least 8 characters' : 'Your password'}
              secureTextEntry
              value={password}
            />
            <PrimaryButton
              isLoading={isSubmitting}
              label={mode === 'sign_in' ? 'Sign in' : 'Create account'}
              onPress={() => void handleSubmit()}
            />
            {mode === 'sign_in' && (
              <TextButton label="Forgot password?" onPress={() => switchMode('forgot_password')} />
            )}
          </SurfaceCard>

          <View style={styles.benefits}>
            {benefits.map((benefit) => (
              <View key={benefit.title} style={styles.benefit}>
                <IconTile name={benefit.icon} size={40} />
                <View style={styles.benefitText}>
                  <ThemedText type="smallBold">{benefit.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {benefit.description}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: Spacing.half,
  },
  benefits: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  benefitText: {
    flex: 1,
    gap: Spacing.half,
  },
});
