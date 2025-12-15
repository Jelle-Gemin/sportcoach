import { StravaAthlete, AthleteStats } from '@/services/stravaApi';
import { useState, useEffect } from 'react';

interface UseProfileReturn {
  athlete: StravaAthlete | null;
  stats: AthleteStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch athlete profile and stats
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch profile');
      }
      const { athlete: athleteData, stats: statsData } = await profileResponse.json();
      setAthlete(athleteData);
      setStats(statsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAthlete(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    athlete,
    stats,
    loading,
    error,
    refetch
  };
}
