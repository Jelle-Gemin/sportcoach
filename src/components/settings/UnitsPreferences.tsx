'use client';

export function UnitsPreferences() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Units & Preferences
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Distance
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input type="radio" name="distance" value="miles" className="text-primary" />
              <span className="ml-2 text-sm">Miles</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="distance" value="kilometers" defaultChecked className="text-primary" />
              <span className="ml-2 text-sm">Kilometers</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Elevation
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input type="radio" name="elevation" value="feet" className="text-primary" />
              <span className="ml-2 text-sm">Feet</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="elevation" value="meters" defaultChecked className="text-primary" />
              <span className="ml-2 text-sm">Meters</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input type="radio" name="temperature" value="fahrenheit" className="text-primary" />
              <span className="ml-2 text-sm">Fahrenheit</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="temperature" value="celsius" defaultChecked className="text-primary" />
              <span className="ml-2 text-sm">Celsius</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );
}
