'use client';

import * as React from 'react';
import { useTennisStore, selectAvailablePresent } from '@/lib/store';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';

export function PresentPanel() {
  const players = useTennisStore((s) => s.players);
  const availableIds = useTennisStore(selectAvailablePresent);
  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const available = availableIds
    .map((id) => lookup.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Here today</h2>
        <span className="text-sm text-neutral-500">{available.length} not on court</span>
      </header>
      <DroppableZone
        id="present"
        data={{ kind: 'present' }}
        className="min-h-[88px] p-3"
      >
        {available.length === 0 ? (
          <p className="text-sm text-neutral-400">Drag players here or click their menu → “Add to today”.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <PlayerChip key={p.id} player={p} location={{ kind: 'present' }} />
            ))}
          </div>
        )}
      </DroppableZone>
    </section>
  );
}
