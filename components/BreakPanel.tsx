'use client';

import * as React from 'react';
import { Coffee } from 'lucide-react';
import { useTennisStore } from '@/lib/store';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';
import { cn } from '@/lib/utils';

export function BreakPanel({ className }: { className?: string }) {
  const players = useTennisStore((s) => s.players);
  const onBreak = useTennisStore((s) => s.day.onBreakPlayerIds);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const resting = onBreak
    .map((id) => lookup.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-lg font-bold uppercase tracking-wider">
          <Coffee className="h-5 w-5" aria-hidden />
          Tea break
        </h2>
        <span className="text-sm text-neutral-500">{resting.length}</span>
      </header>
      <DroppableZone id="break" data={{ kind: 'break' }} className="min-h-[72px] flex-1 p-2">
        {resting.length === 0 ? (
          <p className="text-sm text-neutral-400">Drag a player here for a breather.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resting.map((p) => (
              <PlayerChip key={p.id} player={p} location={{ kind: 'break' }} />
            ))}
          </div>
        )}
      </DroppableZone>
    </section>
  );
}
