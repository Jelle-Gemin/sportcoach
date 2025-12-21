'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ProgressChartsProps {
  timeRange: '4weeks' | '12weeks' | 'year' | 'all';
}

export function ProgressCharts({ timeRange }: ProgressChartsProps) {
  // Mock data - in real app this would come from API
  const volumeData = [
    { week: 'Week 1', distance: 35 },
    { week: 'Week 2', distance: 38 },
    { week: 'Week 3', distance: 42 },
    { week: 'Week 4', distance: 45 },
  ];

  const paceData = [
    { week: 'Week 1', run: 5.45, ride: 25.2 },
    { week: 'Week 2', run: 5.38, ride: 25.5 },
    { week: 'Week 3', run: 5.32, ride: 25.8 },
    { week: 'Week 4', run: 5.24, ride: 26.1 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Training Volume Trend */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Training Volume Trend
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#FC4C02"
                strokeWidth={2}
                dot={{ fill: '#FC4C02' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Current: 45km • Peak: 65km • Avg: 38km
        </div>
      </div>

      {/* Pace Improvement */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pace Improvement
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={paceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="run"
                stroke="#10B981"
                strokeWidth={2}
                name="Run Pace (min/km)"
              />
              <Line
                type="monotone"
                dataKey="ride"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Ride Speed (km/h)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Run: 5:24/km → 5:16/km (-8 sec) • Ride: 24.5 km/h → 25.2 km/h (+0.7 km/h)
        </div>
      </div>
    </div>
  );
}
