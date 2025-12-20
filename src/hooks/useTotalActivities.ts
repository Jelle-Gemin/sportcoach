import { useState, useEffect } from 'react';
import { fetchAllActivityIds } from '../services/stravaApi';
import { useAuth } from '../contexts/AuthContext';

export function useTotalActivities() {
  const [totalActivities, setTotalActivities] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    const loadTotalActivities = async () => {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const activityIds = await fetchAllActivityIds(accessToken);
        setTotalActivities(activityIds.length);
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
