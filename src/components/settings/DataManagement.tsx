'use client';

import { useState } from 'react';

export function DataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/profile/export', { method: 'GET' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sportcoach-data-export.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache? This will remove locally stored data.')) {
      return;
    }

    try {
      setIsClearing(true);
      // Clear local storage/cache
      localStorage.clear();
      // Could also clear IndexedDB, service worker cache, etc.
      alert('Cache cleared successfully.');
    } catch (error) {
      console.error('Clear cache failed:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch('/api/profile', { method: 'DELETE' });
      if (response.ok) {
        // Redirect to home or logout
        window.location.href = '/';
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete account failed:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Data Management
      </h3>

      <div className="space-y-4">
        <div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export All Data'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Download all your activities and training data
          </p>
        </div>

        <div>
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Clear locally stored data to free up space
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Permanently delete your account and all data
          </p>
        </div>
      </div>
    </div>
  );
}
