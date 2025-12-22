'use client';

import { useSettings } from '../../contexts/SettingsContext';

export function NotificationsSettings() {
  const { settings, updateSettings } = useSettings();

  const handleWorkoutRemindersChange = (value: boolean) => {
    updateSettings({ workoutReminders: value });
  };

  const handleTrainingPlanUpdatesChange = (value: boolean) => {
    updateSettings({ trainingPlanUpdates: value });
  };

  const handleNewStravaActivitiesChange = (value: boolean) => {
    updateSettings({ newStravaActivities: value });
  };

  const handleWeeklyProgressSummaryChange = (value: boolean) => {
    updateSettings({ weeklyProgressSummary: value });
  };

  const handleAchievementUnlockedChange = (value: boolean) => {
    updateSettings({ achievementUnlocked: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Notifications
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Workout reminders</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get notified before scheduled workouts</p>
          </div>
          <input
            type="checkbox"
            checked={settings.workoutReminders}
            onChange={(e) => handleWorkoutRemindersChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Training plan updates</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Notifications about plan changes and adjustments</p>
          </div>
          <input
            type="checkbox"
            checked={settings.trainingPlanUpdates}
            onChange={(e) => handleTrainingPlanUpdatesChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">New Strava activities synced</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">When new activities are imported from Strava</p>
          </div>
          <input
            type="checkbox"
            checked={settings.newStravaActivities}
            onChange={(e) => handleNewStravaActivitiesChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Weekly progress summary</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Weekly recap of your training progress</p>
          </div>
          <input
            type="checkbox"
            checked={settings.weeklyProgressSummary}
            onChange={(e) => handleWeeklyProgressSummaryChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Achievement unlocked</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">When you reach new milestones</p>
          </div>
          <input
            type="checkbox"
            checked={settings.achievementUnlocked}
            onChange={(e) => handleAchievementUnlockedChange(e.target.checked)}
            className="text-primary"
          />
        </div>
      </div>
    </div>
  );
}
