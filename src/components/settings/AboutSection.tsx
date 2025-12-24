'use client';

export function AboutSection() {
  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        About
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Version</h4>
            <p className="text-sm text-gray-600">1.0.0</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex space-x-4">
            <button className="text-sm text-primary hover:text-primary-dark">
              Privacy Policy
            </button>
            <button className="text-sm text-primary hover:text-primary-dark">
              Terms of Service
            </button>
            <button className="text-sm text-primary hover:text-primary-dark">
              Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
