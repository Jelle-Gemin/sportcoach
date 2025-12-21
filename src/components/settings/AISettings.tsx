'use client';

import { CpuChipIcon } from '@heroicons/react/24/outline';

export function AISettings() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <CpuChipIcon className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          AI & Training Plans
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">AI Insights</label>
            <p className="text-sm text-gray-600">Enable personalized training insights and recommendations</p>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
            <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Auto-adjust workouts</label>
            <p className="text-sm text-gray-600">Automatically adjust training based on recent performance</p>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
            <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Training load warnings</label>
            <p className="text-sm text-gray-600">Notify when training load is too high</p>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
            <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
          </div>
        </div>
      </div>
    </div>
  );
}
