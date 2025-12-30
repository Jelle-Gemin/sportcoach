import { useQuery } from '@tanstack/react-query';
import { fetchAllActivityIds } from '../services/stravaApi';
import { useAuth } from '../contexts/AuthContext';

export function useTotalActivities() {
  const { accessToken } = useAuth();

  const query = useQuery({
    queryKey: ['totalActivities', accessToken],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('No access token');
      }
      const activityIds = await fetchAllActivityIds(accessToken);
      return activityIds.length;
    },
    enabled: !!accessToken,
    staleTime: 15 * 60 * 1000, // 15 minutes - expensive API call
    retry: false, // Don't retry on Strava API rate limit
  });

  return {
    totalActivities: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
