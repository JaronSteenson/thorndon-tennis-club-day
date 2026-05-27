'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTennisStore } from '@/lib/store';
import { Plus } from 'lucide-react';

export function QuickAddDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [isVisitor, setIsVisitor] = React.useState(false);
  const quickAdd = useTennisStore((s) => s.quickAddPlayer);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    quickAdd(name, { isVisitor, markPresent: true });
    setName('');
    setIsVisitor(false);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setName('');
          setIsVisitor(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" data-testid="quick-add-trigger">
          <Plus className="h-4 w-4" />
          Quick add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick add player</DialogTitle>
          <DialogDescription>
            Adds the player to today and to the roster. Useful for visitors and walk-ins.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            value={name}
            placeholder="Player name"
            onChange={(e) => setName(e.target.value)}
            data-testid="quick-add-name"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isVisitor}
              onChange={(e) => setIsVisitor(e.target.checked)}
              data-testid="quick-add-visitor"
            />
            Mark as visitor (red label)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="quick-add-submit">
              Add player
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
