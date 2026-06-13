export type PlayedWith = Record<string, Record<string, number>>;

/** How many times this pair has already played together today. */
export function pairCount(playedWith: PlayedWith, a: string, b: string): number {
  return playedWith[a]?.[b] ?? 0;
}

/**
 * Return a new map with every pair in `ids` incremented by one — i.e. the
 * record that they have now played a game together.
 */
export function recordFoursome(playedWith: PlayedWith, ids: string[]): PlayedWith {
  const next: PlayedWith = {};
  for (const k of Object.keys(playedWith)) next[k] = { ...playedWith[k] };
  const bump = (a: string, b: string) => {
    next[a] = next[a] ?? {};
    next[a][b] = (next[a][b] ?? 0) + 1;
  };
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      bump(ids[i], ids[j]);
      bump(ids[j], ids[i]);
    }
  }
  return next;
}

/**
 * Greedily pick `count` players from `pool` (assumed pre-shuffled so ties
 * resolve randomly) that share the fewest past matchups with `fixed` and with
 * each other. Best-effort only — it never refuses to fill a slot. Returns the
 * chosen ids and the untouched remainder, preserving pool order in `rest`.
 */
export function pickGroup(
  pool: string[],
  fixed: string[],
  count: number,
  playedWith: PlayedWith,
): { picked: string[]; rest: string[] } {
  const remaining = [...pool];
  const group = [...fixed];
  const picked: string[] = [];

  for (let n = 0; n < count && remaining.length > 0; n++) {
    let bestIdx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let cost = 0;
      for (const member of group) cost += pairCount(playedWith, candidate, member);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
        if (cost === 0) break; // can't do better than a fresh pairing
      }
    }
    const [chosen] = remaining.splice(bestIdx, 1);
    group.push(chosen);
    picked.push(chosen);
  }

  return { picked, rest: remaining };
}
