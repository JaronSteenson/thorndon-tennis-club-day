'use client';

import * as React from 'react';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';
import { useTennisStore, BUCKET_SIZE, VISIBLE_BUCKETS } from '@/lib/store';
import { cn } from '@/lib/utils';

const BUCKET_LABELS = ['Next on', 'Then', 'After that'];

function bucketLabel(index: number): string {
  return BUCKET_LABELS[index] ?? `In ${index + 1}`;
}

export function QueuePanel({ className }: { className?: string }) {
  const queue = useTennisStore((s) => s.day.queue);
  const players = useTennisStore((s) => s.players);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const bucketCount = Math.max(VISIBLE_BUCKETS, Math.ceil(queue.length / BUCKET_SIZE));

  return (
    <section
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold uppercase tracking-wider">Up next</h2>
        <span className="text-sm text-neutral-500">{queue.length} waiting</span>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: bucketCount }).map((_, bucket) => {
          const start = bucket * BUCKET_SIZE;
          const ids = queue.slice(start, start + BUCKET_SIZE);
          const isNext = bucket === 0;
          return (
            <div key={bucket} className="flex flex-col gap-1">
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide',
                  isNext ? 'text-neutral-900' : 'text-neutral-400',
                )}
              >
                {bucketLabel(bucket)}
              </span>
              <DroppableZone
                id={`queue-bucket-${bucket}`}
                data={{ kind: 'queue', index: start }}
                className={cn('min-h-[52px] p-1.5', isNext && 'ring-1 ring-neutral-300')}
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: BUCKET_SIZE }).map((_, slot) => {
                    const pid = ids[slot];
                    const player = pid ? lookup.get(pid) : undefined;
                    return (
                      <div
                        key={slot}
                        className={cn(
                          'flex min-h-[32px] items-center justify-center rounded-md',
                          !player &&
                            'border border-dashed border-neutral-300 text-neutral-400 text-xs',
                        )}
                      >
                        {player ? (
                          <PlayerChip player={player} location={{ kind: 'queue' }} size="sm" />
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DroppableZone>
            </div>
          );
        })}
      </div>
    </section>
  );
}
