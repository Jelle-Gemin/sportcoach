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

export function useActivities(initialPage: number = 1, perPage: number = 30): UseActivitiesReturn {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivities = async (pageNum: number, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/activities?page=${pageNum}&per_page=${perPage}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const newActivities = await response.json();

      if (append) {
        setActivities(prev => [...prev, ...newActivities]);
      } else {
        setActivities(newActivities);
      }

      // If we got fewer activities than requested, we've reached the end
      setHasMore(newActivities.length === perPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchActivities(nextPage, true);
    }
  };

  const refetch = async () => {
    setPage(1);
    await fetchActivities(1, false);
  };

  useEffect(() => {
    fetchActivities(1, false);
  }, []);

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  };
}
