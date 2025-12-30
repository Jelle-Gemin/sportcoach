'use client';

import React from 'react';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Welcome section */}
            <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card rounded-lg shadow-sm p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ))}
            </div>

            {/* Chart section */}
            <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
            </div>

            {/* Recent activities */}
            <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                            <div className="flex items-center space-x-4 flex-1">
                                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <div className="h-5 bg-gray-200 rounded w-16"></div>
                                <div className="h-4 bg-gray-200 rounded w-12"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming race */}
            <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="bg-card rounded-lg shadow-sm p-6 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
    );
}
