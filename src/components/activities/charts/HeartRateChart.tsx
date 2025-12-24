'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';

interface HeartRateChartProps {
  activity: StravaActivityDetail;
  streams: Record<string, StravaStream> | null;
}

export function HeartRateChart({ activity, streams }: HeartRateChartProps) {
  if (!streams?.heartrate?.data || !streams?.time?.data) {
    return (
      <div className="bg-card rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Rate Chart</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">❤️</div>
            <p>No heart rate data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert heart rate data to chart format
  const chartData = (streams.time.data as number[]).map((time: number, index: number) => ({
    time: Math.round(time / 60), // Convert to minutes
    heartrate: (streams.heartrate.data as number[])[index] ? (streams.heartrate.data as number[])[index] : null,
  })).filter(point => point.heartrate !== null);

  return (
    <div className="bg-card rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Rate Chart</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number | undefined) => value ? [`${value} bpm`, 'Heart Rate'] : ['N/A', 'Heart Rate']}
              labelFormatter={(value) => `Time: ${value} min`}
            />
            <Line
              type="monotone"
              dataKey="heartrate"
              stroke="#EF4444"
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
