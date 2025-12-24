'use client';

import { useSettings } from '../../contexts/SettingsContext';
import { useState } from 'react';

export function SyncSettings() {
  const { settings, updateSettings } = useSettings();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAutoSyncChange = (value: boolean) => {
    updateSettings({ autoSync: value });
  };

  const handleFrequencyChange = (value: string) => {
    updateSettings({ syncFrequency: value as any });
  };

  const handleBackgroundSyncChange = (value: boolean) => {
    updateSettings({ backgroundSync: value });
  };

  const handleFullSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/sync/initial', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start full sync');
      }
      // Could add toast notification here
    } catch (error) {
      console.error('Full sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Sync Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto-sync</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically sync new activities from Strava</p>
          </div>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="autosync"
                checked={settings.autoSync}
                onChange={() => handleAutoSyncChange(true)}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Enabled</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="autosync"
                checked={!settings.autoSync}
                onChange={() => handleAutoSyncChange(false)}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Disabled</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sync frequency
          </label>
          <select
            value={settings.syncFrequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-card dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option>Every hour</option>
            <option>Every 6 hours</option>
            <option>Every 12 hours</option>
            <option>Daily</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Background sync</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sync activities even when app is closed</p>
          </div>
          <input
            type="checkbox"
            checked={settings.backgroundSync}
            onChange={(e) => handleBackgroundSyncChange(e.target.checked)}
            className="text-primary"
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleFullSync}
            disabled={isSyncing}
            className="inline-flex items-center px-4 py-2 border border-primary rounded-md text-sm font-medium text-primary bg-card dark:bg-gray-800 hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? 'Syncing...' : 'Start Full Sync'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Sync all historical activities from Strava (may take several minutes)
          </p>
        </div>
      </div>
    </div>
  );
}
