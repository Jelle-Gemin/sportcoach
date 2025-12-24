'use client';

import { useSettings } from '../../contexts/SettingsContext';

export function UnitsPreferences() {
  const { settings, updateSettings } = useSettings();

  const handleDistanceChange = (value: 'miles' | 'kilometers') => {
    updateSettings({ distance: value });
  };

  const handleElevationChange = (value: 'feet' | 'meters') => {
    updateSettings({ elevation: value });
  };

  const handleTemperatureChange = (value: 'fahrenheit' | 'celsius') => {
    updateSettings({ temperature: value });
  };

  const handleDateFormatChange = (value: string) => {
    updateSettings({ dateFormat: value as any });
  };

  return (
    <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Units & Preferences
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Distance
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="distance"
                value="miles"
                checked={settings.distance === 'miles'}
                onChange={() => handleDistanceChange('miles')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Miles</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="distance"
                value="kilometers"
                checked={settings.distance === 'kilometers'}
                onChange={() => handleDistanceChange('kilometers')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Kilometers</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Elevation
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="elevation"
                value="feet"
                checked={settings.elevation === 'feet'}
                onChange={() => handleElevationChange('feet')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Feet</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="elevation"
                value="meters"
                checked={settings.elevation === 'meters'}
                onChange={() => handleElevationChange('meters')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Meters</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperature
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="temperature"
                value="fahrenheit"
                checked={settings.temperature === 'fahrenheit'}
                onChange={() => handleTemperatureChange('fahrenheit')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Fahrenheit</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="temperature"
                value="celsius"
                checked={settings.temperature === 'celsius'}
                onChange={() => handleTemperatureChange('celsius')}
                className="text-primary"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Celsius</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Format
          </label>
          <select
            value={settings.dateFormat}
            onChange={(e) => handleDateFormatChange(e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-card dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );
}
