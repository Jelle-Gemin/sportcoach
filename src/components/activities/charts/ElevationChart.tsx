'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ElevationChartProps {
  streams: any;
}

export function ElevationChart({ streams }: ElevationChartProps) {
  if (!streams?.altitude?.data || !streams?.distance?.data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Elevation Profile</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No elevation data available
        </div>
      </div>
    );
  }

  // Convert elevation data to chart format
  const chartData = streams.distance.data.map((distance: number, index: number) => ({
    distance: Math.round(distance / 1000 * 10) / 10, // Convert to km, round to 1 decimal
    elevation: streams.altitude.data[index] ? Math.round(streams.altitude.data[index]) : null,
  })).filter(point => point.elevation !== null);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Elevation Profile</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="distance"
              label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number | undefined) => value ? [`${value} m`, 'Elevation'] : ['N/A', 'Elevation']}
              labelFormatter={(value) => `Distance: ${value} km`}
            />
            <Line
              type="monotone"
              dataKey="elevation"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
