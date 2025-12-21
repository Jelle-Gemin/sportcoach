'use client';

import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export function TrainingConsistencyCard() {
  // Mock data - in real app this would come from API
  const consistencyData = {
    currentStreak: 12,
    longestStreak: 28,
    weeks: 12,
  };

  // Generate mock heatmap data
  const generateHeatmapData = () => {
    const data = [];
    for (let week = 0; week < consistencyData.weeks; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        // Random activity level (0-4)
        const activity = Math.floor(Math.random() * 5);
        weekData.push(activity);
      }
      data.push(weekData);
    }
    return data;
  };

  const heatmapData = generateHeatmapData();

  const getActivityColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100';
      case 1: return 'bg-green-200';
      case 2: return 'bg-green-300';
      case 3: return 'bg-green-400';
      case 4: return 'bg-green-500';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          Training Consistency
        </h3>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          {consistencyData.currentStreak} days
        </div>
        <div className="text-sm text-gray-600">
          Current streak • Longest: {consistencyData.longestStreak} days
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">Activity frequency (last 12 weeks)</div>

      <div className="grid grid-cols-7 gap-1">
        {heatmapData.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`w-3 h-3 rounded-sm ${getActivityColor(day)}`}
              title={`Week ${weekIndex + 1}, Day ${dayIndex + 1}: ${day} activities`}
            />
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Less</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-100 rounded-sm"></div>
          <div className="w-2 h-2 bg-green-200 rounded-sm"></div>
          <div className="w-2 h-2 bg-green-300 rounded-sm"></div>
          <div className="w-2 h-2 bg-green-400 rounded-sm"></div>
          <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
