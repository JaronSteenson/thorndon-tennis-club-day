import { describe, expect, it } from 'vitest';
import { pairCount, pickGroup, recordFoursome } from '@/lib/matchups';

describe('recordFoursome', () => {
  it('increments every pair symmetrically and leaves the input untouched', () => {
    const before = {};
    const after = recordFoursome(before, ['a', 'b', 'c', 'd']);

    expect(before).toEqual({});
    expect(pairCount(after, 'a', 'b')).toBe(1);
    expect(pairCount(after, 'b', 'a')).toBe(1);
    expect(pairCount(after, 'c', 'd')).toBe(1);
    // No self-pairing.
    expect(pairCount(after, 'a', 'a')).toBe(0);
  });

  it('accumulates across repeated foursomes', () => {
    let pw = recordFoursome({}, ['a', 'b', 'c', 'd']);
    pw = recordFoursome(pw, ['a', 'b', 'e', 'f']);
    expect(pairCount(pw, 'a', 'b')).toBe(2);
    expect(pairCount(pw, 'a', 'e')).toBe(1);
  });
});

describe('pickGroup', () => {
  it('prefers players with no shared history over repeat partners', () => {
    const pw = recordFoursome({}, ['A', 'B', 'C', 'D']); // A paired with B,C,D
    const pool = ['E', 'F', 'G', 'H', 'B', 'C', 'D'];
    const { picked } = pickGroup(pool, ['A'], 3, pw);
    expect(picked).not.toContain('B');
    expect(picked).not.toContain('C');
    expect(picked).not.toContain('D');
    expect(picked).toHaveLength(3);
  });

  it('still fills the slots when only repeat partners remain', () => {
    const pw = recordFoursome({}, ['A', 'B', 'C', 'D']);
    const { picked, rest } = pickGroup(['B', 'C', 'D'], ['A'], 3, pw);
    expect(picked.sort()).toEqual(['B', 'C', 'D']);
    expect(rest).toEqual([]);
  });

  it('returns the untouched remainder in pool order', () => {
    const { picked, rest } = pickGroup(['E', 'F', 'G', 'H'], [], 2, {});
    expect(picked).toHaveLength(2);
    expect([...picked, ...rest].sort()).toEqual(['E', 'F', 'G', 'H']);
    expect(rest).toHaveLength(2);
  });
});
