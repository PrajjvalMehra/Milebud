import type { IconName, Tone } from '@/components/ui/primitives';
import type { FacilityType } from '@/types/database.types';

import type { FacilityReport } from './types';

export function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function reportSummary(report: FacilityReport) {
  switch (report.report_type) {
    case 'parking_availability':
      return `Parking ${label(report.parking_status ?? 'reported')}`;
    case 'congestion':
      return `Traffic ${label(report.congestion_level ?? 'reported')}`;
    case 'amenity_availability':
      return `${label(report.amenity ?? 'Amenity')}: ${label(report.amenity_status ?? 'reported')}`;
    case 'fuel_availability':
      return `Fuel ${label(report.fuel_status ?? 'reported')}`;
    case 'wait_time':
      return `Wait time ${report.wait_time_minutes ?? '—'} min`;
    case 'facility_condition':
    case 'access_condition':
      return `${label(report.condition_category ?? report.report_type)}: ${label(report.condition_status ?? 'reported')}`;
  }
}

export function reportTone(report: FacilityReport): Tone {
  switch (report.report_type) {
    case 'parking_availability':
      if (!report.parking_status) return 'neutral';
      return report.parking_status === 'available'
        ? 'success'
        : report.parking_status === 'limited'
          ? 'warning'
          : 'danger';
    case 'congestion':
      if (!report.congestion_level) return 'neutral';
      return report.congestion_level === 'light'
        ? 'success'
        : report.congestion_level === 'moderate'
          ? 'warning'
          : 'danger';
    case 'amenity_availability':
      return statusTone(report.amenity_status);
    case 'fuel_availability':
      return statusTone(report.fuel_status);
    case 'wait_time': {
      if (report.wait_time_minutes === null) return 'neutral';
      const minutes = report.wait_time_minutes;
      return minutes <= 30 ? 'success' : minutes <= 60 ? 'warning' : 'danger';
    }
    case 'facility_condition':
    case 'access_condition':
      if (!report.condition_status) return 'neutral';
      return report.condition_status === 'good'
        ? 'success'
        : report.condition_status === 'fair'
          ? 'warning'
          : 'danger';
  }
}

function statusTone(status: string | null): Tone {
  if (!status) return 'neutral';
  return status === 'available' ? 'success' : status === 'limited' ? 'warning' : 'danger';
}

export function facilityTypeIcon(type: FacilityType): IconName {
  switch (type) {
    case 'truck_stop':
      return 'truck';
    case 'fuel_station':
      return 'fuel';
    case 'parking_facility':
      return 'parking';
    case 'rest_area':
      return 'rest';
    case 'repair_shop':
      return 'repair';
    case 'weigh_station':
      return 'scale';
    case 'shipper':
    case 'receiver':
      return 'warehouse';
    case 'other':
      return 'pin';
  }
}

export function reportAge(createdAt: string) {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (ageMinutes < 1) {
    return 'Just now';
  }
  if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  }
  const ageHours = Math.floor(ageMinutes / 60);
  return `${ageHours} hr${ageHours === 1 ? '' : 's'} ago`;
}

export function reportExpiry(expiresAt: string) {
  const minutesRemaining = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000),
  );
  if (minutesRemaining < 60) {
    return `Expires in ${minutesRemaining} min`;
  }
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  const extraMinutes = minutesRemaining % 60;
  return extraMinutes > 0
    ? `Expires in ${hoursRemaining} hr ${extraMinutes} min`
    : `Expires in ${hoursRemaining} hr`;
}
