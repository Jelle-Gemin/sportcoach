'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useActivityDetail } from '../../../hooks/useActivityDetail';
import { AppLayout } from '../../../components/layout/AppLayout';
import { ActivityHeader } from '../../../components/activities/ActivityHeader';
import { ActivityMetrics } from '../../../components/activities/ActivityMetrics';
import { HeartRateChart } from '../../../components/activities/charts/HeartRateChart';
import { ElevationChart } from '../../../components/activities/charts/ElevationChart';
import { LapBreakdown } from '../../../components/activities/LapBreakdown';
import { ActivityAnalysis } from '../../../components/activities/ActivityAnalysis';
import { RouteMap } from '@/components/activities/RouteMap';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const activityId = params.id as string;

  const { activity, streams, loading, error } = useActivityDetail(activityId);

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

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !activity) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Unable to load activity details.'}
            </p>
            <button
              onClick={() => router.push('/activities')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Activities
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Back Navigation */}
        <button
          onClick={() => router.push('/activities')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Activities
        </button>

        {/* Activity Header */}
        <ActivityHeader activity={activity} />

        {/* Key Metrics */}
        <ActivityMetrics activity={activity} />

        {/* Route Map */}
        <RouteMap activity={activity} />

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <HeartRateChart activity={activity} streams={streams} />
        </div>

        <ElevationChart streams={streams} />

        {/* Lap Breakdown */}
        <LapBreakdown activity={activity} />

        {/* AI Analysis */}
        <ActivityAnalysis activity={activity} streams={streams} />
      </div>
    </AppLayout>
  );
}
