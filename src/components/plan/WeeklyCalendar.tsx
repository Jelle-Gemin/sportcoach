'use client';

import { CalendarDaysIcon } from '@heroicons/react/24/outline';

interface WeeklyCalendarProps {
  weekNumber: number;
}

export function WeeklyCalendar({ weekNumber }: WeeklyCalendarProps) {
  // Mock data - in real app this would come from API
  const weekData = {
    week: weekNumber,
    workouts: [
      { day: 'Mon', date: 15, workout: 'Easy Run', distance: '8km', completed: true },
      { day: 'Tue', date: 16, workout: 'Rest', distance: '', completed: false },
      { day: 'Wed', date: 17, workout: 'Tempo Run', distance: '10km', completed: true },
      { day: 'Thu', date: 18, workout: 'Intervals', distance: '6km', completed: false },
      { day: 'Fri', date: 19, workout: 'Recovery Run', distance: '5km', completed: false },
      { day: 'Sat', date: 20, workout: 'Long Run', distance: '16km', completed: false },
      { day: 'Sun', date: 21, workout: 'Rest', distance: '', completed: false }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <CalendarDaysIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">
          Week {weekNumber} Schedule
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekData.workouts.map((workout, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border text-center ${
              workout.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="text-sm font-medium text-gray-900 mb-1">
              {workout.day}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {workout.date}
            </div>
            <div className="text-xs font-medium text-gray-900 mb-1">
              {workout.workout}
            </div>
            {workout.distance && (
              <div className="text-xs text-gray-600">
                {workout.distance}
              </div>
            )}
            {workout.completed && (
              <div className="mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
