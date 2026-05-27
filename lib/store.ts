'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Court, CourtAllocation, DayState, Player, QueueEntry } from './types';
import courtsSeed from '@/data/courts.json';
import playersSeed from '@/data/players.json';
import { mergeCourts, mergePlayers } from './seedMerge';

export const STORAGE_KEY = 'tennis-day:v1';

type Actions = {
  hydrateSeed: () => void;
  markPresent: (playerId: string) => void;
  unmarkPresent: (playerId: string) => void;
  setDutyManager: (playerId: string | undefined) => void;
  assignToCourt: (courtId: string, playerId: string) => void;
  queueToCourt: (courtId: string, playerId: string) => void;
  removeFromCourt: (courtId: string, playerId: string) => void;
  removeFromQueue: (courtId: string, playerId: string) => void;
  finishGame: (courtId: string) => void;
  quickAddPlayer: (name: string, opts?: { isVisitor?: boolean; markPresent?: boolean }) => Player;
  finishClubDay: () => void;
};

type State = {
  hydrated: boolean;
  courts: Court[];
  players: Player[];
  day: DayState;
} & Actions;

const initialDay: DayState = {
  presentPlayerIds: [],
  dutyManagerId: undefined,
  allocations: [
    { courtId: 'court-3', playerIds: [] },
    { courtId: 'court-4', playerIds: [] },
    { courtId: 'court-5', playerIds: [] },
  ],
  queues: [
    { courtId: 'court-3', playerIds: [] },
    { courtId: 'court-4', playerIds: [] },
    { courtId: 'court-5', playerIds: [] },
  ],
};

function ensureCourtSlots(courts: Court[], allocs: CourtAllocation[], queues: QueueEntry[]) {
  const ensuredAllocs = courts.map(
    (c) => allocs.find((a) => a.courtId === c.id) ?? { courtId: c.id, playerIds: [] },
  );
  const ensuredQueues = courts.map(
    (c) => queues.find((q) => q.courtId === c.id) ?? { courtId: c.id, playerIds: [] },
  );
  return { ensuredAllocs, ensuredQueues };
}

function removeEverywhere(day: DayState, playerId: string): DayState {
  return {
    ...day,
    allocations: day.allocations.map((a) => ({
      ...a,
      playerIds: a.playerIds.filter((id) => id !== playerId),
      startedAt: a.playerIds.includes(playerId) && a.playerIds.length === 4 ? undefined : a.startedAt,
    })),
    queues: day.queues.map((q) => ({
      ...q,
      playerIds: q.playerIds.filter((id) => id !== playerId),
    })),
  };
}

