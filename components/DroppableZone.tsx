'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

type DropData =
  | { kind: 'present' }
  | { kind: 'court'; courtId: string }
  | { kind: 'queue'; courtId: string };

type Props = {
  id: string;
  data: DropData;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
};

export function DroppableZone({ id, data, className, activeClassName, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return (
    <div
      ref={setNodeRef}
      data-droppable-id={id}
      className={cn('drop-zone', className, isOver && (activeClassName ?? 'drop-zone-active'))}
    >
      {children}
    </div>
  );
}
