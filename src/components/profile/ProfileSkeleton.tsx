import React from 'react';

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Header Skeleton */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar Skeleton */}
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>

          {/* Profile Info Skeleton */}
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3 mb-4"></div>

        {/* Tabs Skeleton */}
        <div className="flex space-x-2 mb-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-3">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20 mx-auto"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities Skeleton */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
