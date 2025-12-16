import { AthleteStats, StatTotals } from '@/services/stravaApi';
import React, { useState } from 'react';

interface ProfileStatsProps {
  stats: AthleteStats;
  measurementPreference: string;
}

type TimePeriod = 'recent' | 'ytd' | 'all';

export function ProfileStats({ stats, measurementPreference }: ProfileStatsProps) {
  const [activeTab, setActiveTab] = useState<TimePeriod>('recent');

  const formatDistance = (meters: number): string => {
    if (measurementPreference === 'feet') {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(1)}mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatElevation = (meters: number): string => {
    if (measurementPreference === 'feet') {
      const feet = meters * 3.28084;
      return `${Math.round(feet)}ft`;
    }
    return `${Math.round(meters)}m`;
  };

  const getActivityStats = (type: 'ride' | 'run' | 'swim'): StatTotals => {
    const prefix = activeTab === 'recent' ? 'recent_' : activeTab === 'ytd' ? 'ytd_' : 'all_';
    return stats[`${prefix}${type}_totals` as keyof AthleteStats] as StatTotals;
  };

  const tabs = [
    { key: 'recent' as TimePeriod, label: 'Recent (4 weeks)' },
    { key: 'ytd' as TimePeriod, label: 'Year to Date' },
    { key: 'all' as TimePeriod, label: 'All Time' },
  ];

  const activities = [
    { type: 'ride' as const, icon: '🚴', label: 'Rides' },
    { type: 'run' as const, icon: '🏃', label: 'Runs' },
    { type: 'swim' as const, icon: '🏊', label: 'Swims' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Statistics</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activities.map(({ type, icon, label }) => {
          const activityStats = getActivityStats(type);

          return (
            <div key={type} className="text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <h3 className="font-semibold text-gray-900 mb-3">{label}</h3>

              <div className="space-y-3 text-base">
                <div className="text-gray-700">
                  <span className="font-bold text-lg text-gray-900">{activityStats.count}</span> activities
                </div>

                <div className="text-gray-700">
                  <span className="font-bold text-lg text-gray-900">{formatDistance(activityStats.distance)}</span>
                </div>

                <div className="text-gray-700">
                  <span className="font-bold text-lg text-gray-900">{formatDuration(activityStats.moving_time)}</span>
                </div>

                <div className="text-gray-700">
                  <span className="font-bold text-lg text-gray-900">{formatElevation(activityStats.elevation_gain)}</span> elevation
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats for All Time */}
      {activeTab === 'all' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
            <div className="text-gray-700">
              <span className="font-medium text-gray-900">Longest Ride:</span> <span className="font-bold text-lg text-gray-900">{formatDistance(stats.biggest_ride_distance)}</span>
            </div>
            <div className="text-gray-700">
              <span className="font-medium text-gray-900">Biggest Climb:</span> <span className="font-bold text-lg text-gray-900">{formatElevation(stats.biggest_climb_elevation_gain)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
