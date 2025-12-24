'use client';

import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface ActivityFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    type: string;
    dateRange: string;
    distance: string;
    pace: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ActivityFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange
}: ActivityFiltersProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-card placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700 mr-2">Filters:</span>
        </div>

        {/* Activity Type */}
        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="all">All Types</option>
          <option value="run">Run</option>
          <option value="ride">Ride</option>
          <option value="swim">Swim</option>
          <option value="workout">Workout</option>
        </select>

        {/* Date Range */}
        <select
          value={filters.dateRange}
          onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>

        {/* Distance */}
        <select
          value={filters.distance}
          onChange={(e) => onFiltersChange({ ...filters, distance: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="all">Any Distance</option>
          <option value="short">Short (&lt;10km)</option>
          <option value="medium">Medium (10-21km)</option>
          <option value="long">Long (&gt;21km)</option>
        </select>

        {/* Sort */}
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="distance-desc">Longest First</option>
          <option value="distance-asc">Shortest First</option>
          <option value="pace-asc">Fastest Pace</option>
          <option value="pace-desc">Slowest Pace</option>
        </select>
      </div>
    </div>
  );
}
