'use client';

import { HeartIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export function RecentActivitiesCard() {
  // Mock data - in real app this would come from useActivities hook
  const recentActivities = [
    {
      id: 1,
      name: 'Morning Run',
      date: 'Dec 17',
      distance: 10.2,
      duration: '52:30',
      pace: '5:09/km',
      heartRate: 145,
      type: 'run'
    },
    {
      id: 2,
      name: 'Recovery Ride',
      date: 'Dec 16',
      distance: 25.0,
      duration: '1:15:00',
      pace: '20.0 km/h',
      type: 'ride'
    },
    {
      id: 3,
      name: 'Tempo Run',
      date: 'Dec 15',
      distance: 12.0,
      duration: '58:24',
      pace: '4:52/km',
      heartRate: 165,
      type: 'run'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'run':
        return '🏃';
      case 'ride':
        return '🚴';
      case 'swim':
        return '🏊';
      default:
        return '🏃';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Recent Activities
        </h2>
        <button className="text-primary hover:text-primary-dark text-sm font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center">
              <div className="text-2xl mr-4">
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {activity.name}
                </div>
                <div className="text-sm text-gray-600">
                  {activity.date}
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {activity.distance} km
                  <ClockIcon className="h-4 w-4 ml-3 mr-1" />
                  {activity.duration}
                  {activity.heartRate && (
                    <>
                      <HeartIcon className="h-4 w-4 ml-3 mr-1" />
                      {activity.heartRate} bpm
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {activity.pace}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
