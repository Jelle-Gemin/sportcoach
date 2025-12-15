'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginButton } from '../components/auth/LoginButton';
//import { LogoutButton } from '../components/auth/LogoutButton';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            SportCoach App
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect with Strava to track your activities
          </p>
        </div>
        <AuthStatus />
      </div>
    </div>
  );
}

function AuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="text-center space-y-4">
        <div>
          <p className="text-lg font-medium text-gray-900">
            Welcome, {user?.firstname || 'Athlete'}!
          </p>
          {user?.profile && (
            <img
              src={user.profile}
              alt="Profile"
              className="w-16 h-16 rounded-full mx-auto mt-2"
            />
          )}
        </div>
        
      </div>
    );
  }

  return (
    <div className="text-center">
      <LoginButton />
    </div>
  );
}
