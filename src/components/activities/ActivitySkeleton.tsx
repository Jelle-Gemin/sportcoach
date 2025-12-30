'use client';

import React from 'react';

export function ActivityCardSkeleton() {
    return (
        <div className="bg-card rounded-lg shadow-sm p-4 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                    {/* Title */}
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    {/* Date */}
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    {/* Stats row */}
                    <div className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                </div>
                {/* Icon placeholder */}
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            </div>
        </div>
    );
}

export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
                <ActivityCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function ActivityDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card rounded-lg p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>

            {/* Chart placeholder */}
            <div className="bg-card rounded-lg p-4">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
            </div>

            {/* Map placeholder */}
            <div className="bg-card rounded-lg p-4">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
            </div>
        </div>
    );
}
