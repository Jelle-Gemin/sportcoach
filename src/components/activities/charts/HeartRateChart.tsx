import React from 'react';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';

interface HeartRateChartProps {
  activity: StravaActivityDetail;
  streams: Record<string, StravaStream> | null;
}

export function HeartRateChart({ activity, streams }: HeartRateChartProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Rate Chart</h3>
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">❤️</div>
          <p>Heart rate chart visualization</p>
          <p className="text-sm">Chart implementation pending</p>
        </div>
      </div>
    </div>
  );
}
