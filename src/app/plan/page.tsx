"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlanHeader } from '../../components/plan/PlanHeader';
import { WeeklyCalendar } from '../../components/plan/WeeklyCalendar';
import { AIInsightsCard } from '../../components/plan/AIInsightsCard';
import { PlanOverview } from '../../components/plan/PlanOverview';
import { AppLayout } from '@/components/layout/AppLayout';

export default function PlanPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(4);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
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
      {/* Plan Header */}
      <PlanHeader />

      {/* Current Week Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Week {currentWeek}: Base Building
          </h2>
          <div className="text-sm text-gray-600">
            Target: 42km • 5 workouts
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-300"
            style={{ width: '60%' }}
          />
        </div>
        <div className="text-sm text-gray-600 text-right">
          60% Complete
        </div>
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar weekNumber={currentWeek} />

      {/* AI Insights */}
      <AIInsightsCard />

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          ← Previous Week
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Week</span>
          <select
            value={currentWeek}
            onChange={(e) => setCurrentWeek(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">of 16</span>
        </div>

        <button
          onClick={() => setCurrentWeek(Math.min(16, currentWeek + 1))}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Next Week →
        </button>
      </div>

      {/* Full Plan Overview */}
      <PlanOverview />
      </div>
    </AppLayout>
  );
}
