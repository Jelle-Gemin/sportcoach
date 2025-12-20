import { useState, useEffect, useCallback } from 'react';

interface ContinuousSyncProgress {
  status: 'not_started' | 'syncing' | 'paused' | 'completed' | 'error';
  totalActivitiesFound: number;
  activitiesProcessed: number;
  totalAthleteActivities: number;
  percentComplete: number;
  currentBatchStart?: string;
  estimatedCompletion?: string;
  rateLimitRequestsThisWindow: number;
  rateLimitRequestsToday: number;
  rateLimitNextReset: string;
}

interface ContinuousSyncState {
  isLoading: boolean;
  progress: ContinuousSyncProgress | null;
  error: string | null;
  jobId: string | null;
  startSync: () => Promise<void>;
  pauseSync: () => Promise<void>;
  resumeSync: () => Promise<void>;
  cancelSync: () => Promise<void>;
}

export function useContinuousSync(): ContinuousSyncState {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ContinuousSyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch('/api/sync/progress');
      const data = await response.json();

      if (response.ok) {
        setProgress(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch progress');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const startSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sync/start-continuous', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJobId(data.jobId);
        // Start polling for progress (less frequently since sync runs in background)
        fetchProgress();
        const id = setInterval(fetchProgress, 10000); // Poll every 10 seconds
        setIntervalId(id);
      } else {
        setError(data.error || 'Failed to start sync');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProgress]);

  const pauseSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync/pause', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to pause sync');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resumeSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync/resume', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Resume polling
        fetchProgress();
        const id = setInterval(fetchProgress, 10000);
        setIntervalId(id);
      } else {
        setError(data.error || 'Failed to resume sync');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProgress]);

  const cancelSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync/cancel', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Stop polling and reset state
        if (intervalId) {
          clearInterval(intervalId);
          setIntervalId(null);
        }
        setProgress(null);
        setJobId(null);
      } else {
        setError(data.error || 'Failed to cancel sync');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [intervalId]);

  // Initial progress fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  // Stop polling when sync is completed or errored
  useEffect(() => {
    if (progress && (progress.status === 'completed' || progress.status === 'error') && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setJobId(null);
    }
  }, [progress, intervalId]);

  return {
    isLoading,
    progress,
    error,
    jobId,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
  };
}
