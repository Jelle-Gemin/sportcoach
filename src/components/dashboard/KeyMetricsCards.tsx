'use client';

export function KeyMetricsCards() {
  // Mock data - in real app this would come from API
  const metrics = [
    {
      label: 'Weekly Volume',
      value: '42.5 km',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      label: 'Avg Pace',
      value: '5:24/km',
      change: '-8 sec',
      changeType: 'positive' as const,
    },
    {
      label: 'Training Load',
      value: '385',
      change: '+Moderate',
      changeType: 'neutral' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-card rounded-lg shadow-sm p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">
            {metric.label}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metric.value}
          </div>
          <div className={`text-sm ${
            metric.changeType === 'positive'
              ? 'text-green-600'
              : metric.changeType === 'negative'
              ? 'text-red-600'
              : 'text-gray-600'
          }`}>
            {metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}
