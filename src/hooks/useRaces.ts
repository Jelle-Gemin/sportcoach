import { useState, useEffect } from 'react';
import { Race, CreateRaceInput, UpdateRaceInput, RaceResponse } from '@/types/race';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: RaceResponse[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface UseRacesReturn {
  races: RaceResponse[];
  plannedRaces: RaceResponse[];
  completedRaces: RaceResponse[];
  loading: boolean;
  error: string | null;
  addRace: (race: CreateRaceInput) => Promise<RaceResponse>;
  updateRace: (id: string, updates: UpdateRaceInput) => Promise<RaceResponse>;
  deleteRace: (id: string) => Promise<void>;
  completeRace: (id: string, finishTime: number) => Promise<void>;
  skipRace: (id: string, reason?: string) => Promise<void>;
  refreshRaces: () => Promise<void>;
}

export function useRaces(): UseRacesReturn {
  const [races, setRaces] = useState<RaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch races on mount
  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/races?includeEstimates=true");
      const data = await response.json();
      setRaces(data.races || []);
    } catch (err) {
      setError("Failed to load races");
      setRaces([]);
    } finally {
      setLoading(false);
    }
  };

  const addRace = async (input: CreateRaceInput) => {
    const response = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    setRaces([...races, data.race]);
    // Invalidate cache
    cache.delete('races');
    return data.race;
  };

  const updateRace = async (id: string, updates: UpdateRaceInput) => {
    const response = await fetch(`/api/races/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    setRaces(races.map((r) => (r._id === id ? data.race : r)));
    // Invalidate cache
    cache.delete('races');
    return data.race;
  };

  const deleteRace = async (id: string) => {
    await fetch(`/api/races/${id}`, {
      method: "DELETE",
    });

    setRaces(races.filter((r) => r._id !== id));
    // Invalidate cache
    cache.delete('races');
  };

  const completeRace = async (id: string, finishTime: number) => {
    const response = await fetch(`/api/races/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualFinishTime: finishTime }),
    });

    const data = await response.json();

    // Update local state
    setRaces(races.map((r) => (r._id === id ? data.race : r)));
    // Invalidate cache
    cache.delete('races');
  };

  const skipRace = async (id: string, reason?: string) => {
    const response = await fetch(`/api/races/${id}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipReason: reason }),
    });

    const data = await response.json();

    // Update local state
    setRaces(races.map((r) => (r._id === id ? data.race : r)));
    // Invalidate cache
    cache.delete('races');
  };

  const refreshRaces = async () => {
    cache.delete('races');
    await fetchRaces();
  };

  return {
    races: (races || []).filter(Boolean),
    plannedRaces: (races || []).filter((r) => r && r.status === "planned"),
    completedRaces: (races || []).filter((r) => r && r.status === "completed"),
    loading,
    error,
    addRace,
    updateRace,
    deleteRace,
    completeRace,
    skipRace,
    refreshRaces,
  };
}
