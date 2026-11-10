import type { Database } from '@/types/database.types';

export type Facility = Pick<
  Database['public']['Tables']['facilities']['Row'],
  'id' | 'name' | 'facility_type' | 'address' | 'city' | 'region' | 'country_code'
>;

export type FacilityDetail = Facility &
  Pick<Database['public']['Tables']['facilities']['Row'], 'postal_code' | 'phone' | 'website'>;
