'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ProgressChartsProps {
  timeRange: '4weeks' | '12weeks' | 'year' | 'all';
}

interface VolumeData {
  week: string;
  distance: number;
}

interface PaceData {
  week: string;
  run: number | null;
  ride: number | null;
}

interface Summary {
  totalDistance: number;
  avgWeeklyDistance: number;
  maxWeeklyDistance: number;
  runImprovement: number;
  rideImprovement: number;
}

interface ApiResponse {
  volumeData: VolumeData[];
  paceData: PaceData[];
  summary: Summary;
}

export function ProgressCharts({ timeRange }: ProgressChartsProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgressData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/progress?timeRange=${timeRange}`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress data');
        }
        const result: ApiResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [timeRange]);

  const formatPace = (pace: number | null): string => {
    if (!pace || pace <= 0) return 'N/A';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatImprovement = (improvement: number, type: 'run' | 'ride'): string => {
    if (improvement === 0) return '0';
    const sign = improvement > 0 ? (type === 'run' ? '-' : '+') : (type === 'run' ? '+' : '-');
    if (type === 'run') {
      const minutes = Math.floor(Math.abs(improvement));
      const seconds = Math.round((Math.abs(improvement) - minutes) * 60);
      return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${sign}${Math.abs(improvement).toFixed(1)}`;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { volumeData, paceData, summary } = data;

  const currentDistance = volumeData.length > 0 ? volumeData[volumeData.length - 1].distance : 0;
  const validRunWeeks = paceData.filter(w => w.run && w.run > 0);
  const firstRunPace = validRunWeeks.length > 0 ? validRunWeeks[0].run : null;
  const lastRunPace = validRunWeeks.length > 0 ? validRunWeeks[validRunWeeks.length - 1].run : null;
  const validRideWeeks = paceData.filter(w => w.ride && w.ride > 0);
  const firstRideSpeed = validRideWeeks.length > 0 ? validRideWeeks[0].ride : null;
  const lastRideSpeed = validRideWeeks.length > 0 ? validRideWeeks[validRideWeeks.length - 1].ride : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Training Volume Trend */}
      <div className="bg-card rounded-lg shadow-sm p-6">
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
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ fill: '#6366F1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Current: {currentDistance}km • Peak: {summary.maxWeeklyDistance}km • Avg: {summary.avgWeeklyDistance}km
        </div>
      </div>

      {/* Pace Improvement */}
      <div className="bg-card rounded-lg shadow-sm p-6">
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
          Run: {formatPace(firstRunPace)}/km → {formatPace(lastRunPace)}/km ({formatImprovement(summary.runImprovement, 'run')} sec) • Ride: {firstRideSpeed?.toFixed(1)} km/h → {lastRideSpeed?.toFixed(1)} km/h ({formatImprovement(summary.rideImprovement, 'ride')} km/h)
        </div>
      </div>
    </div>
  );
}
