"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProgressCharts } from '../../components/progress/ProgressCharts';
import { TrainingLoadCard } from '../../components/progress/TrainingLoadCard';
import { PersonalRecordsCard } from '../../components/progress/PersonalRecordsCard';
import { TrainingConsistencyCard } from '../../components/progress/TrainingConsistencyCard';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProgressPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'4weeks' | '12weeks' | 'year' | 'all'>('4weeks');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
      <AppLayout>
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-cardrounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Progress</h1>
            <p className="text-gray-600 mt-2">
              Track your training progress, analyze trends, and view performance metrics
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {[
              { key: '4weeks', label: 'Last 4 Weeks' },
              { key: '12weeks', label: 'Last 12 Weeks' },
              { key: 'year', label: 'This Year' },
              { key: 'all', label: 'All Time' }
            ].map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timeRange === range.key
                    ? 'bg-primary text-white'
                    : 'bg-card text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <ProgressCharts timeRange={timeRange} />

      {/* Training Load */}
      <TrainingLoadCard />

      {/* Personal Records */}
      <PersonalRecordsCard />

      {/* Training Consistency */}
      <TrainingConsistencyCard />
      </div>
    </AppLayout>
  );
}
