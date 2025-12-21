'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function PlanOverview() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data - in real app this would come from API
  const planPhases = [
    { name: 'Base Building', weeks: '1-4', status: 'Current', description: 'Building aerobic base and consistency' },
    { name: 'Strength Development', weeks: '5-8', status: 'Upcoming', description: 'Increasing volume and adding speed work' },
    { name: 'Peak Training', weeks: '9-12', status: 'Upcoming', description: 'High volume with quality sessions' },
    { name: 'Taper', weeks: '13-15', status: 'Upcoming', description: 'Reducing volume while maintaining fitness' },
    { name: 'Race Week', weeks: '16', status: 'Upcoming', description: 'Final preparations and race day' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Full Plan Overview
        </h3>
        <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${
          isExpanded ? 'rotate-180' : ''
        }`} />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {planPhases.map((phase, index) => (
            <div key={index} className={`p-4 rounded-lg border ${
              phase.status === 'Current'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {phase.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {phase.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Weeks {phase.weeks}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                    phase.status === 'Current'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {phase.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
