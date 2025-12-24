'use client';

import { LightBulbIcon } from '@heroicons/react/24/outline';

export function AIInsightsCard() {
  // Mock data - in real app this would come from AI analysis
  const insights = [
    'Good progression from last week (+8% volume)',
    'Your recent pace suggests readiness for intervals',
    'Consider extending Saturday\'s long run by 2km',
    'Heart rate recovery is improving - keep up the consistency'
  ];

  return (
    <div className="bg-cardrounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <LightBulbIcon className="h-6 w-6 text-yellow-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          AI Insights for This Week
        </h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2 mr-3" />
            <p className="text-sm text-gray-700">{insight}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Insights are generated based on your recent training data, performance trends, and training plan goals.
        </p>
      </div>
    </div>
  );
}
