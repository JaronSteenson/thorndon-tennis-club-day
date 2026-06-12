'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Court, CourtAllocation, DayState, Player, QueueEntry } from './types';
import courtsSeed from '@/data/courts.json';
import playersSeed from '@/data/players.json';
import { mergeCourts, mergePlayers } from './seedMerge';
import { compareByWait } from './playerSort';

export const STORAGE_KEY = 'tennis-day:v1';

export type BoardMode = 'allocation' | 'signin';

export type UndoEntry = {
  label: string;
  at: number;
  day: DayState;
  players: Player[];
};

type Actions = {
  hydrateSeed: () => void;
  setMode: (mode: BoardMode) => void;
  undo: () => void;
  dismissUndo: () => void;
  markPresent: (playerId: string) => void;
  unmarkPresent: (playerId: string) => void;
  setDutyManager: (playerId: string | undefined) => void;
  assignToCourt: (courtId: string, playerId: string) => void;
  queueToCourt: (courtId: string, playerId: string) => void;
  removeFromCourt: (courtId: string, playerId: string) => void;
  removeFromQueue: (courtId: string, playerId: string) => void;
  promoteQueue: (courtId: string) => void;
  autoAssign: (order: 'ordered' | 'random') => void;
  finishGame: (courtId: string) => void;
  quickAddPlayer: (name: string, opts?: { isVisitor?: boolean; markPresent?: boolean }) => Player;
  finishClubDay: () => void;
};

