'use client';

import { PencilIcon, SparklesIcon } from '@heroicons/react/24/outline';

export function PlanHeader() {
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
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {planData.name}
          </h1>
          <p className="text-gray-600 mt-1">
            {planData.race} • {planData.raceDate} • {planData.totalWeeks} weeks
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Week {planData.currentWeek} of {planData.totalWeeks} • {planData.daysUntilRace} days until taper
          </p>
        </div>

        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-card hover:bg-gray-50">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Plan
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-primary rounded-md text-sm font-medium text-primary bg-card hover:bg-primary hover:text-white">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Generate New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
