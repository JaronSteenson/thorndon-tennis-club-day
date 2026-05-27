import type { Court, Player } from './types';

export function mergePlayers(seed: Player[], local: Player[]): Player[] {
  const byId = new Map<string, Player>();
  for (const p of seed) byId.set(p.id, p);
  for (const p of local) byId.set(p.id, p);
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeCourts(seed: Court[], local: Court[]): Court[] {
  const byId = new Map<string, Court>();
  for (const c of seed) byId.set(c.id, c);
  for (const c of local) byId.set(c.id, c);
  return Array.from(byId.values());
}
