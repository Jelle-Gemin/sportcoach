'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { AccountSettings } from '../../components/settings/AccountSettings';
import { UnitsPreferences } from '../../components/settings/UnitsPreferences';
import { NotificationsSettings } from '../../components/settings/NotificationsSettings';
import { SyncSettings } from '../../components/settings/SyncSettings';
import { AISettings } from '../../components/settings/AISettings';
import { DataManagement } from '../../components/settings/DataManagement';
import { AboutSection } from '../../components/settings/AboutSection';

export default function SettingsPage() {
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account preferences and app settings
        </p>
      </div>

      {/* Settings Sections */}
      <AccountSettings />
      <UnitsPreferences />
      <NotificationsSettings />
      <SyncSettings />
      <AISettings />
      <DataManagement />
      <AboutSection />
    </div>
  );
}