type State = {
  hydrated: boolean;
  mode: BoardMode;
  lastUndo: UndoEntry | null;
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
  lastOnCourtAt: {},
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

function nameOf(players: Player[], playerId: string): string {
  return players.find((p) => p.id === playerId)?.name ?? 'player';
}

function courtNameOf(courts: Court[], courtId: string): string {
  return courts.find((c) => c.id === courtId)?.name ?? 'court';
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const useTennisStore = create<State>()(
  persist(
    (set, get) => {
      // Wraps a day mutation so it captures a single-level undo snapshot and
      // toast label. Updaters return null for no-ops so misclicks (e.g. on a
      // full court) never spawn a toast or overwrite the previous snapshot.
      const withUndo = (
        label: string | ((s: State) => string),
        updater: (s: State) => { day: DayState; players?: Player[] } | null,
      ) => {
        const s = get();
        const next = updater(s);
        if (!next) return;
        set({
          ...next,
          lastUndo: {
            label: typeof label === 'function' ? label(s) : label,
            at: Date.now(),
            day: s.day,
            players: s.players,
          },
        });
      };

      return {
        hydrated: false,
        mode: 'allocation',
        lastUndo: null,
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
              lastOnCourtAt: local.day?.lastOnCourtAt ?? {},
            },
          });
        },

        setMode: (mode) => set({ mode }),

        undo: () =>
          set((s) =>
            s.lastUndo
              ? { day: s.lastUndo.day, players: s.lastUndo.players, lastUndo: null }
              : s,
          ),

        dismissUndo: () => set({ lastUndo: null }),

        markPresent: (playerId) =>
          withUndo(
            (s) => `Signed in ${nameOf(s.players, playerId)}`,
            (s) => {
              if (s.day.presentPlayerIds.includes(playerId)) return null;
              return { day: { ...s.day, presentPlayerIds: [...s.day.presentPlayerIds, playerId] } };
            },
          ),

        unmarkPresent: (playerId) =>
          withUndo(
            (s) => `Removed ${nameOf(s.players, playerId)} from today`,
            (s) => {
              if (!s.day.presentPlayerIds.includes(playerId)) return null;
              const cleared = removeEverywhere(s.day, playerId);
              return {
                day: {
                  ...cleared,
                  presentPlayerIds: cleared.presentPlayerIds.filter((id) => id !== playerId),
                  dutyManagerId: cleared.dutyManagerId === playerId ? undefined : cleared.dutyManagerId,
                },
              };
            },
          ),

        setDutyManager: (playerId) =>
          withUndo(
            (s) =>
              playerId ? `Duty manager: ${nameOf(s.players, playerId)}` : 'Cleared duty manager',
            (s) => {
              if (s.day.dutyManagerId === playerId) return null;
              return { day: { ...s.day, dutyManagerId: playerId } };
            },
          ),

        assignToCourt: (courtId, playerId) =>
          withUndo(
            (s) => `Moved ${nameOf(s.players, playerId)} to ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const target = s.day.allocations.find((a) => a.courtId === courtId);
              if (!target) return null;
              if (target.playerIds.includes(playerId)) return null;
              if (target.playerIds.length >= 4) return null;

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
            },
          ),

        queueToCourt: (courtId, playerId) =>
          withUndo(
            (s) => `Queued ${nameOf(s.players, playerId)} for ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const target = s.day.queues.find((q) => q.courtId === courtId);
              if (!target) return null;
              if (target.playerIds.includes(playerId)) return null;
              if (target.playerIds.length >= 4) return null;

              const cleared = removeEverywhere(s.day, playerId);
              const present = cleared.presentPlayerIds.includes(playerId)
                ? cleared.presentPlayerIds
                : [...cleared.presentPlayerIds, playerId];

              const queues = cleared.queues.map((q) =>
                q.courtId === courtId ? { ...q, playerIds: [...q.playerIds, playerId] } : q,
              );

              return { day: { ...cleared, presentPlayerIds: present, queues } };
            },
          ),

        removeFromCourt: (courtId, playerId) =>
          withUndo(
            (s) => `Removed ${nameOf(s.players, playerId)} from ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const target = s.day.allocations.find((a) => a.courtId === courtId);
              if (!target?.playerIds.includes(playerId)) return null;
              return {
                day: {
                  ...s.day,
                  allocations: s.day.allocations.map((a) => {
                    if (a.courtId !== courtId) return a;
                    const playerIds = a.playerIds.filter((id) => id !== playerId);
                    const startedAt = playerIds.length < 4 ? undefined : a.startedAt;
                    return { ...a, playerIds, startedAt };
                  }),
                },
              };
            },
          ),

        removeFromQueue: (courtId, playerId) =>
          withUndo(
            (s) =>
              `Removed ${nameOf(s.players, playerId)} from ${courtNameOf(s.courts, courtId)} queue`,
            (s) => {
              const target = s.day.queues.find((q) => q.courtId === courtId);
              if (!target?.playerIds.includes(playerId)) return null;
              return {
                day: {
                  ...s.day,
                  queues: s.day.queues.map((q) =>
                    q.courtId === courtId
                      ? { ...q, playerIds: q.playerIds.filter((id) => id !== playerId) }
                      : q,
                  ),
                },
              };
            },
          ),

        promoteQueue: (courtId) =>
          withUndo(
            (s) => `Promoted queue to ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const alloc = s.day.allocations.find((a) => a.courtId === courtId);
              const queue = s.day.queues.find((q) => q.courtId === courtId);
              if (!alloc || !queue || queue.playerIds.length === 0) return null;
              if (alloc.playerIds.length + queue.playerIds.length > 4) return null;

              const playerIds = [...alloc.playerIds, ...queue.playerIds];
              const startedAt = playerIds.length === 4 ? Date.now() : alloc.startedAt;

              return {
                day: {
                  ...s.day,
                  allocations: s.day.allocations.map((a) =>
                    a.courtId === courtId ? { ...a, playerIds, startedAt } : a,
                  ),
                  queues: s.day.queues.map((q) =>
                    q.courtId === courtId ? { ...q, playerIds: [] } : q,
                  ),
                },
              };
            },
          ),

        autoAssign: (order) =>
          withUndo(
            order === 'ordered' ? 'Auto-filled courts (in order)' : 'Auto-filled courts (random)',
            (s) => {
              const onCourt = new Set(s.day.allocations.flatMap((a) => a.playerIds));
              const inQueue = new Set(s.day.queues.flatMap((q) => q.playerIds));
              const lookup = new Map(s.players.map((p) => [p.id, p]));
              const pool = s.day.presentPlayerIds
                .filter((id) => !onCourt.has(id) && !inQueue.has(id))
                .map((id) => lookup.get(id))
                .filter((p): p is Player => Boolean(p));
              if (pool.length === 0) return null;

              if (order === 'ordered') {
                pool.sort((a, b) => compareByWait(a, b, s.day.lastOnCourtAt));
              } else {
                shuffleInPlace(pool);
              }

              const ids = pool.map((p) => p.id);
              const allocations = s.day.allocations.map((a) => {
                const take = ids.splice(0, 4 - a.playerIds.length);
                if (take.length === 0) return a;
                const playerIds = [...a.playerIds, ...take];
                const startedAt = playerIds.length === 4 ? Date.now() : a.startedAt;
                return { ...a, playerIds, startedAt };
              });
              const queues = s.day.queues.map((q) => {
                const take = ids.splice(0, 4 - q.playerIds.length);
                return take.length > 0 ? { ...q, playerIds: [...q.playerIds, ...take] } : q;
              });

              return { day: { ...s.day, allocations, queues } };
            },
          ),

        finishGame: (courtId) =>
          withUndo(
            (s) => `Finished game on ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const finishedAt = Date.now();
              const finishing = s.day.allocations.find((a) => a.courtId === courtId);
              const queue = s.day.queues.find((q) => q.courtId === courtId);
              const promote = queue && queue.playerIds.length === 4 ? queue.playerIds : null;
              if (!finishing || (finishing.playerIds.length === 0 && !promote)) return null;

              const allocations = s.day.allocations.map((a) => {
                if (a.courtId !== courtId) return a;
                if (promote) return { ...a, playerIds: promote, startedAt: finishedAt };
                return { ...a, playerIds: [], startedAt: undefined };
              });

              const queues = s.day.queues.map((q) =>
                q.courtId === courtId && promote ? { ...q, playerIds: [] } : q,
              );

              const lastOnCourtAt = { ...s.day.lastOnCourtAt };
              for (const id of finishing.playerIds) {
                lastOnCourtAt[id] = finishedAt;
              }

              return { day: { ...s.day, allocations, queues, lastOnCourtAt } };
            },
          ),

        quickAddPlayer: (name, opts) => {
          const trimmed = name.trim();
          const player: Player = {
            id: `p-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
            name: trimmed,
            ...(opts?.isVisitor ? { isVisitor: true } : {}),
          };
          withUndo(`Added ${trimmed}`, (s) => {
            const players = mergePlayers(s.players, [player]);
            const presentPlayerIds = opts?.markPresent
              ? Array.from(new Set([...s.day.presentPlayerIds, player.id]))
              : s.day.presentPlayerIds;
            return { players, day: { ...s.day, presentPlayerIds } };
          });
          return player;
        },

        finishClubDay: () =>
          withUndo('Finished club day', (s) => ({
            day: {
              ...initialDay,
              allocations: s.courts.map((c) => ({ courtId: c.id, playerIds: [] })),
              queues: s.courts.map((c) => ({ courtId: c.id, playerIds: [] })),
              lastOnCourtAt: {},
            },
          })),
      };
    },
    {
      name: STORAGE_KEY,
      // Node 25 defines a non-functional localStorage global, so SSR must
      // explicitly fall back to a no-op storage instead of touching it.
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
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
