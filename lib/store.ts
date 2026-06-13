'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Court, CourtAllocation, DayState, Player } from './types';
import courtsSeed from '@/data/courts.json';
import playersSeed from '@/data/players.json';
import { mergeCourts, mergePlayers } from './seedMerge';
import { compareByWait } from './playerSort';
import { pickGroup, recordFoursome } from './matchups';

export const STORAGE_KEY = 'tennis-day:v1';

/** A foursome's worth of players; the queue is rendered as buckets this size. */
export const BUCKET_SIZE = 4;
/** How many upcoming buckets to always show, even when partly empty. */
export const VISIBLE_BUCKETS = 3;

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
  queuePlayer: (playerId: string, atIndex?: number) => void;
  removeFromCourt: (courtId: string, playerId: string) => void;
  removeFromQueue: (playerId: string) => void;
  pullNextOntoCourt: (courtId: string) => void;
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
  queue: [],
  lastOnCourtAt: {},
  playedWith: {},
};

function ensureCourtSlots(courts: Court[], allocs: CourtAllocation[]) {
  return courts.map(
    (c) => allocs.find((a) => a.courtId === c.id) ?? { courtId: c.id, playerIds: [] },
  );
}

function removeEverywhere(day: DayState, playerId: string): DayState {
  return {
    ...day,
    allocations: day.allocations.map((a) => ({
      ...a,
      playerIds: a.playerIds.filter((id) => id !== playerId),
      startedAt: a.playerIds.includes(playerId) && a.playerIds.length === 4 ? undefined : a.startedAt,
    })),
    queue: day.queue.filter((id) => id !== playerId),
  };
}

/**
 * Pre-migration state stored `queues: { courtId, playerIds }[]`. Collapse any
 * such legacy shape into a single ordered list so reloads don't lose the queue.
 */
function flattenLegacyQueues(day: unknown): string[] {
  const legacy = (day as { queues?: { playerIds?: string[] }[] } | undefined)?.queues;
  if (!Array.isArray(legacy)) return [];
  return legacy.flatMap((q) => (Array.isArray(q.playerIds) ? q.playerIds : []));
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
          const ensuredAllocs = ensureCourtSlots(mergedCourts, local.day?.allocations ?? []);
          set({
            hydrated: true,
            courts: mergedCourts,
            players: mergedPlayers,
            day: {
              ...initialDay,
              ...local.day,
              allocations: ensuredAllocs,
              // Migrate older per-court `queues` state into the single ordered line.
              queue: Array.isArray(local.day?.queue)
                ? local.day.queue
                : flattenLegacyQueues(local.day),
              lastOnCourtAt: local.day?.lastOnCourtAt ?? {},
              playedWith: local.day?.playedWith ?? {},
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

        queuePlayer: (playerId, atIndex) =>
          withUndo(
            (s) => `Queued ${nameOf(s.players, playerId)}`,
            (s) => {
              // Drop into the queue at a rough position (bucket boundary), or
              // append. Removing-then-inserting keeps a player unique in line.
              const without = removeEverywhere(s.day, playerId);
              const present = without.presentPlayerIds.includes(playerId)
                ? without.presentPlayerIds
                : [...without.presentPlayerIds, playerId];

              const queue = [...without.queue];
              const index = atIndex === undefined ? queue.length : Math.min(atIndex, queue.length);
              queue.splice(index, 0, playerId);

              return { day: { ...without, presentPlayerIds: present, queue } };
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

        removeFromQueue: (playerId) =>
          withUndo(
            (s) => `Removed ${nameOf(s.players, playerId)} from the queue`,
            (s) => {
              if (!s.day.queue.includes(playerId)) return null;
              return { day: { ...s.day, queue: s.day.queue.filter((id) => id !== playerId) } };
            },
          ),

        pullNextOntoCourt: (courtId) =>
          withUndo(
            (s) => `Sent next up to ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const alloc = s.day.allocations.find((a) => a.courtId === courtId);
              if (!alloc) return null;
              const free = 4 - alloc.playerIds.length;
              if (free <= 0 || s.day.queue.length === 0) return null;

              const take = s.day.queue.slice(0, free);
              const playerIds = [...alloc.playerIds, ...take];
              const startedAt = playerIds.length === 4 ? Date.now() : alloc.startedAt;

              return {
                day: {
                  ...s.day,
                  allocations: s.day.allocations.map((a) =>
                    a.courtId === courtId ? { ...a, playerIds, startedAt } : a,
                  ),
                  queue: s.day.queue.slice(take.length),
                },
              };
            },
          ),

        autoAssign: (order) =>
          withUndo(
            order === 'ordered' ? 'Auto-filled courts (in order)' : 'Auto-filled courts (random)',
            (s) => {
              const onCourt = new Set(s.day.allocations.flatMap((a) => a.playerIds));
              const inQueue = new Set(s.day.queue);
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

              // "Ordered" fills strictly by wait time. "Random" still draws from
              // a shuffled pool but, per court, greedily picks players who have
              // shared the fewest past matchups (best-effort anti-repeat).
              let rest = pool.map((p) => p.id);
              const allocations = s.day.allocations.map((a) => {
                const free = 4 - a.playerIds.length;
                if (free <= 0 || rest.length === 0) return a;
                let take: string[];
                if (order === 'random') {
                  const result = pickGroup(rest, a.playerIds, free, s.day.playedWith);
                  take = result.picked;
                  rest = result.rest;
                } else {
                  take = rest.slice(0, free);
                  rest = rest.slice(free);
                }
                const playerIds = [...a.playerIds, ...take];
                const startedAt = playerIds.length === 4 ? Date.now() : a.startedAt;
                return { ...a, playerIds, startedAt };
              });
              // Anyone left over joins the back of the single waiting line.
              const queue = [...s.day.queue, ...rest];

              return { day: { ...s.day, allocations, queue } };
            },
          ),

        finishGame: (courtId) =>
          withUndo(
            (s) => `Finished game on ${courtNameOf(s.courts, courtId)}`,
            (s) => {
              const finishedAt = Date.now();
              const finishing = s.day.allocations.find((a) => a.courtId === courtId);
              // Flow the next full bucket onto the freed court automatically.
              const promote = s.day.queue.length >= 4 ? s.day.queue.slice(0, 4) : null;
              if (!finishing || (finishing.playerIds.length === 0 && !promote)) return null;

              const allocations = s.day.allocations.map((a) => {
                if (a.courtId !== courtId) return a;
                if (promote) return { ...a, playerIds: promote, startedAt: finishedAt };
                return { ...a, playerIds: [], startedAt: undefined };
              });

              const queue = promote ? s.day.queue.slice(4) : s.day.queue;

              const lastOnCourtAt = { ...s.day.lastOnCourtAt };
              for (const id of finishing.playerIds) {
                lastOnCourtAt[id] = finishedAt;
              }
              // Remember this foursome so future random fills can avoid repeats.
              const playedWith = recordFoursome(s.day.playedWith, finishing.playerIds);

              return { day: { ...s.day, allocations, queue, lastOnCourtAt, playedWith } };
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
              queue: [],
              lastOnCourtAt: {},
              playedWith: {},
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
