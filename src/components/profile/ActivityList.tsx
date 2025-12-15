import React from 'react';
import { StravaActivity } from '@/services/stravaApi';
import { ActivityCard } from './ActivityCard';

interface ActivityListProps {
  activities: StravaActivity[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function ActivityList({ activities, loading, onLoadMore, hasMore }: ActivityListProps) {
  if (activities.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🏃‍♂️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
        <p className="text-gray-600">Start tracking your workouts to see them here!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More Activities'}
          </button>
        </div>
      )}

      {loading && activities.length > 0 && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading more activities...</span>
        </div>
      )}
    </div>
  );
}
