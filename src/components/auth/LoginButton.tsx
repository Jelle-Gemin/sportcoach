'use client';

import { useAuth } from "@/contexts/AuthContext";


export function LoginButton() {
  const { login } = useAuth();

  return (
    <button
      onClick={login}
      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:ring-2 focus:ring-orange-500"
    >
      Login with Strava
    </button>
  );
}
