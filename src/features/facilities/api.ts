import { supabase } from '@/lib/supabase';

import type { Facility, FacilityDetail } from './types';
import type { FacilityReport } from '@/features/facility-reports/types';
import type { FacilityAmenity, FacilityType } from '@/types/database.types';

const facilityColumns = 'id, name, facility_type, address, city, region, country_code';
const facilityDetailColumns = `${facilityColumns}, postal_code, phone, website`;
const reportColumns =
  'id, facility_id, report_type, parking_status, congestion_level, amenity, amenity_status, fuel_status, wait_time_minutes, condition_category, condition_status, details, confirmation_count, dispute_count, created_at, expires_at';

export const FACILITY_PAGE_SIZE = 20;

export async function getFacilityCoordinates(id: string): Promise<{ latitude: number; longitude: number }> {
  const { data, error } = await supabase
    .from('facilities')
    .select('id,location')
    .eq('status', 'approved')
    .eq('id', id)
    .geojson();

  if (error) throw error;
  const features = data.features;
  if (!Array.isArray(features) || features.length !== 1) {
    throw new Error('Facility location is unavailable.');
  }
  const geometry: unknown = features[0]?.geometry;
  if (typeof geometry !== 'object' || geometry === null ||
      !('type' in geometry) || geometry.type !== 'Point' ||
      !('coordinates' in geometry) || !Array.isArray(geometry.coordinates)) {
    throw new Error('Facility location is invalid.');
  }
  const [longitude, latitude] = geometry.coordinates;
  if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
      !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
      longitude < -180 || longitude > 180 || latitude < -85 || latitude > 85) {
    throw new Error('Facility location is outside the supported map area.');
  }
  return { latitude, longitude };
}

export async function getApprovedFacilities({
  search,
  types,
  page,
}: {
  search: string;
  types: FacilityType[] | null;
  page: number;
}): Promise<{ facilities: Facility[]; hasNextPage: boolean }> {
  let query = supabase
    .from('facilities')
    .select(facilityColumns)
    .eq('status', 'approved')
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(page * FACILITY_PAGE_SIZE, (page + 1) * FACILITY_PAGE_SIZE);

  if (types?.length) {
    query = query.in('facility_type', types);
  }
  const term = search.trim();
  if (term) {
    // Quote the PostgREST value and escape LIKE wildcards as well as filter delimiters.
    const likeLiteral = term.replace(/[\\%_]/g, '\\$&');
    const escaped = likeLiteral.replace(/[\\"]/g, '\\$&');
    const pattern = `"%${escaped}%"`;
    query = query.or(
      `name.ilike.${pattern},city.ilike.${pattern},region.ilike.${pattern},country_code.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    facilities: data.slice(0, FACILITY_PAGE_SIZE),
    hasNextPage: data.length > FACILITY_PAGE_SIZE,
  };
}

export async function getFacilityDetail(id: string): Promise<FacilityDetail | null> {
  const { data, error } = await supabase
    .from('facilities')
    .select(facilityDetailColumns)
    .eq('status', 'approved')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function getFacilityAmenities(id: string): Promise<FacilityAmenity[]> {
  const { data, error } = await supabase
    .from('facility_amenities')
    .select('amenity')
    .eq('facility_id', id)
    .order('amenity');

  if (error) {
    throw error;
  }
  return data.map(({ amenity }) => amenity);
}

export async function getActiveFacilityReports(
  facilityIds: string[],
): Promise<FacilityReport[]> {
  if (facilityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('facility_reports')
    .select(reportColumns)
    .in('facility_id', facilityIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
