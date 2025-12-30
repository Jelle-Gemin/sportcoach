import React, { useState, useEffect } from 'react';
import { Race, RACE_TYPES } from '@/types/race';
import { X, Calendar, MapPin } from 'lucide-react';

interface EditRaceModalProps {
  race: Race;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
  onDelete: () => void;
}

export function EditRaceModal({ race, onClose, onSave, onDelete }: EditRaceModalProps) {
  const [raceName, setRaceName] = useState(race.raceName);
  const [raceType, setRaceType] = useState(race.raceType);
  const [raceDate, setRaceDate] = useState(
    new Date(race.raceDate).toISOString().split('T')[0]
  );
  const [location, setLocation] = useState(race.location || '');
  const [goalTime, setGoalTime] = useState({
    hours: Math.floor(race.goalTime / 3600),
    minutes: Math.floor((race.goalTime % 3600) / 60),
    seconds: race.goalTime % 60,
  });
  const [isTargetRace, setIsTargetRace] = useState(race.isTargetRace || false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update form state when race prop changes
  useEffect(() => {
    setRaceName(race.raceName);
    setRaceType(race.raceType);
    setRaceDate(new Date(race.raceDate).toISOString().split('T')[0]);
    setLocation(race.location || '');
    setGoalTime({
      hours: Math.floor(race.goalTime / 3600),
      minutes: Math.floor((race.goalTime % 3600) / 60),
      seconds: race.goalTime % 60,
    });
    setIsTargetRace(race.isTargetRace || false);
  }, [race]);

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
      onClose(); // Close modal immediately after successful save
    } catch (error) {
      console.error('Failed to save race:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-bold mb-4">Delete Race</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{race.raceName}"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Race
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Edit Race</h2>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
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
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete Race
            </button>
            <div className="flex-1"></div>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !raceName.trim() || !raceType || !raceDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
