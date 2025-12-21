import { useState, useEffect } from 'react';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';

interface ActivityDetailData {
  activity: StravaActivityDetail | null;
  streams: Record<string, StravaStream> | null;
  loading: boolean;
  error: string | null;
}

export function useActivityDetail(activityId: string | null): ActivityDetailData {
  const [data, setData] = useState<ActivityDetailData>({
    activity: null,
    streams: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!activityId) return;

    const fetchActivityDetail = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(`/api/activities/${activityId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch activity: ${response.statusText}`);
        }

        const result = await response.json();
        setData({
          activity: result.activity,
          streams: result.streams,
          loading: false,
          error: null,
        });
      } catch (error) {
        setData({
          activity: null,
          streams: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchActivityDetail();
  }, [activityId]);

  return data;
}
