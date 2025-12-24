'use client';

import { CpuChipIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../../contexts/SettingsContext';

export function AISettings() {
  const { settings, updateSettings } = useSettings();

  const handleAIInsightsChange = (value: boolean) => {
    updateSettings({ aiInsights: value });
  };

  const handleAutoAdjustWorkoutsChange = (value: boolean) => {
    updateSettings({ autoAdjustWorkouts: value });
  };

  const handleTrainingLoadWarningsChange = (value: boolean) => {
    updateSettings({ trainingLoadWarnings: value });
  };

  return (
    <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <CpuChipIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
          AI & Training Plans
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">AI Insights</label>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enable personalized training insights and recommendations</p>
          </div>
          <input
            type="checkbox"
            checked={settings.aiInsights}
            onChange={(e) => handleAIInsightsChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">Auto-adjust workouts</label>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically adjust training based on recent performance</p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoAdjustWorkouts}
            onChange={(e) => handleAutoAdjustWorkoutsChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">Training load warnings</label>
            <p className="text-sm text-gray-600 dark:text-gray-400">Notify when training load is too high</p>
          </div>
          <input
            type="checkbox"
            checked={settings.trainingLoadWarnings}
            onChange={(e) => handleTrainingLoadWarningsChange(e.target.checked)}
            className="text-primary"
          />
        </div>
      </div>
    </div>
  );
}
