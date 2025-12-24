import React from 'react';
import { StravaActivityDetail } from '@/services/stravaApi';

interface RouteMapProps {
  activity: StravaActivityDetail;
}

export function RouteMap({ activity }: RouteMapProps) {
  return (
    <div className="bg-card rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Map</h3>
      <div className="h-80 flex items-center justify-center bg-gray-50 rounded">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p>Interactive route map</p>
          <p className="text-sm">Map implementation pending</p>
          {activity.map.summary_polyline && (
            <p className="text-xs mt-2 text-gray-400">
              Polyline data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
