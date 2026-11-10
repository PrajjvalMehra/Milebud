import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

import type {
  CreateFacilityReportInput,
  FacilityReport,
  FacilityReportFeedbackInput,
} from './types';

const reportColumns =
  'id, facility_id, report_type, parking_status, congestion_level, amenity, amenity_status, fuel_status, wait_time_minutes, condition_category, condition_status, details, confirmation_count, dispute_count, created_at, expires_at';

export async function getFacilityReports(facilityId: string): Promise<FacilityReport[]> {
  const { data, error } = await supabase
    .from('facility_reports')
    .select(reportColumns)
    .eq('facility_id', facilityId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function submitFacilityReport(
  input: CreateFacilityReportInput,
): Promise<FacilityReport> {
  const row: Database['public']['Tables']['facility_reports']['Insert'] = input;
  const { data, error } = await supabase
    .from('facility_reports')
    .insert(row)
    .select(reportColumns)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitFacilityReportFeedback(
  input: FacilityReportFeedbackInput,
): Promise<void> {
  const row: Database['public']['Tables']['facility_report_feedback']['Insert'] = input;
  const { error } = await supabase.from('facility_report_feedback').insert(row);

  if (error) {
    throw error;
  }
}
