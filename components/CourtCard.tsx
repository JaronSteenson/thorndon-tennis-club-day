'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PlayerChip } from './PlayerChip';
import { DroppableZone } from './DroppableZone';
import { useTennisStore } from '@/lib/store';
import type { Court } from '@/lib/types';
import { formatElapsed, useNowTick } from '@/lib/time';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';

type Props = { court: Court };

export function CourtCard({ court }: Props) {
  const allocation = useTennisStore((s) =>
    s.day.allocations.find((a) => a.courtId === court.id),
  );
  const queueLength = useTennisStore((s) => s.day.queue.length);
  const players = useTennisStore((s) => s.players);
  const finishGame = useTennisStore((s) => s.finishGame);
  const pullNextOntoCourt = useTennisStore((s) => s.pullNextOntoCourt);
  const now = useNowTick(1000);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const assignedIds = allocation?.playerIds ?? [];
  const started = allocation?.startedAt;
  const inPlay = assignedIds.length === 4 && started;
  const hasFreeSlot = assignedIds.length < 4;

  const tabColor = court.color === 'blue' ? 'bg-court-blue' : 'bg-court-green';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('court-tab text-2xl', tabColor)}>{court.name}</span>
        <div className="text-3xl font-mono tabular-nums">
          {inPlay ? formatElapsed(now - started!) : '--:--'}
        </div>
      </div>

      <DroppableZone
        id={`court-${court.id}`}
        data={{ kind: 'court', courtId: court.id }}
        className="min-h-[96px] p-2"
      >
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, idx) => {
            const pid = assignedIds[idx];
            const player = pid ? lookup.get(pid) : undefined;
            return (
              <div
                key={idx}
                className={cn(
                  'flex min-h-[40px] items-center justify-center rounded-md',
                  !player && 'border border-dashed border-neutral-300 text-neutral-400 text-sm',
                )}
              >
                {player ? (
                  <PlayerChip
                    player={player}
                    location={{ kind: 'court', courtId: court.id }}
                  />
                ) : (
                  <span>slot {idx + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </DroppableZone>

      <div className="flex items-center justify-end gap-2">
        {hasFreeSlot && queueLength > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pullNextOntoCourt(court.id)}
            data-testid={`play-next-${court.id}`}
          >
            <ArrowUp className="h-4 w-4" />
            Play next
          </Button>
        )}
        {inPlay && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => finishGame(court.id)}
            data-testid={`finish-${court.id}`}
          >
            Finish game
          </Button>
        )}
      </div>
    </div>
  );
}
