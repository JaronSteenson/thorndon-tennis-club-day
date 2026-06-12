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
import { cn } from '@/lib/utils';

export function Header() {
  const now = useNowTick(1000);
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const dutyManagerId = useTennisStore((s) => s.day.dutyManagerId);
  const setDutyManager = useTennisStore((s) => s.setDutyManager);
  const mode = useTennisStore((s) => s.mode);
  const setMode = useTennisStore((s) => s.setMode);

  const lookup = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const presentPlayers = present
    .map((id) => lookup.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));
  const dutyManager = dutyManagerId ? lookup.get(dutyManagerId) : undefined;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm sm:px-5">
      <h1 className="text-lg font-extrabold uppercase tracking-wider sm:text-2xl">
        Thorndon Tennis Club Day
      </h1>
      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-sm uppercase tracking-wide text-neutral-500">Duty manager</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {dutyManager ? (
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-baseline gap-1 rounded px-1 text-2xl font-bold leading-none',
                    'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2',
                  )}
                  aria-label={`Duty manager ${dutyManager.name} — click to change`}
                >
                  <span>{dutyManager.name}</span>
                </button>
              ) : (
                <Button variant="outline" size="lg" className="min-w-[12rem] justify-between">
                  <span>Choose…</span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              )}
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
          className="rounded-md bg-neutral-900 px-3 py-1 font-mono text-xl tabular-nums text-white sm:text-3xl"
          aria-label="current time"
        >
          {formatClock(new Date(now))}
        </div>
        <Button
          variant="outline"
          size="lg"
          data-testid="mode-toggle"
          onClick={() => setMode(mode === 'signin' ? 'allocation' : 'signin')}
        >
          {mode === 'signin' ? 'Back to board' : 'Sign-in'}
        </Button>
      </div>
    </header>
  );
}
