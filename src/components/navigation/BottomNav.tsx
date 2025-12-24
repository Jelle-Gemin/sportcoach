'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Training Plan', href: '/plan', icon: ClipboardDocumentListIcon },
  { name: 'Activities', href: '/activities', icon: ChartBarIcon },
  { name: 'Progress', href: '/progress', icon: ChartBarIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cardborder-t border-gray-200 bg-white">
      <nav className="flex">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors
                ${isActive
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  h-6 w-6 mb-1 transition-colors
                  ${isActive ? 'text-primary' : 'text-gray-400'}
                `}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
