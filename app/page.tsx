'use client';

import * as React from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Header } from '@/components/Header';
import { CourtCard } from '@/components/CourtCard';
import { QueuePanel } from '@/components/QueuePanel';
import { BreakPanel } from '@/components/BreakPanel';
import { PresentPanel } from '@/components/PresentPanel';
import { SignInScreen } from '@/components/SignInScreen';
import { UndoToast } from '@/components/UndoToast';
import { useTennisStore } from '@/lib/store';

export default function Page() {
  const hydrated = useTennisStore((s) => s.hydrated);
  const hydrateSeed = useTennisStore((s) => s.hydrateSeed);
  const courts = useTennisStore((s) => s.courts);
  const mode = useTennisStore((s) => s.mode);
  const markPresent = useTennisStore((s) => s.markPresent);
  const assignToCourt = useTennisStore((s) => s.assignToCourt);
  const queuePlayer = useTennisStore((s) => s.queuePlayer);
  const takeBreak = useTennisStore((s) => s.takeBreak);
  const endBreak = useTennisStore((s) => s.endBreak);

  React.useEffect(() => {
    if (!hydrated) hydrateSeed();
  }, [hydrated, hydrateSeed]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const overData = event.over?.data?.current as
      | { kind: 'present' }
      | { kind: 'break' }
      | { kind: 'court'; courtId: string }
      | { kind: 'queue'; index: number }
      | undefined;
    const dragData = event.active?.data?.current as { playerId: string } | undefined;
    if (!overData || !dragData) return;
    const { playerId } = dragData;
    if (overData.kind === 'present') {
      // Returns a player from the tea-break bucket; a no-op otherwise.
      endBreak(playerId);
      markPresent(playerId);
    } else if (overData.kind === 'break') {
      takeBreak(playerId);
    } else if (overData.kind === 'court') {
      assignToCourt(overData.courtId, playerId);
    } else if (overData.kind === 'queue') {
      queuePlayer(playerId, overData.index);
    }
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center text-neutral-500">
        Loading…
      </main>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <main className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-2 p-2 sm:p-3">
        <Header />
        {mode === 'signin' ? (
          <SignInScreen />
        ) : (
          <>
            <div className="flex flex-col gap-3 xl:flex-row">
              {/* Breakpoints assume the fixed set of 3 courts. */}
              <section className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courts.map((c) => (
                  <CourtCard key={c.id} court={c} />
                ))}
              </section>
              <QueuePanel className="xl:w-72 xl:shrink-0" />
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <BreakPanel className="lg:w-64 lg:shrink-0" />
              <PresentPanel className="flex-1" />
            </div>
          </>
        )}
      </main>
      <UndoToast />
    </DndContext>
  );
}
