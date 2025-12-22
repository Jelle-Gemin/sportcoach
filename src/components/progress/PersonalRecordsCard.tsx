'use client';

import { TrophyIcon } from '@heroicons/react/24/outline';

export function PersonalRecordsCard() {
  // Mock data - in real app this would come from API
  const records = [
    { distance: '5K', time: '21:45', date: 'Dec 3, 2024' },
    { distance: '10K', time: '45:32', date: 'Nov 15, 2024' },
    { distance: 'Half Marathon', time: '1:42:18', date: 'Oct 8, 2024' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <TrophyIcon className="h-6 w-6 text-yellow-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          Personal Records
        </h3>
      </div>

      <div className="space-y-3">
        {records.map((record, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{record.distance}</div>
              <div className="text-sm text-gray-600">Set on {record.date}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{record.time}</div>
              <button className="text-xs text-primary hover:text-primary-dark">
                View Activity
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-primary hover:text-primary-dark">
          View All PRs →
        </button>
      </div>
    </div>
  );
}
