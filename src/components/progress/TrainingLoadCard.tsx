'use client';

import ArrowUpIcon from "@heroicons/react/24/solid/esm/ArrowUpIcon";
import ArrowDownIcon from "@heroicons/react/24/solid/esm/ArrowDownIcon";

export function TrainingLoadCard() {
  // Mock data - in real app this would come from API
  const trainingLoad = {
    current: 385,
    previous: 342,
    change: '+Moderate',
    trend: 'up'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Training Load
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {trainingLoad.current}
            </div>
            <div className="text-sm text-gray-600">
              Current Training Load
            </div>
          </div>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            trainingLoad.trend === 'up'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {trainingLoad.trend === 'up' ? (
              <ArrowUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 mr-1" />
            )}
            {trainingLoad.change}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>Your training load has increased moderately this week. This is within healthy ranges for your current fitness level.</p>
        </div>
      </div>
    </div>
  );
}
