import type { Database, FacilityType } from '@/types/database.types';

export type FacilitySubmissionFields = {
  name: string;
  facility_type: FacilityType;
  longitude: number;
  latitude: number;
  address: string | null;
  city: string | null;
  region: string | null;
  country_code: string;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
};

export type FacilitySubmissionDetails = Omit<FacilitySubmissionFields, 'longitude' | 'latitude'>;

export type FacilitySubmission = Pick<
  Database['public']['Tables']['facility_submissions']['Row'],
  | 'id'
  | 'name'
  | 'facility_type'
  | 'address'
  | 'city'
  | 'region'
  | 'country_code'
  | 'postal_code'
  | 'phone'
  | 'website'
  | 'status'
  | 'created_at'
  | 'updated_at'
>;
