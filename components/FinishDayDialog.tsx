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
import { useTennisStore } from '@/lib/store';

export function FinishDayDialog() {
  const [open, setOpen] = React.useState(false);
  const finishClubDay = useTennisStore((s) => s.finishClubDay);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="destructive" data-testid="finish-day-trigger">
          Finish club day
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish club day?</DialogTitle>
          <DialogDescription>
            Clears every court, the queue, today’s present list and the duty manager. The roster
            stays intact.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            data-testid="finish-day-confirm"
            onClick={() => {
              finishClubDay();
              setOpen(false);
            }}
          >
            Finish day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
