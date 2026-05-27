import { beforeEach, describe, expect, it } from 'vitest';
import { useTennisStore, STORAGE_KEY } from '@/lib/store';

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  useTennisStore.setState(useTennisStore.getInitialState(), true);
  useTennisStore.getState().hydrateSeed();
}

describe('store', () => {
  beforeEach(() => {
    reset();
  });

  it('hydrates with seeded players and courts', () => {
    const { players, courts } = useTennisStore.getState();
    expect(players.length).toBeGreaterThan(10);
    expect(courts.map((c) => c.id)).toEqual(['court-3', 'court-4', 'court-5']);
  });

  it('markPresent then unmarkPresent adds and removes from present', () => {
    const id = useTennisStore.getState().players[0].id;
    useTennisStore.getState().markPresent(id);
    expect(useTennisStore.getState().day.presentPlayerIds).toContain(id);
    useTennisStore.getState().unmarkPresent(id);
    expect(useTennisStore.getState().day.presentPlayerIds).not.toContain(id);
  });

  it('assignToCourt auto-starts game when 4 players land', () => {
    const ids = useTennisStore.getState().players.slice(0, 4).map((p) => p.id);
    for (const id of ids) {
      useTennisStore.getState().assignToCourt('court-3', id);
    }
    const alloc = useTennisStore
      .getState()
      .day.allocations.find((a) => a.courtId === 'court-3');
    expect(alloc?.playerIds).toEqual(ids);
    expect(alloc?.startedAt).toBeGreaterThan(0);
  });

  it('assignToCourt rejects when 4 already assigned', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().assignToCourt('court-3', players[4].id);
    const alloc = useTennisStore
      .getState()
      .day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds.length).toBe(4);
    expect(alloc.playerIds).not.toContain(players[4].id);
  });

  it('assigning a player to a new court removes them from the old court', () => {
    const id = useTennisStore.getState().players[0].id;
    useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().assignToCourt('court-4', id);
    const c3 = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    const c4 = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-4')!;
    expect(c3.playerIds).not.toContain(id);
    expect(c4.playerIds).toContain(id);
  });

  it('finishGame clears court and promotes a full queue', () => {
    const players = useTennisStore.getState().players;
    const courtIds = players.slice(0, 4).map((p) => p.id);
    const queueIds = players.slice(4, 8).map((p) => p.id);

    for (const id of courtIds) useTennisStore.getState().assignToCourt('court-3', id);
    for (const id of queueIds) useTennisStore.getState().queueToCourt('court-3', id);

    useTennisStore.getState().finishGame('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    const queue = useTennisStore.getState().day.queues.find((q) => q.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual(queueIds);
    expect(alloc.startedAt).toBeGreaterThan(0);
    expect(queue.playerIds).toEqual([]);
  });

  it('finishGame leaves court empty if queue is not full', () => {
    const players = useTennisStore.getState().players;
    const courtIds = players.slice(0, 4).map((p) => p.id);
    for (const id of courtIds) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().queueToCourt('court-3', players[4].id);
    useTennisStore.getState().finishGame('court-3');
    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    const queue = useTennisStore.getState().day.queues.find((q) => q.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual([]);
    expect(alloc.startedAt).toBeUndefined();
    expect(queue.playerIds).toEqual([players[4].id]);
  });

  it('quickAddPlayer adds to roster and marks present', () => {
    const before = useTennisStore.getState().players.length;
    const added = useTennisStore.getState().quickAddPlayer('Walker Visitor', {
      isVisitor: true,
      markPresent: true,
    });
    expect(useTennisStore.getState().players.length).toBe(before + 1);
    expect(useTennisStore.getState().day.presentPlayerIds).toContain(added.id);
    expect(added.isVisitor).toBe(true);
  });

  it('finishClubDay resets day state but keeps roster', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().setDutyManager(players[0].id);

    useTennisStore.getState().finishClubDay();

    const { day, players: rosterAfter } = useTennisStore.getState();
    expect(day.presentPlayerIds).toEqual([]);
    expect(day.dutyManagerId).toBeUndefined();
    expect(day.allocations.every((a) => a.playerIds.length === 0)).toBe(true);
    expect(day.queues.every((q) => q.playerIds.length === 0)).toBe(true);
    expect(rosterAfter.length).toBe(players.length);
  });
});
