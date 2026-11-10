import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  IconTile,
  InlineMessage,
  PageHeader,
  PageLayout,
  SecondaryButton,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextButton,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import {
  getActiveFacilityReports,
  getFacilityAmenities,
  getFacilityDetail,
} from '@/features/facilities/api';
import type { FacilityDetail } from '@/features/facilities/types';
import {
  facilityTypeIcon,
  label,
  reportAge,
  reportExpiry,
  reportSummary,
  reportTone,
} from '@/features/facility-reports/presentation';
import { ReportComposer, ReportFeedback } from '@/features/facility-reports/report-actions';
import type { FacilityReport } from '@/features/facility-reports/types';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { FacilityAmenity } from '@/types/database.types';

function errorText(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string') {
    return error.message;
  }
  return 'Unable to load facility details.';
}

export default function FacilityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [amenities, setAmenities] = useState<FacilityAmenity[]>([]);
  const [reports, setReports] = useState<FacilityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedId, setLoadedId] = useState<string | undefined | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [composing, setComposing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setAuthError(null);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthenticated(Boolean(data.session));
      }
    }).catch((error: unknown) => {
      if (active) setAuthError(errorText(error));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (typeof id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          throw new Error('This facility link is invalid.');
        }
        const row = await getFacilityDetail(id);
        const [facilityAmenities, facilityReports] = row
          ? await Promise.all([getFacilityAmenities(id), getActiveFacilityReports([id])])
          : [[], []];
        if (active) {
          setFacility(row);
          setAmenities(facilityAmenities);
          setReports(facilityReports);
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) setErrorMessage(errorText(error));
      } finally {
        if (active) {
          setLoadedId(id);
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [id, refreshKey]);

  function refresh() {
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <PageLayout keyboardShouldPersistTaps="handled">
      <TextButton label="Back to facilities" onPress={goBack} />
      {isLoading || loadedId !== id ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Loading facility…</ThemedText>
        </View>
      ) : errorMessage ? (
        <>
          <EmptyState description={errorMessage} icon="alert" title="Unable to load facility" tone="danger" />
          <SecondaryButton label="Try again" onPress={refresh} />
        </>
      ) : !facility ? (
        <EmptyState
          description="This facility may not be available or approved."
          icon="pin"
          title="Facility not found"
        />
      ) : (
        <>
          <PageHeader eyebrow={label(facility.facility_type)} title={facility.name} />
          <SurfaceCard style={styles.card}>
            <View style={styles.heading}>
              <IconTile name={facilityTypeIcon(facility.facility_type)} />
              <View style={styles.headingText}>
                <ThemedText type="smallBold">Facility information</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[facility.city, facility.region, facility.country_code].filter(Boolean).join(', ')}
                </ThemedText>
              </View>
            </View>
            {!!facility.address && <ThemedText>{facility.address}</ThemedText>}
            {!!facility.postal_code && <ThemedText>{facility.postal_code}</ThemedText>}
            {!!facility.phone && <ThemedText>Phone: {facility.phone}</ThemedText>}
            {!!facility.website && <ThemedText>Website: {facility.website}</ThemedText>}
          </SurfaceCard>

          <SectionHeader title="Listed amenities" />
          <SurfaceCard>
            {amenities.length ? (
              <View style={styles.pills}>
                {amenities.map((amenity) => <StatusPill key={amenity} label={label(amenity)} />)}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No amenities listed yet. This does not mean they are unavailable.
              </ThemedText>
            )}
          </SurfaceCard>

          <SectionHeader title="Current driver reports" actionLabel="Refresh" onAction={refresh} />
          <ThemedText type="small" themeColor="textSecondary">
            Driver-submitted conditions expire and may change. Check timestamps before relying on them.
          </ThemedText>
          {authError && <InlineMessage tone="danger">Account status is unavailable: {authError}</InlineMessage>}
          {reports.length === 0 ? (
            <SurfaceCard>
              <ThemedText type="small" themeColor="textSecondary">No active reports for this facility.</ThemedText>
            </SurfaceCard>
          ) : reports.map((report) => (
            <SurfaceCard key={report.id} style={styles.card}>
              <View style={styles.reportHeader}>
                <StatusPill label={reportSummary(report)} tone={reportTone(report)} />
                <ThemedText type="small" themeColor="textSecondary">{reportAge(report.created_at)}</ThemedText>
              </View>
              {!!report.details && <ThemedText type="small">{report.details}</ThemedText>}
              <ThemedText type="small" themeColor="textSecondary">
                {report.confirmation_count} confirmed · {report.dispute_count} disputed · {reportExpiry(report.expires_at)}
              </ThemedText>
              {authenticated && <ReportFeedback report={report} />}
            </SurfaceCard>
          ))}
          {authenticated ? (
            composing ? (
              <ReportComposer
                facilityId={facility.id}
                isAuthenticated={authenticated}
                onCancel={() => setComposing(false)}
                onSubmitted={() => { setComposing(false); refresh(); }}
              />
            ) : (
              <SecondaryButton label="Share an update" onPress={() => setComposing(true)} />
            )
          ) : !authError && (
            <TextButton label="Sign in to share an update" onPress={() => router.push('/account')} />
          )}
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  card: { gap: Spacing.three },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headingText: { flex: 1, gap: Spacing.half },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
});
