import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';

interface ActivityDetailData {
  activity: StravaActivityDetail | null;
  streams: Record<string, StravaStream> | null;
}

export function useActivityDetail(activityId: string | number | null) {
  const id = activityId?.toString() ?? null;

  const query = useQuery({
    queryKey: ['activity', id],
    queryFn: async (): Promise<ActivityDetailData> => {
      const response = await fetch(`/api/activities/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch activity: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        activity: result.activity,
        streams: result.streams,
      };
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - activity data is immutable
  });

  return {
    activity: query.data?.activity ?? null,
    streams: query.data?.streams ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

// Prefetch activity detail (for hover prefetching)
export function usePrefetchActivityDetail() {
  const queryClient = useQueryClient();

  return (activityId: string | number) => {
    const id = activityId.toString();
    queryClient.prefetchQuery({
      queryKey: ['activity', id],
      queryFn: async () => {
        const response = await fetch(`/api/activities/${id}`);
        const result = await response.json();
        return {
          activity: result.activity,
          streams: result.streams,
        };
      },
      staleTime: 10 * 60 * 1000,
    });
  };
}
