import type {
  AmenityType,
  AmenityStatus,
  CongestionLevel,
  ConditionCategory,
  ConditionStatus,
  FacilityReportType,
  FuelStatus,
  ParkingStatus,
} from '@/types/database.types';

type ReportBase = {
  facility_id: string;
  details?: string;
};

export type CreateFacilityReportInput =
  | (ReportBase & {
      report_type: 'parking_availability';
      parking_status: ParkingStatus;
    })
  | (ReportBase & {
      report_type: 'congestion';
      congestion_level: CongestionLevel;
    })
  | (ReportBase & {
      report_type: 'amenity_availability';
      amenity: AmenityType;
      amenity_status: AmenityStatus;
    })
  | (ReportBase & {
      report_type: 'fuel_availability';
      fuel_status: FuelStatus;
    })
  | (ReportBase & {
      report_type: 'wait_time';
      wait_time_minutes: number;
    })
  | (ReportBase & {
      report_type: Extract<FacilityReportType, 'facility_condition' | 'access_condition'>;
      condition_category: ConditionCategory;
      condition_status: ConditionStatus;
    });

export type FacilityReport = Pick<
  import('@/types/database.types').Database['public']['Tables']['facility_reports']['Row'],
  | 'id'
  | 'facility_id'
  | 'report_type'
  | 'parking_status'
  | 'congestion_level'
  | 'amenity'
  | 'amenity_status'
  | 'fuel_status'
  | 'wait_time_minutes'
  | 'condition_category'
  | 'condition_status'
  | 'details'
  | 'confirmation_count'
  | 'dispute_count'
  | 'created_at'
  | 'expires_at'
>;

export type FacilityReportFeedbackInput =
  | { report_id: string; feedback_type: 'confirm' }
  | { report_id: string; feedback_type: 'dispute'; reason: string };
