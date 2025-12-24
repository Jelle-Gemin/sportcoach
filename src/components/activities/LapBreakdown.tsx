import React from 'react';
import { StravaActivityDetail } from '@/services/stravaApi';

interface LapBreakdownProps {
  activity: StravaActivityDetail;
}

export function LapBreakdown({ activity }: LapBreakdownProps) {
  if (!activity.laps || activity.laps.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lap Breakdown</h3>
        <p className="text-gray-600">No lap data available for this activity.</p>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPace = (metersPerSecond: number): string => {
    if (!metersPerSecond) return '--';
    const pacePerKm = 1000 / metersPerSecond / 60; // minutes per km
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)}km`;
  };

  const formatHeartRate = (bpm?: number): string => {
    return bpm ? `${Math.round(bpm)}` : '--';
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lap Breakdown</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-700">Lap</th>
              <th className="text-left py-2 px-2 font-medium text-gray-700">Distance</th>
              <th className="text-left py-2 px-2 font-medium text-gray-700">Time</th>
              <th className="text-left py-2 px-2 font-medium text-gray-700">Pace</th>
              <th className="text-left py-2 px-2 font-medium text-gray-700">Avg HR</th>
              <th className="text-left py-2 px-2 font-medium text-gray-700">Max HR</th>
            </tr>
          </thead>
          <tbody>
            {activity.laps.map((lap: any, index: number) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{index + 1}</td>
                <td className="py-3 px-2">{formatDistance(lap.distance)}</td>
                <td className="py-3 px-2">{formatDuration(lap.moving_time)}</td>
                <td className="py-3 px-2">{formatPace(lap.average_speed)}</td>
                <td className="py-3 px-2">{formatHeartRate(lap.average_heartrate)}</td>
                <td className="py-3 px-2">{formatHeartRate(lap.max_heartrate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
