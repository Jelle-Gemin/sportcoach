import React, { useState } from 'react';
import { RACE_TYPES } from '@/types/race';
import { X, Calendar, MapPin } from 'lucide-react';

interface AddRaceModalProps {
  onClose: () => void;
  onSave: (raceData: any) => Promise<void>;
}

export function AddRaceModal({ onClose, onSave }: AddRaceModalProps) {
  const [raceName, setRaceName] = useState('');
  const [raceType, setRaceType] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [location, setLocation] = useState('');
  const [goalTime, setGoalTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isTargetRace, setIsTargetRace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const handleSave = async () => {
    if (!raceName.trim() || !raceType || !raceDate) return;

    const goalTimeSeconds = goalTime.hours * 3600 + goalTime.minutes * 60 + goalTime.seconds;

    setLoading(true);
    try {
      await onSave({
        raceName: raceName.trim(),
        raceType,
        raceDate,
        location: location.trim() || undefined,
        goalTime: goalTimeSeconds,
        isTargetRace,
      });
    } catch (error) {
      console.error('Failed to save race:', error);
    } finally {
      setLoading(false);
    }
  };

  const goalTimeSeconds = goalTime.hours * 3600 + goalTime.minutes * 60 + goalTime.seconds;
  const isGoalValid = goalTimeSeconds > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Add Planned Race</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Race Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Race Name *
              </label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Chicago Marathon 2024"
              />
            </div>

            {/* Race Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Race Type *
              </label>
              <select
                value={raceType}
                onChange={(e) => setRaceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card"
              >
                <option value="">Select race type</option>
                {Object.keys(RACE_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Race Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Race Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Chicago, IL"
                />
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Goal Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Finish Time *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={goalTime.hours}
                    onChange={(e) => setGoalTime(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    placeholder="3"
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">Hours</div>
                </div>
                <div className="flex items-center justify-center text-xl font-bold text-gray-400">:</div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalTime.minutes}
                    onChange={(e) => setGoalTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    placeholder="30"
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">Minutes</div>
                </div>
                <div className="flex items-center justify-center text-xl font-bold text-gray-400">:</div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalTime.seconds}
                    onChange={(e) => setGoalTime(prev => ({ ...prev, seconds: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    placeholder="00"
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">Seconds</div>
                </div>
              </div>
            </div>

            {/* Estimated Time Display */}
            {isGoalValid && estimatedTime && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-1">
                  📊 Based on your current fitness:
                </p>
                <p className="text-sm font-semibold text-blue-600">
                  Estimated finish time: {Math.floor(estimatedTime / 3600)}:
                  {String(Math.floor((estimatedTime % 3600) / 60)).padStart(2, '0')}:
                  {String(estimatedTime % 60).padStart(2, '0')}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {goalTimeSeconds > estimatedTime
                    ? "Your goal is achievable with consistent training!"
                    : "Your goal is ambitious! Consider adjusting your training plan."}
                </p>
              </div>
            )}

            {/* Target Race */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTargetRace"
                checked={isTargetRace}
                onChange={(e) => setIsTargetRace(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isTargetRace" className="ml-2 text-sm text-gray-700">
                Set as target race for training plan
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !raceName.trim() || !raceType || !raceDate || !isGoalValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Race'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
