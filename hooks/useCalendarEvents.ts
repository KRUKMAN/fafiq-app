import { useQuery } from '@tanstack/react-query';

import { fetchCalendarEvents } from '@/lib/data/calendarEvents';
import { CalendarEvent, CalendarSourceType } from '@/schemas/calendarEvent';

type CalendarRange = {
  startDate?: string;
  endDate?: string;
};

type CalendarFilters = {
  sourceTypes?: CalendarSourceType[];
  dogId?: string | null;
  contactId?: string | null;
  stage?: string | null;
  visibility?: string | null;
  search?: string;
};

type CalendarQuery = CalendarRange & CalendarFilters & { fallbackToMockOnError?: boolean };

export const useCalendarEvents = (orgId?: string, params?: CalendarQuery) =>
  useQuery<CalendarEvent[]>({
    queryKey: [
      'calendar-events',
      orgId ?? '',
      params?.startDate ?? '',
      params?.endDate ?? '',
      (params?.sourceTypes ?? []).slice().sort().join(','),
      params?.dogId ?? '',
      params?.contactId ?? '',
      params?.stage ?? '',
      params?.visibility ?? '',
      params?.search ?? '',
    ],
    queryFn: () =>
      fetchCalendarEvents({
        orgId: orgId!,
        startDate: params?.startDate,
        endDate: params?.endDate,
        sourceTypes: params?.sourceTypes,
        dogId: params?.dogId ?? undefined,
        contactId: params?.contactId ?? undefined,
        stage: params?.stage ?? undefined,
        visibility: params?.visibility ?? undefined,
        search: params?.search ?? undefined,
        fallbackToMockOnError: params?.fallbackToMockOnError ?? true,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId),
  });
