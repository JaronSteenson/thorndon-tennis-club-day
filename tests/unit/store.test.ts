import { beforeEach, describe, expect, it } from 'vitest';
import { useTennisStore, STORAGE_KEY } from '@/lib/store';
import { pairCount } from '@/lib/matchups';

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

  it('finishGame clears court and flows the next full bucket from the queue', () => {
    const players = useTennisStore.getState().players;
    const courtIds = players.slice(0, 4).map((p) => p.id);
    const queueIds = players.slice(4, 8).map((p) => p.id);

    for (const id of courtIds) useTennisStore.getState().assignToCourt('court-3', id);
    for (const id of queueIds) useTennisStore.getState().queuePlayer(id);

    useTennisStore.getState().finishGame('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual(queueIds);
    expect(alloc.startedAt).toBeGreaterThan(0);
    expect(useTennisStore.getState().day.queue).toEqual([]);
  });

  it('finishGame leaves court empty if fewer than four are waiting', () => {
    const players = useTennisStore.getState().players;
    const courtIds = players.slice(0, 4).map((p) => p.id);
    for (const id of courtIds) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().queuePlayer(players[4].id);
    useTennisStore.getState().finishGame('court-3');
    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual([]);
    expect(alloc.startedAt).toBeUndefined();
    expect(useTennisStore.getState().day.queue).toEqual([players[4].id]);
  });

  it('finishGame flows the front bucket regardless of which court frees up', () => {
    const players = useTennisStore.getState().players;
    const onC4 = players.slice(0, 4).map((p) => p.id);
    const waiting = players.slice(4, 8).map((p) => p.id);
    for (const id of onC4) useTennisStore.getState().assignToCourt('court-4', id);
    for (const id of waiting) useTennisStore.getState().queuePlayer(id);

    useTennisStore.getState().finishGame('court-4');

    const c4 = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-4')!;
    expect(c4.playerIds).toEqual(waiting);
    expect(useTennisStore.getState().day.queue).toEqual([]);
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

  it('finishGame stamps lastOnCourtAt for each finishing player', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().assignToCourt('court-3', id);
    const before = Date.now();
    useTennisStore.getState().finishGame('court-3');
    const stamps = useTennisStore.getState().day.lastOnCourtAt;
    for (const id of ids) {
      expect(stamps[id]).toBeGreaterThanOrEqual(before);
    }
  });

  it('finishGame records the foursome as having played together', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().finishGame('court-3');

    const pw = useTennisStore.getState().day.playedWith;
    expect(pairCount(pw, ids[0], ids[1])).toBe(1);
    expect(pairCount(pw, ids[3], ids[0])).toBe(1);
  });

  it('sort by lastOnCourtAt puts most-recently-played at the end', () => {
    const players = useTennisStore.getState().players;
    const [a, b, c, d, e, f, g, h] = players.slice(0, 8).map((p) => p.id);

    // First game finishes
    for (const id of [a, b, c, d]) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().finishGame('court-3');

    // Second game finishes a moment later
    for (const id of [e, f, g, h]) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().finishGame('court-3');

    const stamps = useTennisStore.getState().day.lastOnCourtAt;
    // Latest game's players have higher timestamps than the first game's players
    expect(stamps[e]).toBeGreaterThanOrEqual(stamps[a]);
    expect(stamps[h]).toBeGreaterThanOrEqual(stamps[d]);
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
    expect(day.queue).toEqual([]);
    expect(day.lastOnCourtAt).toEqual({});
    expect(day.playedWith).toEqual({});
    expect(rosterAfter.length).toBe(players.length);
  });
});

