'use client';

export function NotificationsSettings() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Notifications
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Workout reminders</h4>
            <p className="text-sm text-gray-600">Get notified before scheduled workouts</p>
          </div>
          <input type="checkbox" defaultChecked className="text-primary" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Training plan updates</h4>
            <p className="text-sm text-gray-600">Notifications about plan changes and adjustments</p>
          </div>
          <input type="checkbox" defaultChecked className="text-primary" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">New Strava activities synced</h4>
            <p className="text-sm text-gray-600">When new activities are imported from Strava</p>
          </div>
          <input type="checkbox" defaultChecked className="text-primary" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Weekly progress summary</h4>
            <p className="text-sm text-gray-600">Weekly recap of your training progress</p>
          </div>
          <input type="checkbox" defaultChecked className="text-primary" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Achievement unlocked</h4>
            <p className="text-sm text-gray-600">When you reach new milestones</p>
          </div>
          <input type="checkbox" className="text-primary" />
        </div>
      </div>
    </div>
  );
}
