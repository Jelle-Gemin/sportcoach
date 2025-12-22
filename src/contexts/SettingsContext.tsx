'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserSettings {
  // Units & Preferences
  distance: 'miles' | 'kilometers';
  elevation: 'feet' | 'meters';
  temperature: 'fahrenheit' | 'celsius';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

  // Notifications
  workoutReminders: boolean;
  trainingPlanUpdates: boolean;
  newStravaActivities: boolean;
  weeklyProgressSummary: boolean;
  achievementUnlocked: boolean;

  // Sync Settings
  autoSync: boolean;
  syncFrequency: 'Every hour' | 'Every 6 hours' | 'Every 12 hours' | 'Daily';
  backgroundSync: boolean;

  // AI Settings
  aiInsights: boolean;
  autoAdjustWorkouts: boolean;
  trainingLoadWarnings: boolean;
}

const defaultSettings: UserSettings = {
  distance: 'kilometers',
  elevation: 'meters',
  temperature: 'celsius',
  dateFormat: 'DD/MM/YYYY',
  workoutReminders: true,
  trainingPlanUpdates: true,
  newStravaActivities: true,
  weeklyProgressSummary: true,
  achievementUnlocked: false,
  autoSync: true,
  syncFrequency: 'Every 6 hours',
  backgroundSync: true,
  aiInsights: true,
  autoAdjustWorkouts: true,
  trainingLoadWarnings: true,
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      setError(null);
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError('Failed to save settings');
      // Revert on error
      await loadSettings();
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
