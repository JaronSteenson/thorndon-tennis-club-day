'use client';

import * as React from 'react';
import { ListOrdered, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTennisStore } from '@/lib/store';
import { compareByWait } from '@/lib/playerSort';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';

export function PresentPanel() {
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const allocations = useTennisStore((s) => s.day.allocations);
  const queue = useTennisStore((s) => s.day.queue);
  const lastOnCourtAt = useTennisStore((s) => s.day.lastOnCourtAt);
  const autoAssign = useTennisStore((s) => s.autoAssign);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const available = React.useMemo(() => {
    const onCourt = new Set(allocations.flatMap((a) => a.playerIds));
    const inQueue = new Set(queue);
    return present
      .filter((id) => !onCourt.has(id) && !inQueue.has(id))
      .map((id) => lookup.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => compareByWait(a, b, lastOnCourtAt));
  }, [present, allocations, queue, lookup, lastOnCourtAt]);

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <h2 className="text-lg font-bold uppercase tracking-wider">Here today</h2>
          <Legend />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">{available.length} not on court</span>
          <Button
            size="sm"
            variant="outline"
            disabled={available.length === 0}
            onClick={() => autoAssign('ordered')}
            data-testid="auto-assign-ordered"
          >
            <ListOrdered className="h-4 w-4" />
            Fill in order
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={available.length === 0}
            onClick={() => autoAssign('random')}
            data-testid="auto-assign-random"
          >
            <Shuffle className="h-4 w-4" />
            Fill random
          </Button>
        </div>
      </header>
      <DroppableZone id="present" data={{ kind: 'present' }} className="min-h-[72px] p-2">
        {available.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No-one waiting. Use “Sign-in” (top right) to mark players as here today.
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
