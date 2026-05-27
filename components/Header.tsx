'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTennisStore } from '@/lib/store';
import { formatClock, useNowTick } from '@/lib/time';
import { ChevronDown } from 'lucide-react';

export function Header() {
  const now = useNowTick(1000);
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const dutyManagerId = useTennisStore((s) => s.day.dutyManagerId);
  const setDutyManager = useTennisStore((s) => s.setDutyManager);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const presentPlayers = present
    .map((id) => lookup.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));
  const dutyManager = dutyManagerId ? lookup.get(dutyManagerId) : undefined;

  return (
    <header className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
      <h1 className="text-2xl font-extrabold uppercase tracking-wider">
        Thorndon Tennis Club Day
      </h1>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm uppercase tracking-wide text-neutral-500">Duty manager</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="min-w-[12rem] justify-between">
                <span>{dutyManager?.name ?? 'Choose…'}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Select duty manager</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {presentPlayers.length === 0 ? (
                <DropdownMenuItem disabled>No-one marked present yet</DropdownMenuItem>
              ) : (
                <DropdownMenuRadioGroup
                  value={dutyManagerId ?? ''}
                  onValueChange={(v) => setDutyManager(v || undefined)}
                >
                  {presentPlayers.map((p) => (
                    <DropdownMenuRadioItem key={p.id} value={p.id}>
                      {p.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
              {dutyManagerId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDutyManager(undefined)}>
                    Clear duty manager
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          className="rounded-md bg-neutral-900 px-4 py-2 text-4xl font-mono tabular-nums text-white"
          aria-label="current time"
        >
          {formatClock(new Date(now))}
        </div>
      </div>
    </header>
  );
}
