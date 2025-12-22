'use client';

import { useState } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { BottomNav } from '../navigation/BottomNav';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 bg-white rounded-md shadow-md text-gray-600 hover:text-gray-900"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="pb-16 lg:pb-0">
          <div className="px-4 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation for mobile */}
      <BottomNav />
    </div>
  );
}
