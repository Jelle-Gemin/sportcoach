import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateRaceInput, UpdateRaceInput, RaceResponse } from '@/types/race';

interface RacesData {
  races: RaceResponse[];
  stats?: {
    totalPlanned: number;
    totalCompleted: number;
    totalSkipped: number;
  };
}

export function useRaces() {
  const queryClient = useQueryClient();

  // Query for fetching races
  const query = useQuery({
    queryKey: ['races'],
    queryFn: async (): Promise<RacesData> => {
      const response = await fetch('/api/races?includeEstimates=true');
      const data = await response.json();
      return { races: data.races || [], stats: data.stats };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Add race mutation
  const addMutation = useMutation({
    mutationFn: async (input: CreateRaceInput) => {
      const response = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      return data.race as RaceResponse;
    },
    onSuccess: (newRace) => {
      queryClient.setQueryData<RacesData>(['races'], (old) => ({
        races: [...(old?.races || []), newRace],
        stats: old?.stats,
      }));
    },
  });

  // Update race mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateRaceInput }) => {
      const response = await fetch(`/api/races/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      return data.race as RaceResponse;
    },
    onSuccess: (updatedRace) => {
      // Update cache with the actual response from server
      queryClient.setQueryData<RacesData>(['races'], (old) => ({
        races: (old?.races || []).map((r) =>
          r._id === updatedRace._id ? updatedRace : r
        ),
        stats: old?.stats,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });

  // Delete race mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/races/${id}`, { method: 'DELETE' });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['races'] });
      const previous = queryClient.getQueryData<RacesData>(['races']);
      queryClient.setQueryData<RacesData>(['races'], (old) => ({
        races: (old?.races || []).filter((r) => r._id !== id),
        stats: old?.stats,
      }));
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['races'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });

  // Complete race mutation
  const completeMutation = useMutation({
    mutationFn: async ({ id, finishTime }: { id: string; finishTime: number }) => {
      const response = await fetch(`/api/races/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualFinishTime: finishTime }),
      });
      const data = await response.json();
      return data.race as RaceResponse;
    },
    onSuccess: (updatedRace) => {
      queryClient.setQueryData<RacesData>(['races'], (old) => ({
        races: (old?.races || []).map((r) =>
          r._id === updatedRace._id ? updatedRace : r
        ),
        stats: old?.stats,
      }));
    },
  });

  // Skip race mutation
  const skipMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/races/${id}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipReason: reason }),
      });
      const data = await response.json();
      return data.race as RaceResponse;
    },
    onSuccess: (updatedRace) => {
      queryClient.setQueryData<RacesData>(['races'], (old) => ({
        races: (old?.races || []).map((r) =>
          r._id === updatedRace._id ? updatedRace : r
        ),
        stats: old?.stats,
      }));
    },
  });

  const races = query.data?.races || [];

  return {
    races: races.filter(Boolean),
    plannedRaces: races.filter((r) => r && r.status === 'planned'),
    completedRaces: races.filter((r) => r && r.status === 'completed'),
    loading: query.isLoading,
    error: query.error?.message ?? null,
    addRace: addMutation.mutateAsync,
    updateRace: (id: string, updates: UpdateRaceInput) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteRace: deleteMutation.mutateAsync,
    completeRace: (id: string, finishTime: number) =>
      completeMutation.mutateAsync({ id, finishTime }),
    skipRace: (id: string, reason?: string) =>
      skipMutation.mutateAsync({ id, reason }),
    refreshRaces: query.refetch,
  };
}
