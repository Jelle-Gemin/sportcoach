import React from 'react';
import { Race, RaceResponse } from '@/types/race';
import { Pencil, X, Star } from 'lucide-react';
import { formatDuration, getDaysUntil } from '@/utils/timeUtils';

// Function to format race type for display
const formatRaceType = (raceType: string): string => {
  const raceTypeMap: Record<string, string> = {
    '5K': '5K run',
    '10K': '10K run',
    'HALF_MARATHON': 'Half marathon',
    'MARATHON': 'Marathon',
    'ULTRA_50K': '50K ultra run',
    'ULTRA_100K': '100K ultra run',
    'TRIATHLON_SPRINT': 'Sprint distance triathlon',
    'TRIATHLON_OLYMPIC': 'Olympic distance triathlon',
    'TRIATHLON_HALF': '70.3 triathlon',
    'TRIATHLON_FULL': '140.6 triathlon',
    'CENTURY_RIDE': 'Century ride',
    'GRAN_FONDO': 'Gran fondo',
    'CUSTOM': 'Custom race'
  };

  return raceTypeMap[raceType] || raceType.replace(/_/g, ' ').toLowerCase();
};

interface PlannedRacesProps {
  races: RaceResponse[];
  onEdit: (race: RaceResponse) => void;
  onDelete: (raceId: string) => void;
  onAdd: () => void;
}

export function PlannedRaces({
  races,
  onEdit,
  onDelete,
  onAdd,
}: PlannedRacesProps) {
  if (races.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">No Planned Races</h3>
          <p className="text-gray-600 mb-4">
            Add your upcoming races to help AI generate personalized training
            plans
          </p>
          <button
            onClick={onAdd}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Race
          </button>
        </div>
      </div>
    );
  }

  // Sort races by date (earliest first)
  const sortedRaces = [...races].sort(
    (a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime()
  );

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎯 Planned Races
        </h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Race
        </button>
      </div>

      <div className="space-y-4">
        {sortedRaces.map((race) => {
          const daysUntil = getDaysUntil(race.raceDate);
          const goalTime = formatDuration(race.goalTime);
          const estimatedTime = formatDuration(race.estimatedTime);
          const timeDiff = race.goalTime - race.estimatedTime;
          const isGoalRealistic = timeDiff >= 0;

          return (
            <div
              key={race._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{race.raceName}</h3>
                    {race.isTargetRace && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Target Race
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{formatRaceType(race.raceType)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(race)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit race"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(race._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete race"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📅</span>
                  <span>
                    {new Date(race.raceDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-gray-500">
                    ({daysUntil > 0 ? `in ${daysUntil} days` : "today"})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600">🎯</span>
                  <span>
                    Goal: <span className="font-semibold">{goalTime}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📊</span>
                  <span>
                    Estimated:{" "}
                    <span className="font-semibold">{estimatedTime}</span>
                    <span className="text-gray-500 ml-1">
                      (based on current fitness)
                    </span>
                  </span>
                </div>

                {!isGoalRealistic && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-xs text-yellow-700">
                      Your goal is ambitious! Consider adjusting your training
                      plan or goal time.
                    </span>
                  </div>
                )}

                {race.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">📍</span>
                    <span>{race.location}</span>
                  </div>
                )}

                {race.isTargetRace && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-card rounded">
                    <span>⭐</span>
                    <span className="text-xs text-gray-700">
                      Target race for current training plan
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-card rounded-lg">
        <p className="text-sm text-gray-700">
          💡 <strong>Tip:</strong> Add races to help AI generate training plans
          tailored to your goals
        </p>
      </div>
    </div>
  );
}
