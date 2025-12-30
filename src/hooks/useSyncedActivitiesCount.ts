import { useQuery } from '@tanstack/react-query';

interface SyncedActivitiesCountData {
  syncedCount: number;
  total: number;
}

export function useSyncedActivitiesCount() {
  const query = useQuery({
    queryKey: ['syncedActivitiesCount'],
    queryFn: async (): Promise<SyncedActivitiesCountData> => {
      const response = await fetch('/api/activities?limit=0');

      if (!response.ok) {
        throw new Error('Failed to fetch synced activities count');
      }

      const data = await response.json();
      return {
        syncedCount: data.total || 0,
        total: data.total || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - may change during sync
  });

  return {
    syncedCount: query.data?.syncedCount ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
