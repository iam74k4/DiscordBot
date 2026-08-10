import { describe, expect, it } from 'vitest';
import { planBroadcast } from '../application/owner.js';

/**
 * `/owner system broadcast` posts into a channel each guild nominated instead
 * of DMing guild owners. The distinction these tests protect is that a guild
 * which never nominated one is *skipped*, not *failed*: the owner reading the
 * result has to be able to tell "nobody opted in" from "delivery is broken".
 */

const guilds = [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }];

describe('planBroadcast', () => {
  it('addresses only guilds that nominated a channel', () => {
    const channels: Record<string, string> = { g1: 'c1', g3: 'c3' };

    const plan = planBroadcast(guilds, (id) => channels[id] ?? null);

    expect(plan.targets).toEqual([
      { guild: { id: 'g1' }, channelId: 'c1' },
      { guild: { id: 'g3' }, channelId: 'c3' },
    ]);
    expect(plan.skipped).toBe(1);
    expect(plan.overCap).toBe(0);
  });

  it('reports an empty plan rather than failures when nobody opted in', () => {
    const plan = planBroadcast(guilds, () => null);

    expect(plan.targets).toHaveLength(0);
    expect(plan.skipped).toBe(3);
  });

  it('caps the fan-out and reports what it left out', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `g${i}` }));

    const plan = planBroadcast(many, (id) => `chan-${id}`, 2);

    expect(plan.targets).toHaveLength(2);
    expect(plan.overCap).toBe(3);
    expect(plan.skipped).toBe(0);
  });

  it('counts guilds without a channel apart from the cap', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `g${i}` }));
    // Half opted in; the cap then bites on that half only.
    const plan = planBroadcast(
      many,
      (id) => (Number(id.slice(1)) % 2 === 0 ? `chan-${id}` : null),
      2
    );

    expect(plan.targets).toHaveLength(2);
    expect(plan.skipped).toBe(3);
    expect(plan.overCap).toBe(1);
  });
});
