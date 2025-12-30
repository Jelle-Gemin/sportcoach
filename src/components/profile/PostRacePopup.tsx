import React, { useState } from 'react';
import { Race, RaceResponse } from '@/types/race';
import { formatDuration } from '@/utils/timeUtils';

interface PostRacePopupProps {
  race: Race;
  onComplete: (finishTime: number) => Promise<void>;
  onSkip: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function PostRacePopup({
  race,
  onComplete,
  onSkip,
  onDismiss,
}: PostRacePopupProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const finishTimeSeconds = hours * 3600 + minutes * 60 + seconds;
  const goalTimeSeconds = race.goalTime;
  const timeDifference = goalTimeSeconds - finishTimeSeconds;
  const beatGoal = timeDifference > 0;

  const handleComplete = async () => {
    if (finishTimeSeconds === 0) return;

    setLoading(true);
    try {
      await onComplete(finishTimeSeconds);
    } catch (error) {
      console.error('Failed to complete race:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipConfirm = async () => {
    setLoading(true);
    try {
      await onSkip();
    } catch (error) {
      console.error('Failed to skip race:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showSkipConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Race Skip</h2>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Are you sure you didn't compete in:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-semibold">{race.raceName}</p>
              <p className="text-sm text-gray-600">
                {new Date(race.raceDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <p className="text-sm text-gray-600">
              This race will be marked as skipped and moved to your race history.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSkipConfirmation(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleSkipConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Confirm Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">
            Congratulations on your race!
          </h2>
          <p className="font-semibold text-lg">{race.raceName}</p>
          <p className="text-gray-600">
            {new Date(race.raceDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="font-semibold mb-4">How did it go?</p>

          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">Your goal was:</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatDuration(goalTimeSeconds)}
            </p>
          </div>

          <p className="text-sm font-medium mb-2">What was your finish time?</p>

          {/* Time Input */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) =>
                  setHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end pb-2 text-2xl font-bold text-gray-400">
              :
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  setMinutes(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end pb-2 text-2xl font-bold text-gray-400">
              :
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">
                Seconds
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) =>
                  setSeconds(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Goal Comparison */}
          {finishTimeSeconds > 0 && (
            <div
              className={`rounded-lg p-3 mb-4 ${
                beatGoal ? "bg-green-50" : "bg-yellow-50"
              }`}
            >
              <p
                className={`font-semibold ${
                  beatGoal ? "text-green-700" : "text-yellow-700"
                }`}
              >
                {beatGoal ? "🎯 You beat your goal by " : "⏱️ Goal missed by "}
                {formatDuration(Math.abs(timeDifference))}
                {beatGoal ? "! Amazing work!" : ". Still a great achievement!"}
              </p>
            </div>
          )}

          {/* Didn't Compete Button */}
          <button
            onClick={() => setShowSkipConfirmation(true)}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors mb-4"
          >
            I didn't compete in this race
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={finishTimeSeconds === 0 || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Result"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