describe('pullNextOntoCourt', () => {
  beforeEach(() => {
    reset();
  });

  it('moves a partial group from the queue onto an empty court without starting', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 2).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().queuePlayer(id);

    useTennisStore.getState().pullNextOntoCourt('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual(ids);
    expect(alloc.startedAt).toBeUndefined();
    expect(useTennisStore.getState().day.queue).toEqual([]);
  });

  it('starts the game when the pull fills the court to 4', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().queuePlayer(id);

    useTennisStore.getState().pullNextOntoCourt('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual(ids);
    expect(alloc.startedAt).toBeGreaterThan(0);
  });

  it('only pulls enough to fill the free slots, leaving the rest queued', () => {
    const players = useTennisStore.getState().players;
    const onCourt = players.slice(0, 2).map((p) => p.id);
    const queued = players.slice(2, 8).map((p) => p.id);
    for (const id of onCourt) useTennisStore.getState().assignToCourt('court-3', id);
    for (const id of queued) useTennisStore.getState().queuePlayer(id);

    useTennisStore.getState().pullNextOntoCourt('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual([...onCourt, ...queued.slice(0, 2)]);
    expect(alloc.startedAt).toBeGreaterThan(0);
    expect(useTennisStore.getState().day.queue).toEqual(queued.slice(2));
  });

  it('is a no-op (and leaves lastUndo alone) when the court is full', () => {
    const players = useTennisStore.getState().players;
    const onCourt = players.slice(0, 4).map((p) => p.id);
    const queued = players.slice(4, 6).map((p) => p.id);
    for (const id of onCourt) useTennisStore.getState().assignToCourt('court-3', id);
    for (const id of queued) useTennisStore.getState().queuePlayer(id);
    const undoBefore = useTennisStore.getState().lastUndo;

    useTennisStore.getState().pullNextOntoCourt('court-3');

    const alloc = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-3')!;
    expect(alloc.playerIds).toEqual(onCourt);
    expect(useTennisStore.getState().day.queue).toEqual(queued);
    expect(useTennisStore.getState().lastUndo).toBe(undoBefore);
  });
});

describe('autoAssign', () => {
  beforeEach(() => {
    reset();
  });

  it('ordered fills courts with the longest-waiting players, overflow to queues', () => {
    const players = useTennisStore.getState().players;
    const played = players.slice(0, 4).map((p) => p.id);
    for (const id of played) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().finishGame('court-3');

    const fresh = players.slice(4, 16).map((p) => p.id);
    for (const id of [...fresh, ...played]) useTennisStore.getState().markPresent(id);

    useTennisStore.getState().autoAssign('ordered');

    const { allocations, queue } = useTennisStore.getState().day;
    expect(allocations.every((a) => a.playerIds.length === 4)).toBe(true);
    expect(allocations.every((a) => (a.startedAt ?? 0) > 0)).toBe(true);
    // The 12 never-played players take the 12 court slots; the 4 who just
    // played overflow into the single waiting line.
    const onCourts = new Set(allocations.flatMap((a) => a.playerIds));
    for (const id of fresh) expect(onCourts.has(id)).toBe(true);
    expect(new Set(queue)).toEqual(new Set(played));
  });

  it('ordered tops up partially filled courts without disturbing occupants', () => {
    const players = useTennisStore.getState().players;
    const occupants = players.slice(0, 2).map((p) => p.id);
    for (const id of occupants) useTennisStore.getState().assignToCourt('court-4', id);
    const fresh = players.slice(2, 8).map((p) => p.id);
    for (const id of fresh) useTennisStore.getState().markPresent(id);

    useTennisStore.getState().autoAssign('ordered');

    const c4 = useTennisStore.getState().day.allocations.find((a) => a.courtId === 'court-4')!;
    expect(c4.playerIds.slice(0, 2)).toEqual(occupants);
    expect(c4.playerIds.length).toBe(4);
  });

  it('random fills every free slot while the pool lasts, with no duplicates', () => {
    const players = useTennisStore.getState().players;
    const present = players.slice(0, 20).map((p) => p.id);
    for (const id of present) useTennisStore.getState().markPresent(id);

    useTennisStore.getState().autoAssign('random');

    const { allocations, queue } = useTennisStore.getState().day;
    const placed = [...allocations.flatMap((a) => a.playerIds), ...queue];
    // 12 court slots fill, the remaining 8 of the pool of 20 join the queue.
    expect(allocations.every((a) => a.playerIds.length === 4)).toBe(true);
    expect(placed.length).toBe(20);
    expect(new Set(placed).size).toBe(20);
    for (const id of placed) expect(present).toContain(id);
  });

  it('is a no-op when no present players are available', () => {
    const undoBefore = useTennisStore.getState().lastUndo;
    useTennisStore.getState().autoAssign('ordered');
    expect(useTennisStore.getState().lastUndo).toBe(undoBefore);
  });

  it('random does not reunite a foursome that just played together', () => {
    const players = useTennisStore.getState().players;
    const foursome = players.slice(0, 4).map((p) => p.id);
    const fresh = players.slice(4, 7).map((p) => p.id);

    // Play and finish a game so the foursome is recorded as having played.
    for (const id of foursome) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().finishGame('court-3');
    // The four are still present; add three never-paired players to the pool.
    for (const id of fresh) useTennisStore.getState().markPresent(id);

    // Repeat enough times that we'd almost certainly hit a bad shuffle if the
    // anti-repeat grouping weren't working.
    for (let trial = 0; trial < 25; trial++) {
      // Clear courts back to the pre-fill state without wiping playedWith.
      for (const courtId of ['court-3', 'court-4', 'court-5']) {
        for (const id of [...foursome, ...fresh]) {
          useTennisStore.getState().removeFromCourt(courtId, id);
        }
      }
      useTennisStore.getState().autoAssign('random');
      const { allocations } = useTennisStore.getState().day;
      for (const a of allocations) {
        const onThisCourt = foursome.filter((id) => a.playerIds.includes(id));
        expect(onThisCourt.length).toBeLessThan(4);
      }
    }
  });
});

