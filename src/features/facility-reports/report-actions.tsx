import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, InlineMessage, PrimaryButton, TextField } from '@/components/ui/primitives';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  submitFacilityReport,
  submitFacilityReportFeedback,
} from '@/features/facility-reports/api';
import type {
  CreateFacilityReportInput,
  FacilityReport,
} from '@/features/facility-reports/types';
import type {
  AmenityStatus,
  AmenityType,
  CongestionLevel,
  ConditionCategory,
  ConditionStatus,
  FacilityReportType,
  FuelStatus,
  ParkingStatus,
} from '@/types/database.types';

const reportTypes: FacilityReportType[] = [
  'parking_availability',
  'congestion',
  'amenity_availability',
  'fuel_availability',
  'wait_time',
  'facility_condition',
  'access_condition',
];

const parkingStatuses: ParkingStatus[] = ['available', 'limited', 'full'];
const congestionLevels: CongestionLevel[] = ['light', 'moderate', 'heavy', 'standstill'];
const amenityTypes: AmenityType[] = [
  'truck_parking',
  'free_parking',
  'paid_parking',
  'showers',
  'restrooms',
  'restaurant',
  'fuel',
  'ev_charging',
  'laundry',
  'wifi',
  'security',
  'overnight_parking',
  'repair_service',
  'scales',
];
const amenityStatuses: AmenityStatus[] = ['available', 'limited', 'unavailable'];
const fuelStatuses: FuelStatus[] = ['available', 'limited', 'unavailable'];
const conditionCategories: ConditionCategory[] = [
  'parking_area',
  'restrooms',
  'showers',
  'access_road',
  'security',
  'cleanliness',
  'lighting',
  'other',
];
const conditionStatuses: ConditionStatus[] = ['good', 'fair', 'poor', 'closed'];

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function ChoiceRow<T extends string>({
  labelText,
  onChange,
  options,
  value,
}: {
  labelText: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{labelText}</ThemedText>
      <ThemedView style={styles.choices}>
        {options.map((option) => (
          <Chip
            key={option}
            label={label(option)}
            onPress={() => onChange(option)}
            selected={option === value}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

export function ReportComposer({
  facilityId,
  isAuthenticated,
  onCancel,
  onSubmitted,
}: {
  facilityId: string;
  isAuthenticated: boolean;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [reportType, setReportType] = useState<FacilityReportType>('parking_availability');
  const [parkingStatus, setParkingStatus] = useState<ParkingStatus>('available');
  const [congestionLevel, setCongestionLevel] = useState<CongestionLevel>('light');
  const [amenity, setAmenity] = useState<AmenityType>('truck_parking');
  const [amenityStatus, setAmenityStatus] = useState<AmenityStatus>('available');
  const [fuelStatus, setFuelStatus] = useState<FuelStatus>('available');
  const [conditionCategory, setConditionCategory] = useState<ConditionCategory>('parking_area');
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>('good');
  const [waitTime, setWaitTime] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function getInput(): CreateFacilityReportInput | null {
    const common = {
      facility_id: facilityId,
      details: details.trim() || undefined,
    };

    switch (reportType) {
      case 'parking_availability':
        return { ...common, report_type: reportType, parking_status: parkingStatus };
      case 'congestion':
        return { ...common, report_type: reportType, congestion_level: congestionLevel };
      case 'amenity_availability':
        return {
          ...common,
          report_type: reportType,
          amenity,
          amenity_status: amenityStatus,
        };
      case 'fuel_availability':
        return { ...common, report_type: reportType, fuel_status: fuelStatus };
      case 'wait_time': {
        const value = waitTime.trim();
        const minutes = Number(value);
        if (!value || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
          setErrorMessage('Enter a whole number of minutes from 0 to 1440.');
          return null;
        }
        return { ...common, report_type: reportType, wait_time_minutes: minutes };
      }
      case 'facility_condition':
      case 'access_condition':
        return {
          ...common,
          report_type: reportType,
          condition_category: conditionCategory,
          condition_status: conditionStatus,
        };
    }
  }

  async function handleSubmit() {
    if (!isAuthenticated) {
      setErrorMessage('Sign in from the Account tab before posting a report.');
      return;
    }

    setErrorMessage(null);
    const input = getInput();
    if (!input) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFacilityReport(input);
      onSubmitted();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to submit this report.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView type="background" style={styles.composer}>
      <ThemedView style={styles.composerHeader}>
        <ThemedText type="smallBold">Share a current condition</ThemedText>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.textButton}>
          <ThemedText type="linkPrimary">Cancel</ThemedText>
        </Pressable>
      </ThemedView>

      {!isAuthenticated ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sign in from the Account tab before posting a report.
        </ThemedText>
      ) : (
        <>
          <ChoiceRow
            labelText="What are you reporting?"
            onChange={setReportType}
            options={reportTypes}
            value={reportType}
          />

          {reportType === 'parking_availability' && (
            <ChoiceRow
              labelText="Parking"
              onChange={setParkingStatus}
              options={parkingStatuses}
              value={parkingStatus}
            />
          )}
          {reportType === 'congestion' && (
            <ChoiceRow
              labelText="Traffic"
              onChange={setCongestionLevel}
              options={congestionLevels}
              value={congestionLevel}
            />
          )}
          {reportType === 'amenity_availability' && (
            <>
              <ChoiceRow
                labelText="Amenity"
                onChange={setAmenity}
                options={amenityTypes}
                value={amenity}
              />
              <ChoiceRow
                labelText="Availability"
                onChange={setAmenityStatus}
                options={amenityStatuses}
                value={amenityStatus}
              />
            </>
          )}
          {reportType === 'fuel_availability' && (
            <ChoiceRow
              labelText="Fuel"
              onChange={setFuelStatus}
              options={fuelStatuses}
              value={fuelStatus}
            />
          )}
          {reportType === 'wait_time' && (
            <TextField
              accessibilityLabel="Wait time in minutes"
              keyboardType="number-pad"
              label="Wait time in minutes"
              onChangeText={setWaitTime}
              placeholder="0–1440"
              value={waitTime}
            />
          )}
          {(reportType === 'facility_condition' || reportType === 'access_condition') && (
            <>
              <ChoiceRow
                labelText="Condition"
                onChange={setConditionCategory}
                options={conditionCategories}
                value={conditionCategory}
              />
              <ChoiceRow
                labelText="Status"
                onChange={setConditionStatus}
                options={conditionStatuses}
                value={conditionStatus}
              />
            </>
          )}

          <TextField
            accessibilityLabel="Optional report details"
            label="Optional details"
            maxLength={500}
            multiline
            onChangeText={setDetails}
            placeholder="Do not include your live location or contact details"
            value={details}
          />

          {errorMessage && <InlineMessage tone="danger">{errorMessage}</InlineMessage>}

          <PrimaryButton
            isLoading={isSubmitting}
            label="Submit report"
            onPress={() => void handleSubmit()}
          />
        </>
      )}
    </ThemedView>
  );
}

export function ReportFeedback({ report }: { report: FacilityReport }) {
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitFeedback(feedbackType: 'confirm' | 'dispute') {
    const reason = disputeReason.trim();
    if (feedbackType === 'dispute' && (reason.length === 0 || reason.length > 500)) {
      setMessage('Add a short reason (up to 500 characters) to dispute this report.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await submitFacilityReportFeedback(
        feedbackType === 'confirm'
          ? { report_id: report.id, feedback_type: feedbackType }
          : { report_id: report.id, feedback_type: feedbackType, reason },
      );
      setMessage('Thanks. Your response was recorded.');
      setIsDisputing(false);
    } catch (error) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : null;
      setMessage(
        code === '23505'
          ? 'You have already responded to this report.'
          : getErrorMessage(error, 'Unable to record your response.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.feedback}>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : isDisputing ? (
        <>
          <TextField
            accessibilityLabel="Reason for disputing this report"
            maxLength={500}
            onChangeText={setDisputeReason}
            placeholder="Why is this report no longer accurate?"
            value={disputeReason}
          />
          <ThemedView style={styles.feedbackButtons}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void submitFeedback('dispute')}
              style={styles.textButton}>
              <ThemedText type="linkPrimary">
                {isSubmitting ? 'Submitting…' : 'Submit dispute'}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsDisputing(false)}
              style={styles.textButton}>
              <ThemedText type="link">Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </>
      ) : (
        <ThemedView style={styles.feedbackButtons}>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void submitFeedback('confirm')}
            style={styles.textButton}>
            <ThemedText type="linkPrimary">Confirm</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => setIsDisputing(true)}
            style={styles.textButton}>
            <ThemedText type="link">Dispute</ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: BorderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#80808055',
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    gap: Spacing.two,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  feedback: {
    gap: Spacing.two,
  },
  feedbackButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
