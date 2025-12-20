import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';


interface InitialSyncState {
  isLoading: boolean;
  isCompleted: boolean;
  syncedCount: number;
  hasOlderActivities: boolean;
  error: string | null;
}

export function useInitialSync(): InitialSyncState {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<InitialSyncState>({
    isLoading: false,
    isCompleted: false,
    syncedCount: 0,
    hasOlderActivities: false,
    error: null,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkAndPerformInitialSync = async () => {
      try {
        // First check if there are any activities for this athlete in the database
        const activitiesResponse = await fetch('/api/activities?limit=1');
        const activitiesData = await activitiesResponse.json();

        const hasActivitiesInDb = activitiesResponse.ok && activitiesData.activities && activitiesData.activities.length > 0;

        // If there are activities in the database, no need to sync
        if (hasActivitiesInDb) {
          setState({
            isLoading: false,
            isCompleted: true,
            syncedCount: activitiesData.total || 0,
            hasOlderActivities: false, // We don't know, but assume not needed since activities exist
            error: null,
          });
          return;
        }

        // Check sync status to see if initial sync was already completed
        const statusResponse = await fetch('/api/sync/status');
        const statusData = await statusResponse.json();

        if (statusResponse.ok && (statusData.initialSyncStatus === 'initial_complete' || statusData.initialSyncStatus === 'fully_synced')) {
          // Initial sync already completed
          setState({
            isLoading: false,
            isCompleted: true,
            syncedCount: statusData.totalActivities || 0,
            hasOlderActivities: statusData.hasOlderActivities || false,
            error: null,
          });
          return;
        }

        // Perform initial sync since no activities exist and sync status indicates it's not complete
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch('/api/sync/initial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setState({
            isLoading: false,
            isCompleted: true,
            syncedCount: data.syncedCount,
            hasOlderActivities: data.hasOlderActivities,
            error: null,
          });
        } else {
          setState({
            isLoading: false,
            isCompleted: false,
            syncedCount: 0,
            hasOlderActivities: false,
            error: data.error || 'Failed to perform initial sync',
          });
        }
      } catch (error) {
        setState({
          isLoading: false,
          isCompleted: false,
          syncedCount: 0,
          hasOlderActivities: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    };

    checkAndPerformInitialSync();
  }, [isAuthenticated, user]);

  return state;
}
