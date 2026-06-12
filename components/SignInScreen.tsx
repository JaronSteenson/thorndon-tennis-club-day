'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTennisStore } from '@/lib/store';
import { QuickAddDialog } from './QuickAddDialog';
import { FinishDayDialog } from './FinishDayDialog';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

export function SignInScreen() {
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const [query, setQuery] = React.useState('');

  const presentSet = React.useMemo(() => new Set(present), [present]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, query]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Sign in
          <span className="ml-3 font-semibold normal-case tracking-normal text-neutral-500">
            {present.length} here today
          </span>
        </h2>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <Input
            placeholder="Search players…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
            data-testid="signin-search"
          />
          <QuickAddDialog />
          <FinishDayDialog />
        </div>
      </header>
      <p className="text-sm text-neutral-400">
        Tap a player to sign them in or out. Signing out also takes them off any court.
      </p>
      <div className="flex flex-wrap gap-2" data-testid="signin-list">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400">No matches. Try Quick add.</p>
        ) : (
          filtered.map((p) => (
            <SignInChip key={p.id} player={p} isPresent={presentSet.has(p.id)} />
          ))
        )}
      </div>
    </section>
  );
}

function SignInChip({ player, isPresent }: { player: Player; isPresent: boolean }) {
  const markPresent = useTennisStore((s) => s.markPresent);
  const unmarkPresent = useTennisStore((s) => s.unmarkPresent);

  return (
    <button
      type="button"
      onClick={() => (isPresent ? unmarkPresent(player.id) : markPresent(player.id))}
      aria-pressed={isPresent}
      data-testid={`signin-chip-${player.id}`}
      className={cn(
        'chip-base min-h-[44px] cursor-pointer gap-1.5',
        isPresent
          ? 'border-court-green bg-court-green text-white'
          : 'opacity-70',
        player.isVisitor && !isPresent && 'chip-visitor opacity-70',
        player.isVisitor && isPresent && 'ring-2 ring-visitor-red',
      )}
    >
      {isPresent && <Check className="h-4 w-4" aria-hidden />}
      {player.name}
    </button>
  );
}
