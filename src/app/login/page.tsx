'use client';

import { LoginButton } from '../../components/auth/LoginButton';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to SportCoach
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect with Strava to track your activities
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error === 'access_denied' ? 'Access denied. Please try again.' : 'An error occurred during authentication.'}
          </div>
        )}
        <div className="text-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
