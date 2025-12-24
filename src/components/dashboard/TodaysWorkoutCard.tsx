'use client';

import { PlayIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export function TodaysWorkoutCard() {
  // Mock data - in real app this would come from API
  const todaysWorkout = {
    name: 'Easy Run',
    distance: 8.0,
    duration: '50:00',
    pace: '6:15/km',
    zone: 'Zone 2',
    instructions: [
      'Warm up 10 minutes easy',
      'Maintain conversation pace',
      'Cool down 5 minutes'
    ]
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <PlayIcon className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="ml-3 text-xl font-semibold text-gray-900">
          Today's Workout
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {todaysWorkout.name}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="flex items-center text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-2" />
              {todaysWorkout.distance} km
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2" />
              {todaysWorkout.duration}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Pace: {todaysWorkout.pace} • {todaysWorkout.zone}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Instructions
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {todaysWorkout.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                {instruction}
              </li>
            ))}
          </ul>
        </div>

        <button className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md text-base font-medium text-white bg-primary hover:bg-primary-dark">
          <PlayIcon className="h-5 w-5 mr-2" />
          Start Workout
        </button>
      </div>
    </div>
  );
}
