'use client';

export function SyncSettings() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Sync Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Auto-sync</h4>
            <p className="text-sm text-gray-600">Automatically sync new activities from Strava</p>
          </div>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input type="radio" name="autosync" value="enabled" defaultChecked className="text-primary" />
              <span className="ml-2 text-sm">Enabled</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="autosync" value="disabled" className="text-primary" />
              <span className="ml-2 text-sm">Disabled</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sync frequency
          </label>
          <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
            <option>Every hour</option>
            <option>Every 6 hours</option>
            <option>Every 12 hours</option>
            <option>Daily</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Background sync</h4>
            <p className="text-sm text-gray-600">Sync activities even when app is closed</p>
          </div>
          <input type="checkbox" defaultChecked className="text-primary" />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button className="inline-flex items-center px-4 py-2 border border-primary rounded-md text-sm font-medium text-primary bg-white hover:bg-primary hover:text-white">
            Start Full Sync
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Sync all historical activities from Strava (may take several minutes)
          </p>
        </div>
      </div>
    </div>
  );
}
