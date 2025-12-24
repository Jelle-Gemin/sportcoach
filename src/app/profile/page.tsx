'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { useProfile } from '../../hooks/useProfile';
import { useInitialSync } from '../../hooks/useInitialSync';
import { useTotalActivities } from '../../hooks/useTotalActivities';

import { ProfileStats } from '../../components/profile/ProfileStats';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { ActivityList } from '@/components/profile/ActivityList';
import { SyncControl } from '@/components/profile/SyncControl';
import { AppLayout } from '../../components/layout/AppLayout';


export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    athlete,
    stats,
    loading: profileLoading,
    error: profileError,
  } = useProfile();

  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    loadMore,
    hasMore,
    refetch,
  } = useActivities(0, 10, isAuthenticated); // Load 10 activities initially, enabled when authenticated

  const {
    isLoading: initialSyncLoading,
    isCompleted: initialSyncCompleted,
    syncedCount: initialSyncedCount,
    hasOlderActivities,
    error: initialSyncError,
  } = useInitialSync();

  const { totalActivities, loading: totalActivitiesLoading, error: totalActivitiesError } = useTotalActivities();

  // Refetch activities after initial sync completes
  useEffect(() => {
    if (initialSyncCompleted && activities.length === 0) {
      refetch();
    }
  }, [initialSyncCompleted, refetch, activities.length]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show initial sync loading screen
  if (initialSyncLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your profile...</h2>
          <p className="text-gray-600">Syncing your recent activities</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (totalActivitiesLoading || totalActivities === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your activities...</h2>
          <p className="text-gray-600">Fetching your total activity count</p>
        </div>
      </div>
    );
  }

  const loading = profileLoading || activitiesLoading;
  const error = profileError || activitiesError || initialSyncError || totalActivitiesError;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-carddark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">View your Strava activity statistics and recent workouts.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading profile</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !athlete ? (
          <ProfileSkeleton />
        ) : athlete ? (
          <>
            <ProfileHeader athlete={athlete} />

            {stats && (
              <ProfileStats
                stats={stats}
                measurementPreference={athlete.measurement_preference}
              />
            )}

            <SyncControl />

            <div className="bg-cardrounded-lg shadow-sm p-6">
              <ActivityList
                activities={activities}
                loading={activitiesLoading}
                onLoadMore={loadMore}
                hasMore={hasMore}
              />
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
