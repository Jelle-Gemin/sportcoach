'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';

import { TodaysWorkoutCard } from '../../components/dashboard/TodaysWorkoutCard';
import { WeeklySummaryCard } from '../../components/dashboard/WeeklySummaryCard';
import { UpcomingWorkoutsCard } from '../../components/dashboard/UpcomingWorkoutsCard';
import { KeyMetricsCards } from '../../components/dashboard/KeyMetricsCards';
import { RecentActivitiesCard } from '../../components/dashboard/RecentActivitiesCard';
import { CurrentPlanCard } from '../../components/dashboard/CurrentPlanCard';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, Athlete!
          </h1>
          <p className="text-gray-600 mt-2">
            Ready to start your training session?
          </p>
        </div>

        {/* Current Training Plan */}
        <CurrentPlanCard />

        {/* Today's Workout and Weekly Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodaysWorkoutCard />
          <WeeklySummaryCard />
        </div>

        {/* Upcoming Workouts */}
        <UpcomingWorkoutsCard />

        {/* Key Metrics */}
        <KeyMetricsCards />

        {/* Recent Activities */}
        <RecentActivitiesCard />
      </div>
    </AppLayout>
  );
}
