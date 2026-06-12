import type { Player } from './types';

/**
 * Longest-waiting first: players who have never played (no timestamp) come
 * before players who finished a game, oldest finish first. Name tiebreak.
 */
export function compareByWait(
  a: Player,
  b: Player,
  lastOnCourtAt: Record<string, number>,
): number {
  const ta = lastOnCourtAt[a.id] ?? 0;
  const tb = lastOnCourtAt[b.id] ?? 0;
  if (ta !== tb) return ta - tb;
  return a.name.localeCompare(b.name);
}
