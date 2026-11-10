import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Chip,
  EmptyState,
  InlineMessage,
  PageHeader,
  PageLayout,
  PrimaryButton,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextButton,
  TextField,
  type Tone,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { FacilityType } from '@/types/database.types';

import {
  createFacilitySubmission,
  getMyFacilitySubmissions,
  updateFacilitySubmission,
} from './submissions-api';
import { ModerationQueue } from './moderation-queue';
import type {
  FacilitySubmission,
  FacilitySubmissionDetails,
  FacilitySubmissionFields,
} from './submissions-types';

const facilityTypes: FacilityType[] = [
  'truck_stop',
  'shipper',
  'receiver',
  'rest_area',
  'weigh_station',
  'fuel_station',
  'repair_shop',
  'parking_facility',
  'other',
];

type SubmissionDraft = {
  name: string;
  facility_type: FacilityType;
  longitude: string;
  latitude: string;
  address: string;
  city: string;
  region: string;
  country_code: string;
  postal_code: string;
  phone: string;
  website: string;
};

const emptyDraft: SubmissionDraft = {
  name: '',
  facility_type: 'truck_stop',
  longitude: '',
  latitude: '',
  address: '',
  city: '',
  region: '',
  country_code: '',
  postal_code: '',
  phone: '',
  website: '',
};

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const statusTone: Record<string, Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

function toDraft(submission?: FacilitySubmission): SubmissionDraft {
  if (!submission) {
    return emptyDraft;
  }

  return {
    ...emptyDraft,
    name: submission.name,
    facility_type: submission.facility_type,
    address: submission.address ?? '',
    city: submission.city ?? '',
    region: submission.region ?? '',
    country_code: submission.country_code,
    postal_code: submission.postal_code ?? '',
    phone: submission.phone ?? '',
    website: submission.website ?? '',
  };
}

function toNullableText(value: string) {
  return value.trim() || null;
}

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

function Field({
  accessibilityLabel,
  keyboardType,
  labelText,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  keyboardType?: 'default' | 'decimal-pad' | 'email-address' | 'phone-pad' | 'url';
  labelText: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <TextField
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
      keyboardType={keyboardType}
      label={labelText}
      onChangeText={onChangeText}
      placeholder={placeholder ?? labelText}
      value={value}
    />
  );
}

