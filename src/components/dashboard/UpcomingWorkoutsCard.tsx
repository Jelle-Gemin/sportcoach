'use client';

import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export function UpcomingWorkoutsCard() {
  // Mock data - in real app this would come from API
  const upcomingWorkouts = [
    {
      day: 'Tomorrow',
      name: 'Interval Training',
      distance: '10km',
      duration: '1:00:00',
      type: 'intervals'
    },
    {
      day: 'Friday',
      name: 'Recovery Run',
      distance: '6km',
      duration: '40:00',
      type: 'recovery'
    },
    {
      day: 'Saturday',
      name: 'Long Run',
      distance: '18km',
      duration: '1:45:00',
      type: 'long'
    }
  ];

  const getWorkoutIcon = (type: string) => {
    switch (type) {
      case 'intervals':
        return '⚡';
      case 'recovery':
        return '🧘';
      case 'long':
        return '🏃';
      default:
        return '🏃';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Upcoming Workouts
      </h2>

      <div className="space-y-4">
        {upcomingWorkouts.map((workout, index) => (
          <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-4">
                {getWorkoutIcon(workout.type)}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {workout.day} • {workout.name}
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {workout.distance}
                  <ClockIcon className="h-4 w-4 ml-3 mr-1" />
                  {workout.duration}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-base font-medium text-gray-700 bg-card hover:bg-gray-50">
        View Full Plan
      </button>
    </div>
  );
}
