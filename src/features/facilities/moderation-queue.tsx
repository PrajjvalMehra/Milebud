import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  EmptyState, InlineMessage, PrimaryButton, SecondaryButton, SectionHeader, SurfaceCard, TextButton,
} from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type ReviewItem = Database['public']['Functions']['pending_facility_reviews']['Returns'][number];
type Decision = 'approved' | 'rejected';
const PAGE_SIZE = 20;

function message(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string') return error.message;
  return 'The review request failed. Please try again.';
}

export function ModerationQueue({ onReviewed }: { onReviewed: () => void }) {
  const theme = useTheme();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [review, setReview] = useState<{ id: string; decision: Decision } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: requestError } = await supabase.rpc('pending_facility_reviews', {
          page_offset: page * PAGE_SIZE,
        });
        if (!active) return;
        if (requestError) {
          setError(message(requestError));
        } else {
          setItems(data.slice(0, PAGE_SIZE));
          setHasNext(data.length > PAGE_SIZE && page < 500);
          setError(null);
        }
        setLoading(false);
      } catch (requestError) {
        if (active) {
          setError(message(requestError));
          setLoading(false);
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [page, refresh]);

  function reload() {
    setReview(null);
    setLoading(true);
    setRefresh((value) => value + 1);
  }

  async function submit(item: ReviewItem, decision: Decision) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error: requestError } = await supabase.rpc('review_facility_submission', {
        submission_id: item.id,
        decision,
        expected_updated_at: item.updated_at,
      });
      if (requestError) throw requestError;
      setNotice(decision === 'approved'
        ? 'Suggestion approved and published. Refresh Home to see it.'
        : 'Suggestion rejected.');
      setReview(null);
      setLoading(true);
      setPage(0);
      setRefresh((value) => value + 1);
      onReviewed();
    } catch (requestError) {
      setError(message(requestError));
      setReview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <SectionHeader title="Moderator review" actionLabel="Refresh" onAction={reload} />
      <ThemedText type="small" themeColor="textSecondary">
        Review details and check for duplicates before approving. You cannot review your own suggestions.
      </ThemedText>
      {notice && <InlineMessage tone="success">{notice}</InlineMessage>}
      {error && <InlineMessage tone="danger">{error}</InlineMessage>}
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : items.length === 0 && !error ? (
        <EmptyState title="No suggestions to review" description="Pending suggestions from other drivers appear here." icon="check" />
      ) : !error && items.map((item) => (
        <SurfaceCard key={item.id}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.facility_type.replaceAll('_', ' ')} · {[item.city, item.region, item.country_code].filter(Boolean).join(', ')}
          </ThemedText>
          {!!item.address && <ThemedText type="small">Address: {item.address}</ThemedText>}
          {!!item.postal_code && <ThemedText type="small">Postal code: {item.postal_code}</ThemedText>}
          {!!item.phone && <ThemedText type="small">Phone: {item.phone}</ThemedText>}
          {!!item.website && <ThemedText type="small">Website: {item.website}</ThemedText>}
          <ThemedText type="small">Coordinates: {item.latitude}, {item.longitude}</ThemedText>
          {review?.id === item.id ? (
            <>
              <ThemedText type="smallBold">
                {review.decision === 'approved'
                  ? 'Publish this facility?'
                  : 'Reject this suggestion?'}
              </ThemedText>
              <PrimaryButton
                label={review.decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
                isLoading={busy}
                onPress={() => void submit(item, review.decision)}
              />
              <TextButton disabled={busy} label="Cancel" onPress={() => setReview(null)} />
            </>
          ) : (
            <>
              <PrimaryButton disabled={busy} label="Approve" onPress={() => setReview({ id: item.id, decision: 'approved' })} />
              <SecondaryButton disabled={busy} label="Reject" onPress={() => setReview({ id: item.id, decision: 'rejected' })} />
            </>
          )}
        </SurfaceCard>
      ))}
      {!loading && !error && (page > 0 || hasNext) && (
        <View style={styles.pagination}>
          <TextButton disabled={page === 0 || busy} label="Previous" onPress={() => { setLoading(true); setReview(null); setPage((value) => value - 1); }} />
          <ThemedText type="small">Page {page + 1}</ThemedText>
          <TextButton disabled={!hasNext || busy} label="Next" onPress={() => { setLoading(true); setReview(null); setPage((value) => value + 1); }} />
        </View>
      )}
      {!loading && !error && page === 500 && (
        <ThemedText type="small" themeColor="textSecondary">
          The queue is limited to the first 10,020 suggestions. Review items or refresh to see newer ones.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
