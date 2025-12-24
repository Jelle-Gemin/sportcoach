'use client';

import { UserIcon, KeyIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export function AccountSettings() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <h3 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
            Account Settings
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Please log in to view account settings.</p>
      </div>
    );
  }

  const displayName = `${user.firstname} ${user.lastname}`.trim();
  const location = [user.city, user.state, user.country].filter(Boolean).join(', ');

  return (
    <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
          Account Settings
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Name</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{displayName}</div>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Username</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</div>
          </div>
        </div>

        {location && (
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Location</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{location}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Strava Connected</div>
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <LinkIcon className="h-4 w-4 mr-1" />
              ✓ Connected
            </div>
          </div>
          <button className="text-sm text-primary hover:text-primary-dark">
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
