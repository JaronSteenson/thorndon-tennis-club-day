export type CourtColor = 'blue' | 'green';

export type Court = {
  id: string;
  name: string;
  color: CourtColor;
};

export type Player = {
  id: string;
  name: string;
  isVisitor?: boolean;
};

export type CourtAllocation = {
  courtId: string;
  playerIds: string[];
  startedAt?: number;
};

export type DayState = {
  presentPlayerIds: string[];
  dutyManagerId?: string;
  allocations: CourtAllocation[];
  /**
   * Single ordered waiting line, not court-specific. The front of the queue
   * flows onto whichever court next becomes free. Rendered as buckets of four.
   */
  queue: string[];
  lastOnCourtAt: Record<string, number>;
};