function TypePicker({
  onChange,
  value,
}: {
  onChange: (value: FacilityType) => void;
  value: FacilityType;
}) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">Facility type</ThemedText>
      <ThemedView style={styles.choices}>
        {facilityTypes.map((type) => (
          <Chip
            key={type}
            label={label(type)}
            onPress={() => onChange(type)}
            selected={type === value}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function FacilitySubmissionEditor({
  onCancel,
  onSaved,
  submission,
}: {
  onCancel: () => void;
  onSaved: () => void;
  submission?: FacilitySubmission;
}) {
  const [draft, setDraft] = useState<SubmissionDraft>(() => toDraft(submission));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateDraft<Key extends keyof SubmissionDraft>(key: Key, value: SubmissionDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const name = draft.name.trim();
    const countryCode = draft.country_code.trim().toUpperCase();
    const longitudeText = draft.longitude.trim();
    const latitudeText = draft.latitude.trim();
    const longitude = Number(longitudeText);
    const latitude = Number(latitudeText);

    if (!name) {
      setErrorMessage('Enter the facility name.');
      return;
    }
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      setErrorMessage('Enter a two-letter country code, such as CA or US.');
      return;
    }
    if (
      !submission &&
      (!longitudeText ||
        !latitudeText ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90)
    ) {
      setErrorMessage('Enter valid coordinates: longitude −180 to 180, latitude −90 to 90.');
      return;
    }

    const rawWebsite = draft.website.trim();
    let website: string | null = null;
    if (rawWebsite) {
      try {
        const parsed = new URL(
          /^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`,
        );
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
          throw new Error('invalid host');
        }
        website = parsed.toString();
      } catch {
        setErrorMessage('Enter a valid website address.');
        return;
      }
    }

    const details: FacilitySubmissionDetails = {
      name,
      facility_type: draft.facility_type,
      address: toNullableText(draft.address),
      city: toNullableText(draft.city),
      region: toNullableText(draft.region),
      country_code: countryCode,
      postal_code: toNullableText(draft.postal_code),
      phone: toNullableText(draft.phone),
      website,
    };

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (submission) {
        await updateFacilitySubmission(submission.id, details);
      } else {
        const input: FacilitySubmissionFields = { ...details, longitude, latitude };
        await createFacilitySubmission(input);
      }
      onSaved();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to save this suggestion.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SurfaceCard style={styles.editor}>
      <ThemedView style={styles.editorHeader}>
        <ThemedText type="smallBold">
          {submission ? 'Edit pending suggestion' : 'Suggest a facility'}
        </ThemedText>
        <TextButton label="Cancel" onPress={onCancel} />
      </ThemedView>

      <Field
        accessibilityLabel="Facility name"
        labelText="Name"
        onChangeText={(value) => updateDraft('name', value)}
        value={draft.name}
      />
      <TypePicker
        onChange={(value) => updateDraft('facility_type', value)}
        value={draft.facility_type}
      />

      {!submission && (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Add the facility’s coordinates, not your current location. Longitude comes first.
          </ThemedText>
          <Field
            accessibilityLabel="Facility longitude"
            keyboardType="decimal-pad"
            labelText="Longitude"
            onChangeText={(value) => updateDraft('longitude', value)}
            placeholder="-123.1207"
            value={draft.longitude}
          />
          <Field
            accessibilityLabel="Facility latitude"
            keyboardType="decimal-pad"
            labelText="Latitude"
            onChangeText={(value) => updateDraft('latitude', value)}
            placeholder="49.2827"
            value={draft.latitude}
          />
        </>
      )}
      {submission && (
        <ThemedText type="small" themeColor="textSecondary">
          Location coordinates are not editable here. You can update the address and contact details.
        </ThemedText>
      )}

      <Field
        accessibilityLabel="Street address"
        labelText="Address (optional)"
        onChangeText={(value) => updateDraft('address', value)}
        value={draft.address}
      />
      <Field
        accessibilityLabel="City"
        labelText="City (optional)"
        onChangeText={(value) => updateDraft('city', value)}
        value={draft.city}
      />
      <Field
        accessibilityLabel="Region, state, or province"
        labelText="Region / state / province (optional)"
        onChangeText={(value) => updateDraft('region', value)}
        value={draft.region}
      />
      <Field
        accessibilityLabel="Two-letter country code"
        labelText="Country code"
        onChangeText={(value) => updateDraft('country_code', value.toUpperCase())}
        placeholder="CA"
        value={draft.country_code}
      />
      <Field
        accessibilityLabel="Postal code"
        labelText="Postal code (optional)"
        onChangeText={(value) => updateDraft('postal_code', value)}
        value={draft.postal_code}
      />
      <Field
        accessibilityLabel="Facility phone number"
        keyboardType="phone-pad"
        labelText="Phone (optional)"
        onChangeText={(value) => updateDraft('phone', value)}
        value={draft.phone}
      />
      <Field
        accessibilityLabel="Facility website"
        keyboardType="url"
        labelText="Website (optional)"
        onChangeText={(value) => updateDraft('website', value)}
        value={draft.website}
      />

      {errorMessage && <InlineMessage tone="danger">{errorMessage}</InlineMessage>}
      <PrimaryButton
        isLoading={isSubmitting}
        label={submission ? 'Save changes' : 'Submit for review'}
        onPress={() => void handleSave()}
      />
    </SurfaceCard>
  );
}

export default function SubmissionCenter() {
  const theme = useTheme();
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<FacilitySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<FacilitySubmission | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    function syncSession(userId: string | null, moderator: boolean) {
      if (currentUserId.current !== userId) {
        currentUserId.current = userId;
        setSubmissions([]);
        setEditingSubmission(null);
        setIsCreating(false);
        setIsLoading(Boolean(userId));
      }
      setAuthenticatedUserId(userId);
      setIsModerator(moderator);
      setIsAuthLoading(false);
      setAuthError(null);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user.id ?? null, session?.user.app_metadata?.is_moderator === true);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setAuthError(error.message);
        } else {
          syncSession(data.session?.user.id ?? null, data.session?.user.app_metadata?.is_moderator === true);
        }
        if (error) {
          setIsAuthLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthError(getErrorMessage(error, 'Unable to read your sign-in session.'));
          setIsAuthLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!authenticatedUserId) {
      return () => {
        active = false;
      };
    }

    async function loadSubmissions() {
      try {
        const rows = await getMyFacilitySubmissions();
        if (active) {
          setSubmissions(rows);
          setListError(null);
        }
      } catch (error) {
        if (active) {
          setListError(getErrorMessage(error, 'Unable to load your suggestions.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSubmissions();
    return () => {
      active = false;
    };
  }, [authenticatedUserId, refreshKey]);

  function onSaved() {
    setIsCreating(false);
    setEditingSubmission(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <PageLayout keyboardShouldPersistTaps="handled">
      <PageHeader
        description="Suggest places drivers rely on. Suggestions stay private until reviewed."
        eyebrow="Milebud"
        title="Contribute"
      />

      {authError && (
        <InlineMessage tone="danger">Account status is unavailable: {authError}</InlineMessage>
      )}

      {isAuthLoading ? (
        <ThemedView style={styles.message}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Checking your account…</ThemedText>
        </ThemedView>
      ) : !authenticatedUserId ? (
        <EmptyState
          description="Open the Account tab to sign in or create an account, then suggest places other drivers rely on."
          icon="person"
          title="Sign in to contribute"
        />
      ) : (
        <>
          {isModerator && (
            <ModerationQueue
              key={authenticatedUserId}
              onReviewed={() => setRefreshKey((key) => key + 1)}
            />
          )}
          {!isCreating && !editingSubmission && (
            <PrimaryButton label="Suggest a facility" onPress={() => setIsCreating(true)} />
          )}

          {isCreating && (
            <FacilitySubmissionEditor onCancel={() => setIsCreating(false)} onSaved={onSaved} />
          )}
          {editingSubmission && (
            <FacilitySubmissionEditor
              key={editingSubmission.id}
              onCancel={() => setEditingSubmission(null)}
              onSaved={onSaved}
              submission={editingSubmission}
            />
          )}

          <SectionHeader
            actionLabel="Refresh"
            onAction={() => setRefreshKey((key) => key + 1)}
            title="Your suggestions"
          />

          {isLoading ? (
            <ThemedView style={styles.message}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading suggestions…</ThemedText>
            </ThemedView>
          ) : listError ? (
            <EmptyState
              description={listError}
              icon="alert"
              title="Suggestions could not be loaded"
              tone="danger"
            />
          ) : submissions.length === 0 ? (
            <EmptyState
              description="Places you submit for review will appear here."
              icon="pin"
              title="No suggestions yet"
            />
          ) : (
            <ThemedView style={styles.submissionList}>
              {submissions.map((submission) => (
                <SurfaceCard key={submission.id}>
                  <ThemedView style={styles.submissionHeader}>
                    <ThemedView style={styles.submissionTitle}>
                      <ThemedText type="smallBold">{submission.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {label(submission.facility_type)} ·{' '}
                        {[submission.city, submission.country_code].filter(Boolean).join(', ')}
                      </ThemedText>
                    </ThemedView>
                    <StatusPill
                      label={label(submission.status)}
                      tone={statusTone[submission.status] ?? 'neutral'}
                    />
                  </ThemedView>
                  {submission.status === 'pending' && (
                    <TextButton
                      label="Edit pending suggestion"
                      onPress={() => {
                        setIsCreating(false);
                        setEditingSubmission(submission);
                      }}
                    />
                  )}
                </SurfaceCard>
              ))}
            </ThemedView>
          )}
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: Spacing.three,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    gap: Spacing.two,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  message: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  submissionList: {
    gap: Spacing.three,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  submissionTitle: {
    flex: 1,
    gap: Spacing.one,
  },
});
