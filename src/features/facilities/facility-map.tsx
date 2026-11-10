import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow, InlineMessage, SectionHeader, TextButton } from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';

import { getFacilityCoordinates } from './api';
import { MapFrame } from './map-frame';
import type { Facility } from './types';

type Coordinates = { latitude: number; longitude: number };
type Result = { id: string; coordinates: Coordinates } | { id: string; error: string };

function mapUrl(coordinates?: Coordinates) {
  const bbox = coordinates
    ? [
        Math.max(-180, coordinates.longitude - 0.05),
        Math.max(-85, coordinates.latitude - 0.03),
        Math.min(180, coordinates.longitude + 0.05),
        Math.min(85, coordinates.latitude + 0.03),
      ]
    : [-130, 24, -60, 54];
  const params = new URLSearchParams({ bbox: bbox.join(','), layer: 'mapnik' });
  if (coordinates) {
    params.set('marker', `${coordinates.latitude},${coordinates.longitude}`);
  }
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

export function FacilityMap({ facilities }: { facilities: Facility[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const selected = facilities.find((facility) => facility.id === selectedId);
  const currentResult = result?.id === selected?.id ? result : null;

  useEffect(() => {
    if (!selected) return;
    let active = true;
    void getFacilityCoordinates(selected.id)
      .then((coordinates) => {
        if (active) setResult({ id: selected.id, coordinates });
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            id: selected.id,
            error: typeof error === 'object' && error !== null && 'message' in error &&
              typeof error.message === 'string'
              ? error.message
              : 'Unable to load facility location.',
          });
        }
      });
    return () => { active = false; };
  }, [selected, retryKey]);

  const coordinates = currentResult && 'coordinates' in currentResult
    ? currentResult.coordinates
    : undefined;

  return (
    <View style={styles.container}>
      <SectionHeader title="Map" />
      <ThemedText type="small" themeColor="textSecondary">
        Select a facility from this page to show its pin. Moving the map does not change the results.
      </ThemedText>
      <MapFrame url={mapUrl(coordinates)} />
      {facilities.length > 0 && (
        <ChipRow>
          {facilities.map((facility) => (
            <Chip
              key={facility.id}
              label={facility.name}
              selected={selected?.id === facility.id}
              onPress={() => setSelectedId(facility.id)}
            />
          ))}
        </ChipRow>
      )}
      {selected && !currentResult && (
        <ThemedText type="small" themeColor="textSecondary">Loading facility location…</ThemedText>
      )}
      {currentResult && 'error' in currentResult && (
        <>
          <InlineMessage tone="danger">{currentResult.error}</InlineMessage>
          <TextButton
            label="Retry location"
            onPress={() => {
              setResult(null);
              setRetryKey((key) => key + 1);
            }}
          />
        </>
      )}
      {selected && coordinates && (
        <TextButton
          label={`View details for ${selected.name}`}
          onPress={() => router.push({ pathname: '/facility/[id]', params: { id: selected.id } })}
        />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Map data © OpenStreetMap contributors. Map requests are sent to OpenStreetMap.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
});
