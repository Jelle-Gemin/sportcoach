'use client';

import { UserIcon, KeyIcon, LinkIcon } from '@heroicons/react/24/outline';

export function AccountSettings() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <UserIcon className="h-6 w-6 text-gray-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          Account Settings
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-900">Email</div>
            <div className="text-sm text-gray-600">john@example.com</div>
          </div>
          <button className="text-sm text-primary hover:text-primary-dark">
            Change
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-900">Password</div>
            <div className="text-sm text-gray-600">••••••••</div>
          </div>
          <button className="text-sm text-primary hover:text-primary-dark">
            Change
          </button>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium text-gray-900">Strava Connected</div>
            <div className="text-sm text-green-600 flex items-center">
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
