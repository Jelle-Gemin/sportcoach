import { StravaActivity } from '@/services/stravaApi';
import React from 'react';

interface ActivityCardProps {
  activity: StravaActivity;
  onClick?: (id: number) => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatElevation = (meters: number): string => {
    return `${Math.round(meters)}m`;
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getActivityIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'ride':
        return '🚴';
      case 'run':
        return '🏃';
      case 'swim':
        return '🏊';
      case 'workout':
      case 'weighttraining':
      case 'strength':
        return '💪';
      case 'yoga':
        return '🧘';
      case 'hike':
        return '🥾';
      case 'walk':
        return '🚶';
      case 'ski':
      case 'snowboard':
        return '🎿';
      default:
        return '⚽';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(activity.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
        onClick ? 'hover:border-blue-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-2xl">{getActivityIcon(activity.type)}</div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{activity.name}</h3>

            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <span>{formatDate(activity.start_date)}</span>

              <div className="flex items-center space-x-3">
                <span>{formatDistance(activity.distance)}</span>
                <span>{formatDuration(activity.moving_time)}</span>
                <span>↑{formatElevation(activity.total_elevation_gain)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>❤️ {activity.kudos_count}</span>
              <span>💬 {activity.comment_count}</span>
              {activity.achievement_count > 0 && (
                <span>🏆 {activity.achievement_count}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
