'use client';

import React, { useState } from 'react';
import { useRaces } from '@/hooks/useRaces';
import { usePostRaceCheck } from '@/hooks/usePostRaceCheck';
import { AddRaceModal } from './AddRaceModal';
import { PostRacePopup } from './PostRacePopup';
import { Race, RaceResponse } from '@/types/race';
import { CompletedRaces } from './CompletedRaces';
import { EditRaceModal } from './EditRaceModal';
import { PlannedRaces } from './PlannedRaces';

export function RaceManagement() {
  const { plannedRaces, completedRaces, loading, error, addRace, updateRace, deleteRace } = useRaces();
  const { hasPostRacePopup, postRaceData, dismissPopup, completeRace, skipRace } = usePostRaceCheck();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRace, setEditingRace] = useState<RaceResponse | null>(null);

  const handleAddRace = async (raceData: any) => {
    try {
      await addRace(raceData);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add race:', error);
    }
  };

  const handleEditRace = async (raceData: any) => {
    if (!editingRace) return;

    try {
      await updateRace(editingRace._id, raceData);
      setEditingRace(null);
    } catch (error) {
      console.error('Failed to update race:', error);
    }
  };

  const handleDeleteRace = async (raceId: string) => {
    if (confirm('Are you sure you want to delete this race?')) {
      try {
        await deleteRace(raceId);
      } catch (error) {
        console.error('Failed to delete race:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load races: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PlannedRaces
          races={plannedRaces}
          onEdit={setEditingRace}
          onDelete={handleDeleteRace}
          onAdd={() => setShowAddModal(true)}
        />

        <CompletedRaces races={completedRaces} />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddRaceModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddRace}
        />
      )}

      {editingRace && (
        <EditRaceModal
          race={editingRace}
          onClose={() => setEditingRace(null)}
          onSave={handleEditRace}
          onDelete={() => handleDeleteRace(editingRace._id)}
        />
      )}

      {/* Post-race popup */}
      {hasPostRacePopup && postRaceData && (
        <PostRacePopup
          race={postRaceData}
          onComplete={completeRace}
          onSkip={skipRace}
          onDismiss={dismissPopup}
        />
      )}
    </>
  );
}
