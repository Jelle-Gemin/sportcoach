import React from 'react';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';

interface ActivityAnalysisProps {
  activity: StravaActivityDetail;
  streams: Record<string, StravaStream> | null;
}

export function ActivityAnalysis({ activity, streams }: ActivityAnalysisProps) {
  // Simple analysis logic - in a real app, this would be more sophisticated
  const getPaceAnalysis = (): string => {
    if (!activity.average_speed) return 'No pace data available.';

    const pacePerKm = 1000 / activity.average_speed / 60; // minutes per km
    if (pacePerKm < 4) return 'Excellent pace! You\'re running very fast.';
    if (pacePerKm < 5) return 'Great pace! You maintained a good speed throughout.';
    if (pacePerKm < 6) return 'Solid pace for a steady effort.';
    return 'Comfortable pace for endurance building.';
  };

  const getHeartRateAnalysis = (): string => {
    if (!activity.average_heartrate) return 'No heart rate data available.';

    const avgHR = activity.average_heartrate;
    if (avgHR > 180) return 'High intensity effort with elevated heart rate.';
    if (avgHR > 160) return 'Good threshold effort in the tempo zone.';
    if (avgHR > 140) return 'Steady aerobic effort.';
    return 'Recovery or easy pace effort.';
  };

  const getConsistencyAnalysis = (): string => {
    // Simple consistency check based on splits
    if (!activity.splits_metric || activity.splits_metric.length < 2) {
      return 'Not enough split data for consistency analysis.';
    }

    const paces = activity.splits_metric
      .map((split: any) => split.average_speed)
      .filter((speed: number) => speed > 0);

    if (paces.length < 2) return 'Limited split data available.';

    const avgPace = paces.reduce((a: number, b: number) => a + b, 0) / paces.length;
    const variance = paces.reduce((acc: number, pace: number) =>
      acc + Math.pow(pace - avgPace, 2), 0) / paces.length;
    const stdDev = Math.sqrt(variance);

    const cv = stdDev / avgPace; // coefficient of variation

    if (cv < 0.05) return 'Excellent pace consistency throughout the activity!';
    if (cv < 0.1) return 'Good pace consistency with minor variations.';
    if (cv < 0.15) return 'Moderate pace consistency.';
    return 'Pace varied significantly throughout the activity.';
  };

  const getOverallAnalysis = (): string => {
    const analyses = [getPaceAnalysis(), getHeartRateAnalysis(), getConsistencyAnalysis()];
    return analyses.filter(a => !a.includes('No') && !a.includes('Not enough')).join(' ');
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3">💡</div>
            <div>
              <div className="font-medium text-blue-900 mb-1">Performance Summary</div>
              <div className="text-blue-800 text-sm">{getOverallAnalysis()}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-green-600 mr-3">🏃</div>
              <div>
                <div className="font-medium text-green-900 mb-1">Pace Analysis</div>
                <div className="text-green-800 text-sm">{getPaceAnalysis()}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-red-600 mr-3">❤️</div>
              <div>
                <div className="font-medium text-red-900 mb-1">Heart Rate</div>
                <div className="text-red-800 text-sm">{getHeartRateAnalysis()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-purple-600 mr-3">📊</div>
            <div>
              <div className="font-medium text-purple-900 mb-1">Consistency</div>
              <div className="text-purple-800 text-sm">{getConsistencyAnalysis()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
