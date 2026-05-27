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

export type QueueEntry = {
  courtId: string;
  playerIds: string[];
};

export type DayState = {
  presentPlayerIds: string[];
  dutyManagerId?: string;
  allocations: CourtAllocation[];
  queues: QueueEntry[];
};