export const useTennisStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      courts: courtsSeed as Court[],
      players: playersSeed as Player[],
      day: initialDay,

      hydrateSeed: () => {
        const local = get();
        const mergedPlayers = mergePlayers(playersSeed as Player[], local.players ?? []);
        const mergedCourts = mergeCourts(courtsSeed as Court[], local.courts ?? []);
        const { ensuredAllocs, ensuredQueues } = ensureCourtSlots(
          mergedCourts,
          local.day?.allocations ?? [],
          local.day?.queues ?? [],
        );
        set({
          hydrated: true,
          courts: mergedCourts,
          players: mergedPlayers,
          day: {
            ...initialDay,
            ...local.day,
            allocations: ensuredAllocs,
            queues: ensuredQueues,
          },
        });
      },

      markPresent: (playerId) =>
        set((s) => {
          if (s.day.presentPlayerIds.includes(playerId)) return s;
          return { day: { ...s.day, presentPlayerIds: [...s.day.presentPlayerIds, playerId] } };
        }),

      unmarkPresent: (playerId) =>
        set((s) => {
          const cleared = removeEverywhere(s.day, playerId);
          return {
            day: {
              ...cleared,
              presentPlayerIds: cleared.presentPlayerIds.filter((id) => id !== playerId),
              dutyManagerId: cleared.dutyManagerId === playerId ? undefined : cleared.dutyManagerId,
            },
          };
        }),

      setDutyManager: (playerId) =>
        set((s) => ({ day: { ...s.day, dutyManagerId: playerId } })),

      assignToCourt: (courtId, playerId) =>
        set((s) => {
          const target = s.day.allocations.find((a) => a.courtId === courtId);
          if (!target) return s;
          if (target.playerIds.includes(playerId)) return s;
          if (target.playerIds.length >= 4) return s;

          const cleared = removeEverywhere(s.day, playerId);
          const present = cleared.presentPlayerIds.includes(playerId)
            ? cleared.presentPlayerIds
            : [...cleared.presentPlayerIds, playerId];

          const allocations = cleared.allocations.map((a) => {
            if (a.courtId !== courtId) return a;
            const playerIds = [...a.playerIds, playerId];
            const startedAt = playerIds.length === 4 ? Date.now() : a.startedAt;
            return { ...a, playerIds, startedAt };
          });

          return {
            day: { ...cleared, presentPlayerIds: present, allocations },
          };
        }),

      queueToCourt: (courtId, playerId) =>
        set((s) => {
          const target = s.day.queues.find((q) => q.courtId === courtId);
          if (!target) return s;
          if (target.playerIds.includes(playerId)) return s;
          if (target.playerIds.length >= 4) return s;

          const cleared = removeEverywhere(s.day, playerId);
          const present = cleared.presentPlayerIds.includes(playerId)
            ? cleared.presentPlayerIds
            : [...cleared.presentPlayerIds, playerId];

          const queues = cleared.queues.map((q) =>
            q.courtId === courtId ? { ...q, playerIds: [...q.playerIds, playerId] } : q,
          );

          return { day: { ...cleared, presentPlayerIds: present, queues } };
        }),

      removeFromCourt: (courtId, playerId) =>
        set((s) => ({
          day: {
            ...s.day,
            allocations: s.day.allocations.map((a) => {
              if (a.courtId !== courtId) return a;
              const playerIds = a.playerIds.filter((id) => id !== playerId);
              const startedAt = playerIds.length < 4 ? undefined : a.startedAt;
              return { ...a, playerIds, startedAt };
            }),
          },
        })),

      removeFromQueue: (courtId, playerId) =>
        set((s) => ({
          day: {
            ...s.day,
            queues: s.day.queues.map((q) =>
              q.courtId === courtId
                ? { ...q, playerIds: q.playerIds.filter((id) => id !== playerId) }
                : q,
            ),
          },
        })),

      finishGame: (courtId) =>
        set((s) => {
          const queue = s.day.queues.find((q) => q.courtId === courtId);
          const promote = queue && queue.playerIds.length === 4 ? queue.playerIds : null;

          const allocations = s.day.allocations.map((a) => {
            if (a.courtId !== courtId) return a;
            if (promote) return { ...a, playerIds: promote, startedAt: Date.now() };
            return { ...a, playerIds: [], startedAt: undefined };
          });

          const queues = s.day.queues.map((q) =>
            q.courtId === courtId && promote ? { ...q, playerIds: [] } : q,
          );

          return { day: { ...s.day, allocations, queues } };
        }),

      quickAddPlayer: (name, opts) => {
        const trimmed = name.trim();
        const player: Player = {
          id: `p-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
          name: trimmed,
          ...(opts?.isVisitor ? { isVisitor: true } : {}),
        };
        set((s) => {
          const players = mergePlayers(s.players, [player]);
          const presentPlayerIds = opts?.markPresent
            ? Array.from(new Set([...s.day.presentPlayerIds, player.id]))
            : s.day.presentPlayerIds;
          return { players, day: { ...s.day, presentPlayerIds } };
        });
        return player;
      },

      finishClubDay: () =>
        set((s) => ({
          day: {
            ...initialDay,
            allocations: s.courts.map((c) => ({ courtId: c.id, playerIds: [] })),
            queues: s.courts.map((c) => ({ courtId: c.id, playerIds: [] })),
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ players: s.players, day: s.day }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateSeed();
      },
    },
  ),
);

export function getCourtAllocation(state: State, courtId: string): CourtAllocation | undefined {
  return state.day.allocations.find((a) => a.courtId === courtId);
}

export function getCourtQueue(state: State, courtId: string): QueueEntry | undefined {
  return state.day.queues.find((q) => q.courtId === courtId);
}

export function selectAvailablePresent(state: State): string[] {
  const onCourt = new Set(state.day.allocations.flatMap((a) => a.playerIds));
  const inQueue = new Set(state.day.queues.flatMap((q) => q.playerIds));
  return state.day.presentPlayerIds.filter((id) => !onCourt.has(id) && !inQueue.has(id));
}
