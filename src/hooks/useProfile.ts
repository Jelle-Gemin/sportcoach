import { useQuery } from '@tanstack/react-query';
import { StravaAthlete, AthleteStats } from '@/services/stravaApi';

interface ProfileData {
  athlete: StravaAthlete | null;
  stats: AthleteStats | null;
}

export function useProfile() {
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<ProfileData> => {
      const response = await fetch('/api/profile');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 429) {
          // Rate limit hit - try to get data from response anyway
          try {
            const { athlete, stats } = await response.json();
            if (athlete) {
              return { athlete, stats };
            }
          } catch {
            // If parsing fails, throw rate limit error
          }
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error('Failed to fetch profile');
      }

      const { athlete, stats } = await response.json();
      return { athlete, stats };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - profile rarely changes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message === 'Authentication required') return false;
      return failureCount < 2;
    },
  });

  return {
    athlete: query.data?.athlete ?? null,
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
