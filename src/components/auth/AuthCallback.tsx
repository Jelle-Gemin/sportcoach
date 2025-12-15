'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Athlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile: string;
}

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Authorization denied by user');
        setIsLoading(false);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setIsLoading(false);
        return;
      }

      try {
        // Exchange code for tokens
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange token');
        }

        const data = await response.json();
        setAthlete(data.athlete);
        setIsLoading(false);
      } catch (err) {
        console.error('Callback error:', err);
        setError('Failed to complete authentication');
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Completing Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we complete your login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full overflow-hidden">
              <img
                src={athlete.profile}
                alt={`${athlete.firstname} ${athlete.lastname}`}
                className="h-full w-full object-cover"
              />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome, {athlete.firstname}!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Successfully authenticated as {athlete.username}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
