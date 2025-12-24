import React from 'react';
import Image from 'next/image';
import { StravaAthlete } from '@/services/stravaApi';

interface ProfileHeaderProps {
  athlete: StravaAthlete;
}

export function ProfileHeader({ athlete }: ProfileHeaderProps) {
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
        {/* Avatar */}
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
          <Image
            src={athlete.profile}
            alt={`${athlete.firstname} ${athlete.lastname} avatar`}
            fill
            className="rounded-full object-cover"
            onError={(e) => {
              // Fallback to a default avatar if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${athlete.firstname} ${athlete.lastname}`
              )}&background=3b82f6&color=fff&size=128`;
            }}
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {athlete.firstname} {athlete.lastname}
          </h1>

          <p className="text-lg text-gray-600 mb-2">@{athlete.username}</p>

          {/* Location */}
          {(athlete.city || athlete.state || athlete.country) && (
            <p className="text-gray-700 mb-2">
              {[athlete.city, athlete.state, athlete.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}

          {/* Bio */}
          {athlete.bio && (
            <p className="text-gray-700 mb-3">{athlete.bio}</p>
          )}

          {/* Member since */}
          <p className="text-sm text-gray-600 mb-3">
            Member since {formatDate(athlete.created_at)}
          </p>

          {/* Followers/Following */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              <span className="font-semibold text-gray-900">{athlete.follower_count}</span> Followers
            </span>
            <span>
              <span className="font-semibold text-gray-900">{athlete.friend_count}</span> Following
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
