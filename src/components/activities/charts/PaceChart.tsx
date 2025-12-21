'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaceChartProps {
  streams: any;
}

export function PaceChart({ streams }: PaceChartProps) {
  if (!streams?.pace?.data || !streams?.time?.data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pace Chart</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No pace data available
        </div>
      </div>
    );
  }

  // Convert pace data to chart format
  const chartData = streams.time.data.map((time: number, index: number) => ({
    time: Math.round(time / 60), // Convert to minutes
    pace: streams.pace.data[index] ? Math.round(streams.pace.data[index] * 100) / 100 : null, // Round to 2 decimal places
  })).filter(point => point.pace !== null);

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTooltipPace = (value: number) => {
    return [formatPace(value), 'Pace (min/km)'];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pace Chart</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft' }}
              tickFormatter={formatPace}
            />
            <Tooltip
              formatter={formatTooltipPace}
              labelFormatter={(value) => `Time: ${value} min`}
            />
            <Line
              type="monotone"
              dataKey="pace"
              stroke="#FC4C02"
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
