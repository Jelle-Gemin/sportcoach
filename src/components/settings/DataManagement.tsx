 'use client';

export function DataManagement() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Data Management
      </h3>

      <div className="space-y-4">
        <div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Export All Data
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Download all your activities and training data
          </p>
        </div>

        <div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Clear Cache
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Clear locally stored data to free up space
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50">
            Delete Account
          </button>
          <p className="text-xs text-red-600 mt-1">
            Permanently delete your account and all data
          </p>
        </div>
      </div>
    </div>
  );
}
