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
  const queueToCourt = useTennisStore((s) => s.queueToCourt);

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
      | { kind: 'court'; courtId: string }
      | { kind: 'queue'; courtId: string }
      | undefined;
    const dragData = event.active?.data?.current as { playerId: string } | undefined;
    if (!overData || !dragData) return;
    const { playerId } = dragData;
    if (overData.kind === 'present') {
      markPresent(playerId);
    } else if (overData.kind === 'court') {
      assignToCourt(overData.courtId, playerId);
    } else if (overData.kind === 'queue') {
      queueToCourt(overData.courtId, playerId);
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
            {/* Breakpoints assume the fixed set of 3 courts. */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courts.map((c) => (
                <CourtCard key={c.id} court={c} />
              ))}
            </section>
            <PresentPanel />
          </>
        )}
      </main>
      <UndoToast />
    </DndContext>
  );
}
