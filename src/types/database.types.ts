export type FacilityReportType =
  | 'parking_availability'
  | 'congestion'
  | 'amenity_availability'
  | 'fuel_availability'
  | 'wait_time'
  | 'facility_condition'
  | 'access_condition';

export type FacilityType =
  | 'truck_stop'
  | 'shipper'
  | 'receiver'
  | 'rest_area'
  | 'weigh_station'
  | 'fuel_station'
  | 'repair_shop'
  | 'parking_facility'
  | 'other';
export type FacilityStatus = 'pending' | 'approved' | 'rejected' | 'inactive';
export type FacilityAmenity = AmenityType;
export type ParkingStatus = 'available' | 'limited' | 'full';
export type CongestionLevel = 'light' | 'moderate' | 'heavy' | 'standstill';
export type AmenityType =
  | 'truck_parking'
  | 'free_parking'
  | 'paid_parking'
  | 'showers'
  | 'restrooms'
  | 'restaurant'
  | 'fuel'
  | 'ev_charging'
  | 'laundry'
  | 'wifi'
  | 'security'
  | 'overnight_parking'
  | 'repair_service'
  | 'scales';
export type AmenityStatus = 'available' | 'limited' | 'unavailable';
export type FuelStatus = 'available' | 'limited' | 'unavailable';
export type ConditionCategory =
  | 'parking_area'
  | 'restrooms'
  | 'showers'
  | 'access_road'
  | 'security'
  | 'cleanliness'
  | 'lighting'
  | 'other';
export type ConditionStatus = 'good' | 'fair' | 'poor' | 'closed';
export type ReportFeedbackType = 'confirm' | 'dispute';
export type ReportModerationStatus = 'visible' | 'under_review' | 'hidden';

export interface Database {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          facility_type: FacilityType;
          location: unknown;
          address: string | null;
          city: string | null;
          region: string | null;
          country_code: string;
          postal_code: string | null;
          phone: string | null;
          website: string | null;
          status: FacilityStatus;
          submitted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          facility_type: FacilityType;
          location: unknown;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          country_code: string;
          postal_code?: string | null;
          phone?: string | null;
          website?: string | null;
          status?: FacilityStatus;
          submitted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          facility_type?: FacilityType;
          location?: unknown;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          country_code?: string;
          postal_code?: string | null;
          phone?: string | null;
          website?: string | null;
          status?: FacilityStatus;
          submitted_by?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Relationships: [];
      };
      private_profiles: {
        Row: {
          user_id: string;
          real_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          real_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          real_name?: string | null;
        };
        Relationships: [];
      };
      facility_amenities: {
        Row: {
          id: string;
          facility_id: string;
          amenity: FacilityAmenity;
          created_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          amenity: FacilityAmenity;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'facility_amenities_facility_id_fkey';
            columns: ['facility_id'];
            isOneToOne: false;
            referencedRelation: 'facilities';
            referencedColumns: ['id'];
          },
        ];
      };
      facility_submissions: {
        Row: {
          id: string;
          submitted_by: string;
          name: string;
          facility_type: FacilityType;
          location: unknown;
          address: string | null;
          city: string | null;
          region: string | null;
          country_code: string;
          postal_code: string | null;
          phone: string | null;
          website: string | null;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          approved_facility_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submitted_by: string;
          name: string;
          facility_type: FacilityType;
          location: unknown;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          country_code: string;
          postal_code?: string | null;
          phone?: string | null;
          website?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          approved_facility_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          facility_type?: FacilityType;
          location?: unknown;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          country_code?: string;
          postal_code?: string | null;
          phone?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      facility_reports: {
        Row: {
          id: string;
          facility_id: string;
          submitted_by: string;
          report_type: FacilityReportType;
          parking_status: ParkingStatus | null;
          congestion_level: CongestionLevel | null;
          amenity: AmenityType | null;
          amenity_status: AmenityStatus | null;
          fuel_status: FuelStatus | null;
          wait_time_minutes: number | null;
          condition_category: ConditionCategory | null;
          condition_status: ConditionStatus | null;
          details: string | null;
          confirmation_count: number;
          dispute_count: number;
          moderation_status: ReportModerationStatus;
          moderated_by: string | null;
          moderated_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          facility_id: string;
          report_type: FacilityReportType;
          parking_status?: ParkingStatus | null;
          congestion_level?: CongestionLevel | null;
          amenity?: AmenityType | null;
          amenity_status?: AmenityStatus | null;
          fuel_status?: FuelStatus | null;
          wait_time_minutes?: number | null;
          condition_category?: ConditionCategory | null;
          condition_status?: ConditionStatus | null;
          details?: string | null;
        };
        Update: {
          moderation_status?: ReportModerationStatus;
          moderated_by?: string | null;
          moderated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'facility_reports_facility_id_fkey';
            columns: ['facility_id'];
            isOneToOne: false;
            referencedRelation: 'facilities';
            referencedColumns: ['id'];
          },
        ];
      };
      facility_report_feedback: {
        Row: {
          report_id: string;
          user_id: string;
          feedback_type: ReportFeedbackType;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          report_id: string;
          feedback_type: ReportFeedbackType;
          reason?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'facility_report_feedback_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'facility_reports';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      pending_facility_reviews: {
        Args: { page_offset?: number };
        Returns: {
          id: string;
          name: string;
          facility_type: FacilityType;
          address: string | null;
          city: string | null;
          region: string | null;
          country_code: string;
          postal_code: string | null;
          phone: string | null;
          website: string | null;
          latitude: number;
          longitude: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      review_facility_submission: {
        Args: { submission_id: string; decision: string; expected_updated_at: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
