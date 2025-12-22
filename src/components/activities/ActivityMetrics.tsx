import React from 'react';
import { StravaActivityDetail } from '@/services/stravaApi';

interface ActivityMetricsProps {
  activity: StravaActivityDetail;
}

export function ActivityMetrics({ activity }: ActivityMetricsProps) {
  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (metersPerSecond: number): string => {
    if (!metersPerSecond) return '--';
    const pacePerKm = 1000 / metersPerSecond / 60; // minutes per km
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const formatElevation = (meters: number): string => {
    return `↑ ${Math.round(meters)}m`;
  };

  const formatHeartRate = (bpm?: number): string => {
    return bpm ? `${Math.round(bpm)} bpm` : '--';
  };

  const formatCadence = (spm?: number): string => {
    return spm ? `${Math.round(spm)} spm` : '--';
  };

  const formatCalories = (calories?: number): string => {
    return calories ? `${Math.round(calories)} kcal` : '--';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Row 1 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Distance</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatDistance(activity.distance)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Duration</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatDuration(activity.moving_time)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Pace</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatPace(activity.average_speed)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Elevation</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatElevation(activity.total_elevation_gain)}
        </div>
      </div>

      {/* Row 2 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Avg HR</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatHeartRate(activity.average_heartrate)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Max HR</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatHeartRate(activity.max_heartrate)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Cadence</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatCadence(activity.average_cadence)}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600">Calories</div>
        <div className="text-xl font-semibold text-gray-900">
          {formatCalories(activity.calories)}
        </div>
      </div>
    </div>
  );
}
