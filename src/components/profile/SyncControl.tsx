'use client';

import React from 'react';
import { useContinuousSync } from '../../hooks/useContinuousSync';
import { useTotalActivities } from '../../hooks/useTotalActivities';

export function SyncControl() {
  const { totalActivities } = useTotalActivities();

  const {
    isLoading,
    progress,
    error,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
  } = useContinuousSync();

  const getStatusText = () => {
    if (!progress) return 'Ready to sync historical activities';

    switch (progress.status) {
      case 'not_started':
        return 'Ready to sync historical activities';
      case 'syncing':
        return 'Syncing historical activities...';
      case 'paused':
        return 'Sync paused';
      case 'completed':
        return 'All activities synced!';
      case 'error':
        return 'Sync error occurred';
      default:
        return 'Unknown status';
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.totalAthleteActivities === 0) return 0;
    return Math.round((progress.activitiesProcessed / progress.totalAthleteActivities) * 100);
  };

  const canStart = progress?.status === 'not_started' || progress?.status === 'completed';
  const canPause = progress?.status === 'syncing';
  const canResume = progress?.status === 'paused';
  const canCancel = progress?.status === 'syncing' || progress?.status === 'paused';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Historical Activity Sync</h2>
        <div className="flex space-x-2">
          {canStart && (
            <button
              onClick={startSync}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Full Sync'}
            </button>
          )}
          {canPause && (
            <button
              onClick={pauseSync}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={resumeSync}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resume
            </button>
          )}
          {canCancel && (
            <button
              onClick={cancelSync}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{getStatusText()}</span>
            {progress && (totalActivities || progress.totalAthleteActivities > 0) && (
              <span>{progress.activitiesProcessed} / {totalActivities} activities</span>
            )}
          </div>
          {progress?.status === 'syncing' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          )}
        </div>

        {progress?.status === 'syncing' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Rate Limit Status:</span>
              <div className="font-medium">
                {progress.rateLimitRequestsThisWindow} / 100 requests this window
              </div>
              <div className="text-xs text-gray-500">
                Resets in {Math.ceil((new Date(progress.rateLimitNextReset).getTime() - Date.now()) / 60000)} minutes
              </div>
            </div>
            <div>
              <span className="text-gray-600">Daily Usage:</span>
              <div className="font-medium">
                {progress.rateLimitRequestsToday} / 1000 requests today
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Historical sync completed! All your activities have been synced.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
