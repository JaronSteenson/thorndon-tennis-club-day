'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useTennisStore } from '@/lib/store';

const DISMISS_AFTER_MS = 6000;

export function UndoToast() {
  const lastUndo = useTennisStore((s) => s.lastUndo);
  const undo = useTennisStore((s) => s.undo);
  const dismissUndo = useTennisStore((s) => s.dismissUndo);

  const at = lastUndo?.at;
  React.useEffect(() => {
    if (!at) return;
    const t = setTimeout(dismissUndo, DISMISS_AFTER_MS);
    return () => clearTimeout(t);
  }, [at, dismissUndo]);

  if (!lastUndo) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-neutral-900 px-4 py-2 text-white shadow-lg"
      data-testid="undo-toast"
    >
      <span className="text-sm">{lastUndo.label}</span>
      <Button size="sm" variant="outline" className="text-neutral-900" onClick={undo} data-testid="undo-button">
        Undo
      </Button>
    </div>
  );
}