describe('undo', () => {
  beforeEach(() => {
    reset();
  });

  it('restores day state after assignToCourt and clears lastUndo', () => {
    const id = useTennisStore.getState().players[0].id;
    const dayBefore = useTennisStore.getState().day;

    useTennisStore.getState().assignToCourt('court-3', id);
    expect(useTennisStore.getState().lastUndo?.label).toContain('Court 3');

    useTennisStore.getState().undo();
    expect(useTennisStore.getState().day).toEqual(dayBefore);
    expect(useTennisStore.getState().lastUndo).toBeNull();
  });

  it('removes a quick-added player on undo', () => {
    const before = useTennisStore.getState().players.length;
    const added = useTennisStore.getState().quickAddPlayer('Undo Me', { markPresent: true });

    useTennisStore.getState().undo();

    expect(useTennisStore.getState().players.length).toBe(before);
    expect(useTennisStore.getState().day.presentPlayerIds).not.toContain(added.id);
  });

  it('restores the whole day after finishClubDay', () => {
    const players = useTennisStore.getState().players;
    const ids = players.slice(0, 4).map((p) => p.id);
    for (const id of ids) useTennisStore.getState().assignToCourt('court-3', id);
    useTennisStore.getState().setDutyManager(ids[0]);
    const dayBefore = useTennisStore.getState().day;

    useTennisStore.getState().finishClubDay();
    useTennisStore.getState().undo();

    expect(useTennisStore.getState().day).toEqual(dayBefore);
  });

  it('no-op actions do not overwrite the last undo snapshot', () => {
    const id = useTennisStore.getState().players[0].id;
    useTennisStore.getState().markPresent(id);
    const undoAfterFirst = useTennisStore.getState().lastUndo;

    useTennisStore.getState().markPresent(id); // already present → no-op

    expect(useTennisStore.getState().lastUndo).toBe(undoAfterFirst);
    useTennisStore.getState().undo();
    expect(useTennisStore.getState().day.presentPlayerIds).not.toContain(id);
  });

  it('undo with no snapshot is safe', () => {
    expect(useTennisStore.getState().lastUndo).toBeNull();
    expect(() => useTennisStore.getState().undo()).not.toThrow();
  });
});

describe('mode and persistence', () => {
  beforeEach(() => {
    reset();
  });

  it('setMode toggles between allocation and signin', () => {
    expect(useTennisStore.getState().mode).toBe('allocation');
    useTennisStore.getState().setMode('signin');
    expect(useTennisStore.getState().mode).toBe('signin');
  });

  it('persists only players and day — mode and lastUndo stay session-only', () => {
    useTennisStore.getState().markPresent(useTennisStore.getState().players[0].id);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(Object.keys(raw.state).sort()).toEqual(['day', 'players']);
  });
});
