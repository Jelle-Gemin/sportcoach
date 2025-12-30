import React from 'react';
import { Race } from '@/types/race';
import { ExternalLink } from 'lucide-react';
import { formatDuration } from '@/utils/timeUtils';

interface CompletedRacesProps {
  races: Race[];
}

export function CompletedRaces({ races }: CompletedRacesProps) {
  if (races.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">No Completed Races</h3>
          <p className="text-gray-600">
            Your completed races will appear here after you log your results.
          </p>
        </div>
      </div>
    );
  }

  // Sort races by completion date (most recent first)
  const sortedRaces = [...races].sort(
    (a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime()
  );

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🏆 Completed Races
        </h2>
        <span className="text-sm text-gray-500">
          {races.length} total
        </span>
      </div>

      <div className="space-y-4">
        {sortedRaces.slice(0, 8).map((race) => {
          const goalTime = formatDuration(race.goalTime);
          const actualTime = race.actualFinishTime ? formatDuration(race.actualFinishTime) : null;
          const timeDifference = race.actualFinishTime ? race.goalTime - race.actualFinishTime : 0;
          const beatGoal = timeDifference > 0;

          return (
            <div
              key={race._id?.toString()}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{race.raceName}</h3>
                  <p className="text-sm text-gray-600">{race.raceType.replace(/_/g, ' ')}</p>
                </div>

                <button
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="View activity"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📅</span>
                  <span>
                    {new Date(race.completedAt || race.updatedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {actualTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">🎯</span>
                    <span>
                      Goal: {goalTime} • Actual: <span className="font-semibold">{actualTime}</span>
                    </span>
                  </div>
                )}

                {actualTime && (
                  <div className={`flex items-start gap-2 p-2 rounded ${
                    beatGoal ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <span className={beatGoal ? 'text-green-600' : 'text-yellow-600'}>
                      {beatGoal ? '✅' : '⏱️'}
                    </span>
                    <span className={`text-xs font-medium ${
                      beatGoal ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {beatGoal
                        ? `Beat goal by ${formatDuration(Math.abs(timeDifference))}! Amazing work!`
                        : `Goal missed by ${formatDuration(Math.abs(timeDifference))}. Still a great achievement!`
                      }
                    </span>
                  </div>
                )}

                {race.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">📍</span>
                    <span>{race.location}</span>
                  </div>
                )}

                {race.skipReason && (
                  <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">ℹ️</span>
                    <span className="text-xs text-gray-700">
                      {race.skipReason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {races.length > 8 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Completed Races ({races.length} total)
          </button>
        </div>
      )}
    </div>
  );
}
