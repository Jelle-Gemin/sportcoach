'use client';

import { PencilIcon, SparklesIcon } from '@heroicons/react/24/outline';

export function CurrentPlanCard() {
  // Mock data - in real app this would come from API
  const planData = {
    name: 'Marathon Training',
    race: 'Chicago Marathon',
    raceDate: 'Oct 13, 2024',
    totalWeeks: 16,
    currentWeek: 4,
    daysUntilRace: 28
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="mb-4 lg:mb-0">
          <h2 className="text-xl font-semibold text-gray-900">
            Current Training Plan
          </h2>
          <p className="text-gray-600 mt-1">
            {planData.name} • {planData.race} • {planData.raceDate}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Week {planData.currentWeek} of {planData.totalWeeks} • {planData.daysUntilRace} days until race
          </p>
        </div>

        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Plan
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-primary rounded-md text-sm font-medium text-primary bg-white hover:bg-primary hover:text-white">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Generate New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
