import { useState, useEffect } from 'react';
import { Race, RaceResponse } from '@/types/race';

interface UsePostRaceCheckReturn {
  hasPostRacePopup: boolean;
  postRaceData: Race | null;
  dismissPopup: () => Promise<void>;
  completeRace: (finishTime: number) => Promise<void>;
  skipRace: () => Promise<void>;
}

export function usePostRaceCheck(): UsePostRaceCheckReturn {
  const [hasPostRacePopup, setHasPostRacePopup] = useState(false);
  const [postRaceData, setPostRaceData] = useState<RaceResponse | null>(null);

  useEffect(() => {
    checkForPostRacePopup();
  }, []);

  const checkForPostRacePopup = async () => {
    try {
      const response = await fetch("/api/races/check-post-race");
      const data = await response.json();

      if (data.hasPostRacePopup && data.race) {
        setHasPostRacePopup(true);
        setPostRaceData(data.race);
      }
    } catch (error) {
      console.error("Failed to check post-race popup:", error);
    }
  };

  const dismissPopup = async () => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/dismiss-popup`, {
      method: "POST",
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  const completeRace = async (finishTime: number) => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualFinishTime: finishTime }),
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  const skipRace = async (reason?: string) => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipReason: reason || "Did not compete" }),
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  return {
    hasPostRacePopup,
    postRaceData,
    dismissPopup,
    completeRace,
    skipRace,
  };
}
