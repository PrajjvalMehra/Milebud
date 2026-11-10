import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Chip,
  ChipRow,
  EmptyState,
  Icon,
  IconTile,
  InlineMessage,
  PageHeader,
  PageLayout,
  SearchField,
  SecondaryButton,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextButton,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { getActiveFacilityReports, getApprovedFacilities } from '@/features/facilities/api';
import { FacilityMap } from '@/features/facilities/facility-map';
import type { Facility } from '@/features/facilities/types';
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
import type { FacilityType } from '@/types/database.types';

const filters: { label: string; types: FacilityType[] | null }[] = [
  { label: 'All', types: null },
  { label: 'Truck stops', types: ['truck_stop'] },
  { label: 'Parking', types: ['parking_facility', 'rest_area'] },
  { label: 'Fuel', types: ['fuel_station'] },
  { label: 'Repair', types: ['repair_shop'] },
  { label: 'Weigh stations', types: ['weigh_station'] },
];

function facilityLocation(facility: Facility) {
  return [facility.city, facility.region, facility.country_code].filter(Boolean).join(', ');
}

function headlineReports(reports: FacilityReport[]) {
  const seen = new Set<string>();
  const headlines: FacilityReport[] = [];
  for (const report of reports) {
    const key = `${report.report_type}:${report.amenity ?? report.condition_category ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      headlines.push(report);
    }
  }
  return headlines.slice(0, 3);
}

export default function HomeScreen() {
  const theme = useTheme();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reports, setReports] = useState<FacilityReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterIndex, setFilterIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated' | 'error'
  >('loading');
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [composingFacilityId, setComposingFacilityId] = useState<string | null>(null);
  const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
      setAuthErrorMessage(null);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setAuthStatus('error');
          setAuthErrorMessage(error.message);
        } else {
          setAuthStatus(data.session ? 'authenticated' : 'unauthenticated');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthStatus('error');
          setAuthErrorMessage(
            error instanceof Error ? error.message : 'Unable to read your sign-in session.',
          );
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadFacilities() {
      try {
        const { facilities: facilityRows, hasNextPage: nextPage } = await getApprovedFacilities({
          search,
          types: filters[filterIndex].types,
          page,
        });
        const reportRows = await getActiveFacilityReports(facilityRows.map(({ id }) => id));
        if (active) {
          setFacilities(facilityRows);
          setReports(reportRows);
          setHasNextPage(nextPage);
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load facilities.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    const timer = setTimeout(() => void loadFacilities(), 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refreshKey, search, filterIndex, page]);

  const reportsByFacility = useMemo(() => {
    const grouped = new Map<string, FacilityReport[]>();
    const newestFirst = [...reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const report of newestFirst) {
      const current = grouped.get(report.facility_id) ?? [];
      current.push(report);
      grouped.set(report.facility_id, current);
    }
    return grouped;
  }, [reports]);

  function refresh() {
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  }

  const isFiltering = Boolean(search.trim()) || filterIndex !== 0;

  return (
    <PageLayout keyboardShouldPersistTaps="handled">
      <PageHeader
        description="Live parking, fuel, and conditions reported by drivers."
        eyebrow="Milebud"
        title="Find your next stop"
      />

      <SearchField
        accessibilityLabel="Search facilities by name, city, or region"
        onChangeText={(value) => {
          if (value !== search) {
            setIsLoading(true);
            setPage(0);
            setSearch(value);
          }
        }}
        placeholder="Search name, city, or region"
        value={search}
      />

      <ChipRow>
        {filters.map((filter, index) => (
          <Chip
            key={filter.label}
            label={filter.label}
            onPress={() => {
              if (index !== filterIndex) {
                setIsLoading(true);
                setPage(0);
                setFilterIndex(index);
              }
            }}
            selected={filterIndex === index}
          />
        ))}
      </ChipRow>

      <FacilityMap facilities={isLoading || errorMessage ? [] : facilities} />

      {authErrorMessage && (
        <InlineMessage tone="danger">
          Account status is unavailable: {authErrorMessage}
        </InlineMessage>
      )}

      {authStatus === 'unauthenticated' && (
        <SurfaceCard style={styles.promptCard}>
          <IconTile name="group" tone="primary" />
          <View style={styles.promptText}>
            <ThemedText type="smallBold">Help other drivers</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sign in to share parking and fuel updates.
            </ThemedText>
          </View>
          <TextButton label="Sign in" onPress={() => router.push('/account')} />
        </SurfaceCard>
      )}

      <SectionHeader
        actionLabel="Refresh"
        onAction={refresh}
        title={isFiltering ? 'Search results' : 'Facilities'}
      />

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Loading facilities…</ThemedText>
        </View>
      ) : errorMessage ? (
        <EmptyState
          description={errorMessage}
          icon="alert"
          title="Facilities could not be loaded"
          tone="danger"
        />
      ) : facilities.length === 0 ? (
        <EmptyState
          description={
            isFiltering
              ? 'Try another search or filter.'
              : 'Approved places and recent driver updates will appear here.'
          }
          icon={isFiltering ? 'search' : 'pin'}
          title={isFiltering ? 'No matching facilities' : 'No approved facilities yet'}
        />
      ) : (
        <View style={styles.facilityList}>
          {facilities.map((facility) => {
            const facilityReports = reportsByFacility.get(facility.id) ?? [];
            const isExpanded = expandedFacilityId === facility.id;
            const location = facilityLocation(facility);

            return (
              <SurfaceCard key={facility.id} style={styles.facilityCard}>
                <View style={styles.facilityHeader}>
                  <IconTile name={facilityTypeIcon(facility.facility_type)} />
                  <View style={styles.facilityTitle}>
                    <ThemedText type="smallBold" style={styles.facilityName}>
                      {facility.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[label(facility.facility_type), location].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                </View>

                {!!facility.address && (
                  <View style={styles.addressRow}>
                    <Icon color={theme.textSecondary} name="pin" size={16} />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.addressText}>
                      {facility.address}
                    </ThemedText>
                  </View>
                )}

                <TextButton
                  label="Facility details"
                  onPress={() =>
                    router.push({ pathname: '/facility/[id]', params: { id: facility.id } })
                  }
                />

                {facilityReports.length > 0 ? (
                  <View style={styles.pills}>
                    {headlineReports(facilityReports).map((report) => (
                      <StatusPill
                        key={report.id}
                        label={reportSummary(report)}
                        tone={reportTone(report)}
                      />
                    ))}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No recent driver reports
                  </ThemedText>
                )}

                {isExpanded &&
                  facilityReports.map((report) => (
                    <View
                      key={report.id}
                      style={[styles.report, { borderTopColor: theme.backgroundSelected }]}>
                      <View style={styles.reportHeader}>
                        <StatusPill label={reportSummary(report)} tone={reportTone(report)} />
                        <ThemedText type="small" themeColor="textSecondary">
                          {reportAge(report.created_at)}
                        </ThemedText>
                      </View>
                      {!!report.details && <ThemedText type="small">{report.details}</ThemedText>}
                      <ThemedText type="small" themeColor="textSecondary">
                        {report.confirmation_count} confirmed · {report.dispute_count} disputed ·{' '}
                        {reportExpiry(report.expires_at)}
                      </ThemedText>
                      {authStatus === 'authenticated' && <ReportFeedback report={report} />}
                    </View>
                  ))}

                {facilityReports.length > 0 && (
                  <TextButton
                    label={
                      isExpanded
                        ? 'Hide reports'
                        : `View ${facilityReports.length} report${facilityReports.length === 1 ? '' : 's'}`
                    }
                    onPress={() => setExpandedFacilityId(isExpanded ? null : facility.id)}
                  />
                )}

                {authStatus === 'authenticated' && composingFacilityId !== facility.id && (
                  <SecondaryButton
                    label="Share an update"
                    onPress={() => setComposingFacilityId(facility.id)}
                  />
                )}
                {composingFacilityId === facility.id && (
                  <ReportComposer
                    facilityId={facility.id}
                    isAuthenticated={authStatus === 'authenticated'}
                    onCancel={() => setComposingFacilityId(null)}
                    onSubmitted={() => {
                      setComposingFacilityId(null);
                      refresh();
                    }}
                  />
                )}
              </SurfaceCard>
            );
          })}
        </View>
      )}
      {!isLoading && !errorMessage && (page > 0 || hasNextPage) && (
        <View style={styles.pagination}>
          <TextButton
            disabled={page === 0}
            label="Previous"
            onPress={() => {
              setIsLoading(true);
              setPage((current) => current - 1);
            }}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Page {page + 1}
          </ThemedText>
          <TextButton
            disabled={!hasNextPage}
            label="Next"
            onPress={() => {
              setIsLoading(true);
              setPage((current) => current + 1);
            }}
          />
        </View>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  promptText: {
    flex: 1,
    gap: Spacing.half,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  facilityList: {
    gap: Spacing.three,
  },
  facilityCard: {
    gap: Spacing.three,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  facilityTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  facilityName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addressText: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  report: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
