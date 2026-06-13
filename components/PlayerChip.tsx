'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTennisStore } from '@/lib/store';
import type { Player } from '@/lib/types';

export type ChipLocation =
  | { kind: 'present' }
  | { kind: 'court'; courtId: string }
  | { kind: 'queue' };

type Props = {
  player: Player;
  location: ChipLocation;
  size?: 'sm' | 'md' | 'lg';
  hasPlayed?: boolean;
};

export function PlayerChip({ player, location, size = 'md', hasPlayed = false }: Props) {
  const dragId = `${locationToString(location)}::${player.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { playerId: player.id, location },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(-1.5deg)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'chip-base group relative pr-8 cursor-grab active:cursor-grabbing',
        player.isVisitor && 'chip-visitor',
        hasPlayed && !player.isVisitor && 'chip-played',
        hasPlayed && player.isVisitor && 'chip-played-visitor',
        size === 'sm' && 'text-sm px-2 py-1 pr-8',
        size === 'lg' && 'text-xl px-4 py-2 pr-9',
        isDragging && 'opacity-60',
      )}
      {...listeners}
      {...attributes}
      data-testid={`chip-${player.id}`}
    >
      <span>{player.name}</span>
      <ChipMenu player={player} location={location} />
    </div>
  );
}

function ChipMenu({ player, location }: { player: Player; location: ChipLocation }) {
  const courts = useTennisStore((s) => s.courts);
  const unmarkPresent = useTennisStore((s) => s.unmarkPresent);
  const assignToCourt = useTennisStore((s) => s.assignToCourt);
  const queuePlayer = useTennisStore((s) => s.queuePlayer);
  const removeFromCourt = useTennisStore((s) => s.removeFromCourt);
  const removeFromQueue = useTennisStore((s) => s.removeFromQueue);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label={`Options for ${player.name}`}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 rounded p-1.5 opacity-60 hover:opacity-100',
            player.isVisitor ? 'text-white' : 'text-black',
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>{player.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {location.kind === 'present' && (
          <>
            {courts.map((c) => (
              <DropdownMenuItem
                key={`assign-${c.id}`}
                onSelect={() => assignToCourt(c.id, player.id)}
              >
                Assign to {c.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => queuePlayer(player.id)}>
              Add to queue
            </DropdownMenuItem>
          </>
        )}
        {location.kind === 'court' && (
          <DropdownMenuItem
            onSelect={() => removeFromCourt(location.courtId, player.id)}
          >
            Remove from court
          </DropdownMenuItem>
        )}
        {location.kind === 'queue' && (
          <DropdownMenuItem onSelect={() => removeFromQueue(player.id)}>
            Remove from queue
          </DropdownMenuItem>
        )}
        {(location.kind === 'court' || location.kind === 'queue' || location.kind === 'present') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => unmarkPresent(player.id)}>
              Remove from today
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function locationToString(loc: ChipLocation): string {
  switch (loc.kind) {
    case 'present':
      return 'present';
    case 'court':
      return `court:${loc.courtId}`;
    case 'queue':
      return 'queue';
  }
}
