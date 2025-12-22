import { useState, useEffect } from 'react';
import { fetchAllActivityIds } from '../services/stravaApi';
import { useAuth } from '../contexts/AuthContext';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: number; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function useTotalActivities() {
  const [totalActivities, setTotalActivities] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    const loadTotalActivities = async () => {
      if (!accessToken) return;

      const cacheKey = `totalActivities_${accessToken}`;
      const cached = cache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        setTotalActivities(cached.data);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const activityIds = await fetchAllActivityIds(accessToken);
        const count = activityIds.length;
        setTotalActivities(count);

        // Cache the result
        cache.set(cacheKey, { data: count, timestamp: now });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch total activities');
      } finally {
        setLoading(false);
      }
    };

    loadTotalActivities();
  }, [accessToken]);

  return {
    totalActivities,
    loading,
    error,
  };
}
