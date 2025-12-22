'use client';

import { CalendarDaysIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export function WeeklySummaryCard() {
  // Mock data - in real app this would come from API
  const weeklySummary = {
    plannedWorkouts: 5,
    completedWorkouts: 3,
    totalDistance: 42.5,
    totalTime: '5:30:00'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="ml-3 text-xl font-semibold text-gray-900">
          This Week
        </h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {weeklySummary.plannedWorkouts}
            </div>
            <div className="text-sm text-gray-600">
              workouts planned
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {weeklySummary.completedWorkouts}
            </div>
            <div className="text-sm text-gray-600">
              completed ✓
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-2" />
              Total distance
            </div>
            <span className="font-medium text-gray-900">
              {weeklySummary.totalDistance} km
            </span>
          </div>

          <div className="flex items-center justify-between text-sm mt-2">
            <div className="flex items-center text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2" />
              Total time
            </div>
            <span className="font-medium text-gray-900">
              {weeklySummary.totalTime}
            </span>
          </div>
        </div>

        <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
          View Week Details
        </button>
      </div>
    </div>
  );
}
