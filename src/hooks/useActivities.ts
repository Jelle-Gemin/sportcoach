import { StravaActivity } from '@/services/stravaApi';
import { useState, useEffect } from 'react';

interface UseActivitiesReturn {
  activities: StravaActivity[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useActivities(initialOffset: number = 0, perPage: number = 30, enabled: boolean = true): UseActivitiesReturn {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivities = async (offsetNum: number, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/activities?limit=${perPage}&offset=${offsetNum}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();

      if (append) {
        setActivities(prev => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }

      // Use hasMore from API response
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      const nextOffset = offset + perPage;
      setOffset(nextOffset);
      await fetchActivities(nextOffset, true);
    }
  };

  const refetch = async () => {
    setOffset(0);
    await fetchActivities(0, false);
  };

  useEffect(() => {
    if (enabled) {
      fetchActivities(0, false);
    }
  }, [enabled]);

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  };
}
