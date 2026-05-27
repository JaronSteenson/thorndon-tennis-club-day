import { describe, expect, it } from 'vitest';
import { mergeCourts, mergePlayers } from '@/lib/seedMerge';

describe('mergePlayers', () => {
  it('returns seed when no local entries', () => {
    const merged = mergePlayers(
      [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Bravo' },
      ],
      [],
    );
    expect(merged.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('localStorage wins on id conflict', () => {
    const merged = mergePlayers(
      [{ id: 'a', name: 'Original' }],
      [{ id: 'a', name: 'User-renamed' }],
    );
    expect(merged.find((p) => p.id === 'a')?.name).toBe('User-renamed');
  });

  it('new seed entries appear, local-only entries kept', () => {
    const merged = mergePlayers(
      [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Bravo' },
      ],
      [{ id: 'c', name: 'Custom' }],
    );
    expect(merged.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('sorts by name', () => {
    const merged = mergePlayers(
      [
        { id: '1', name: 'Charlie' },
        { id: '2', name: 'Alpha' },
        { id: '3', name: 'Bravo' },
      ],
      [],
    );
    expect(merged.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});

describe('mergeCourts', () => {
  it('adds local-only courts', () => {
    const merged = mergeCourts(
      [{ id: 'court-3', name: 'Court 3', color: 'blue' }],
      [{ id: 'court-x', name: 'Court X', color: 'green' }],
    );
    expect(merged.map((c) => c.id).sort()).toEqual(['court-3', 'court-x']);
  });
});
