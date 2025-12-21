import { useState, useEffect } from 'react';

interface UseSyncedActivitiesCountReturn {
  syncedCount: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSyncedActivitiesCount(): UseSyncedActivitiesCountReturn {
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncedCount = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/activities?limit=0');

      if (!response.ok) {
        throw new Error('Failed to fetch synced activities count');
      }

      const data = await response.json();
      setSyncedCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch synced activities count');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncedCount();
  }, []);

  return {
    syncedCount,
    loading,
    error,
    refetch: fetchSyncedCount,
  };
}
