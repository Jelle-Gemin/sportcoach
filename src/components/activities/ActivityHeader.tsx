import React from 'react';

interface ActivityHeaderProps {
  activity: any;
}

export function ActivityHeader({ activity }: ActivityHeaderProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActivityIcon = (type: string) => {
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

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-start space-x-4">
        <div className="text-4xl">{getActivityIcon(activity.type)}</div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activity.name}
          </h1>
          <div className="text-gray-600 space-y-1">
            <p className="text-lg">{formatDate(activity.start_date_local)}</p>
            <p>{formatTime(activity.start_date_local)}</p>
            {activity.description && (
              <p className="mt-3 text-gray-700">{activity.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
