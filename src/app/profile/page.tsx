'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { useProfile } from '../../hooks/useProfile';

import { ProfileStats } from '../../components/profile/ProfileStats';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { ActivityList } from '@/components/profile/ActivityList';


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
  } = useActivities(1, 10); // Load 10 activities initially

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
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

  const loading = profileLoading || activitiesLoading;
  const error = profileError || activitiesError;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">View your Strava activity statistics and recent workouts.</p>
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

            <div className="bg-white rounded-lg shadow-sm p-6">
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
    </div>
  );
}

