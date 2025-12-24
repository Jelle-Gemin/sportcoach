'use client';

import { act, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useActivities } from '../../hooks/useActivities';
import { ActivityFilters } from '../../components/activities/ActivityFilters';
import { ActivityList } from '@/components/activities/ActivityList';
import { SyncControl } from '@/components/profile/SyncControl';
import { AppLayout } from '../../components/layout/AppLayout';

export default function ActivitiesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: 'all',
    distance: 'all',
    pace: 'all'
  });

  const {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  } = useActivities(0, 20, isAuthenticated);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Filter activities based on search and filters
  const filteredActivities = activities.filter(activity => {
    // Search filter
    if (searchQuery && !activity.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filters.type !== 'all' && activity.type !== filters.type) {
      return false;
    }

    // Date range filter (simplified)
    if (filters.dateRange !== 'all') {
      const activityDate = new Date(activity.start_date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (filters.dateRange) {
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
        case 'year':
          if (daysDiff > 365) return false;
          break;
      }
    }

    // Distance filter (simplified)
    if (filters.distance !== 'all') {
      const distance = activity.distance / 1000; // Convert to km
      switch (filters.distance) {
        case 'short':
          if (distance >= 10) return false;
          break;
        case 'medium':
          if (distance < 10 || distance >= 21) return false;
          break;
        case 'long':
          if (distance < 21) return false;
          break;
      }
    }

    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-600 mt-2">
            Browse and analyze all your synced Strava activities
          </p>
        </div>

        {/* Sync Status */}
        <SyncControl />

        {/* Filters */}
        <ActivityFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Activity List */}
        <ActivityList
          activities={filteredActivities}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </AppLayout>
  );
}
