import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import { CalendarEvent } from '@/schemas/calendarEvent';

dayjs.extend(isBetween);

const buildMockEvents = (orgId: string): CalendarEvent[] => {
  const now = dayjs();
  const medicalStart = now.add(2, 'day').hour(10).minute(0).second(0).millisecond(0);
  const transportStart = now.add(3, 'day').hour(9).minute(0).second(0).millisecond(0);
  const quarantineStart = now.subtract(1, 'day').hour(8).minute(0).second(0).millisecond(0);

  return [
    {
      event_id: 'med_mock_1',
      org_id: orgId,
      source_type: 'medical',
      source_id: 'medrec_mock_1',
      title: 'Medical: Vaccine booster',
      start_at: medicalStart.toISOString(),
      end_at: medicalStart.add(1, 'hour').toISOString(),
      location: 'Clinic A',
      status: 'scheduled',
      link_type: 'dog',
      link_id: 'dog_med_1',
      visibility: 'org',
      meta: { dog_id: 'dog_med_1', record_type: 'vaccine' },
      reminders: [
        {
          id: 'rem_med_1',
          type: 'local',
          offset_minutes: 60,
          scheduled_at: medicalStart.subtract(60, 'minute').toISOString(),
          deterministic_key: 'medical_medrec_mock_1_60',
          payload: { dog_id: 'dog_med_1' },
        },
      ],
    },
    {
      event_id: 'trans_mock_1',
      org_id: orgId,
      source_type: 'transport',
      source_id: 'transport_mock_1',
      title: 'Transport: Shelter -> Foster',
      start_at: transportStart.toISOString(),
      end_at: transportStart.add(90, 'minute').toISOString(),
      location: 'Shelter',
      status: 'Scheduled',
      link_type: 'transport',
      link_id: 'transport_mock_1',
      visibility: 'org',
      meta: { dog_id: 'dog_trans_1', from: 'Shelter', to: 'Foster' },
      reminders: [
        {
          id: 'rem_trans_1',
          type: 'local',
          offset_minutes: 60,
          scheduled_at: transportStart.subtract(60, 'minute').toISOString(),
          deterministic_key: 'transport_transport_mock_1_60',
          payload: { dog_id: 'dog_trans_1' },
        },
      ],
    },
    {
      event_id: 'quar_mock_1',
      org_id: orgId,
      source_type: 'quarantine',
      source_id: 'dog_quarantine_1',
      title: 'Quarantine: Luna',
      start_at: quarantineStart.toISOString(),
      end_at: quarantineStart.add(14, 'day').toISOString(),
      location: 'Foster Home',
      status: 'quarantine',
      link_type: 'dog',
      link_id: 'dog_quarantine_1',
      visibility: 'org',
      meta: { dog_id: 'dog_quarantine_1', stage: 'Medical Hold' },
      reminders: [
        {
          id: 'rem_quar_1',
          type: 'local',
          offset_minutes: 0,
          scheduled_at: quarantineStart.toISOString(),
          deterministic_key: 'quarantine_dog_quarantine_1_start',
          payload: { dog_id: 'dog_quarantine_1' },
        },
      ],
    },
  ];
};

export const getMockCalendarEvents = async (
  orgId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  const start = dayjs(startDate ?? undefined).isValid()
    ? dayjs(startDate).startOf('day')
    : dayjs().startOf('day');
  const end = dayjs(endDate ?? undefined).isValid()
    ? dayjs(endDate).endOf('day')
    : dayjs().add(30, 'day').endOf('day');

  return buildMockEvents(orgId).filter((event) => {
    const startAt = dayjs(event.start_at);
    const endAt = dayjs(event.end_at);
    return startAt.isBetween(start, end, null, '[]') || endAt.isBetween(start, end, null, '[]');
  });
};
