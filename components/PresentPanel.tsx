'use client';

import * as React from 'react';
import { useTennisStore } from '@/lib/store';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';

export function PresentPanel() {
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const allocations = useTennisStore((s) => s.day.allocations);
  const queues = useTennisStore((s) => s.day.queues);
  const lastOnCourtAt = useTennisStore((s) => s.day.lastOnCourtAt);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const available = React.useMemo(() => {
    const onCourt = new Set(allocations.flatMap((a) => a.playerIds));
    const inQueue = new Set(queues.flatMap((q) => q.playerIds));
    return present
      .filter((id) => !onCourt.has(id) && !inQueue.has(id))
      .map((id) => lookup.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => {
        const ta = lastOnCourtAt[a.id] ?? 0;
        const tb = lastOnCourtAt[b.id] ?? 0;
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      });
  }, [present, allocations, queues, lookup, lastOnCourtAt]);

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <h2 className="text-lg font-bold uppercase tracking-wider">Here today</h2>
          <Legend />
        </div>
        <span className="text-sm text-neutral-500">{available.length} not on court</span>
      </header>
      <DroppableZone id="present" data={{ kind: 'present' }} className="min-h-[72px] p-2">
        {available.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Drag players here or use their menu → “Add to today”.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                location={{ kind: 'present' }}
                hasPlayed={Boolean(lastOnCourtAt[p.id])}
              />
            ))}
          </div>
        )}
      </DroppableZone>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="chip-base !px-2 !py-0.5 !text-xs">A</span>
        Yet to play
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="chip-base chip-played !px-2 !py-0.5 !text-xs">A</span>
        Just played
      </span>
    </div>
  );
}
