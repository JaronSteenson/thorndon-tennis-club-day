'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { useTennisStore } from '@/lib/store';
import { PlayerChip } from './PlayerChip';
import { QuickAddDialog } from './QuickAddDialog';
import { FinishDayDialog } from './FinishDayDialog';

export function RosterPanel() {
  const players = useTennisStore((s) => s.players);
  const present = useTennisStore((s) => s.day.presentPlayerIds);
  const [query, setQuery] = React.useState('');

  const presentSet = React.useMemo(() => new Set(present), [present]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => !presentSet.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, presentSet, query]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold uppercase tracking-wider">Roster</h2>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Input
            placeholder="Search players…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
            data-testid="roster-search"
          />
          <QuickAddDialog />
        </div>
      </header>
      <div
        className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto pr-1"
        data-testid="roster-list"
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400">No matches. Try Quick add.</p>
        ) : (
          filtered.map((p) => (
            <PlayerChip key={p.id} player={p} location={{ kind: 'roster' }} />
          ))
        )}
      </div>
      <div className="flex justify-end pt-2">
        <FinishDayDialog />
      </div>
    </section>
  );
}
