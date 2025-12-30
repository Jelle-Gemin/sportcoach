import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { StravaActivity } from '@/services/stravaApi';

interface ActivitiesPage {
  activities: StravaActivity[];
  total: number;
  hasMore: boolean;
  nextCursor?: number;
}

interface UseActivitiesOptions {
  perPage?: number;
  enabled?: boolean;
  type?: string;
}

export function useActivities(options: UseActivitiesOptions = {}) {
  const { perPage = 30, enabled = true, type } = options;

  return useInfiniteQuery({
    queryKey: ['activities', { perPage, type }],
    queryFn: async ({ pageParam = 0 }): Promise<ActivitiesPage> => {
      const params = new URLSearchParams({
        limit: perPage.toString(),
        offset: pageParam.toString(),
      });
      if (type) params.set('type', type);

      const response = await fetch(`/api/activities?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      return {
        activities: data.activities,
        total: data.total,
        hasMore: data.hasMore,
        nextCursor: data.hasMore ? (pageParam + perPage) : undefined,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: 0,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Flattened activities helper for components that need a simple array
export function useFlatActivities(options: UseActivitiesOptions = {}) {
  const query = useActivities(options);

  const activities = query.data?.pages.flatMap(page => page.activities) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    activities,
    total,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    hasMore: query.hasNextPage ?? false,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
  };
}

// Prefetch activities (for use on dashboard or navigation)
export function usePrefetchActivities() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['activities', { perPage: 30, type: undefined }],
      queryFn: async () => {
        const response = await fetch('/api/activities?limit=30&offset=0');
        const data = await response.json();
        return {
          activities: data.activities,
          total: data.total,
          hasMore: data.hasMore,
          nextCursor: data.hasMore ? 30 : undefined,
        };
      },
      initialPageParam: 0,
    });
  };
}
