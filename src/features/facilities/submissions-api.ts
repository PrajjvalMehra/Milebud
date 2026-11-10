import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

import type {
  FacilitySubmission,
  FacilitySubmissionDetails,
  FacilitySubmissionFields,
} from './submissions-types';

const submissionColumns =
  'id, name, facility_type, address, city, region, country_code, postal_code, phone, website, status, created_at, updated_at';

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }
  if (!user) {
    throw new Error('Sign in before submitting a facility suggestion.');
  }

  return user.id;
}

function toRow(
  input: FacilitySubmissionFields,
): Omit<Database['public']['Tables']['facility_submissions']['Insert'], 'submitted_by'> {
  return {
    name: input.name,
    facility_type: input.facility_type,
    location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
    address: input.address,
    city: input.city,
    region: input.region,
    country_code: input.country_code,
    postal_code: input.postal_code,
    phone: input.phone,
    website: input.website,
  };
}

export async function getMyFacilitySubmissions(): Promise<FacilitySubmission[]> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('facility_submissions')
    .select(submissionColumns)
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data;
}

export async function createFacilitySubmission(
  input: FacilitySubmissionFields,
): Promise<FacilitySubmission> {
  const userId = await getAuthenticatedUserId();
  const row: Database['public']['Tables']['facility_submissions']['Insert'] = {
    ...toRow(input),
    submitted_by: userId,
  };
  const { data, error } = await supabase
    .from('facility_submissions')
    .insert(row)
    .select(submissionColumns)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateFacilitySubmission(
  id: string,
  input: FacilitySubmissionDetails,
): Promise<FacilitySubmission> {
  await getAuthenticatedUserId();
  const editableFields: Database['public']['Tables']['facility_submissions']['Update'] = {
    name: input.name,
    facility_type: input.facility_type,
    address: input.address,
    city: input.city,
    region: input.region,
    country_code: input.country_code,
    postal_code: input.postal_code,
    phone: input.phone,
    website: input.website,
  };
  const { data, error } = await supabase
    .from('facility_submissions')
    .update(editableFields)
    .eq('id', id)
    .eq('status', 'pending')
    .select(submissionColumns)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('This suggestion is no longer pending or is unavailable.');
  }

  return data;
}
