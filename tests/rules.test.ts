/* The six rules from levels 81 to 131 at the solver level: chained seats, rush hour, chef's special, ticket
   (picky) guests, reserved seats and belt reversal. Each test builds a tiny level by hand so the behaviour is
   pinned independently of generation. */
import { describe, expect, it } from 'vitest';
import {
  formatCell,
  formatKitchen,
  levelFromJson,
  parseCellToken,
  parseKitchen,
  validateLevel,
  type LevelJson,
} from '../src/engine/authored';
import {
  ALL_MECHS,
  assignPicky,
  hasRules,
  kitchenSim,
  makeGenerated,
  matchDP,
  mechsOf,
  normaliseRules,
  paramsFor,
  rulesJson,
  simulate,
  type SimTrace,
} from '../src/engine/levels';
import { rng } from '../src/engine/rng';
import type { DinerDef, LevelLike, LevelRules, PlateDef } from '../src/engine/types';

const plate = (color: number, extra: Partial<PlateDef> = {}): PlateDef => ({
  color,
  vip: false,
  double: false,
  wasabi: false,
  covered: false,
  ...extra,
});

/** A one-row board: every diner faces up with a clear path, so the intended order is the array order. */
function level(
  diners: Partial<DinerDef>[],
  kitchen: PlateDef[],
  opts: { seats?: number; beltCap?: number; rules?: Partial<LevelRules>; colors?: number } = {}
): LevelLike {
  const ds: DinerDef[] = diners.map((d, i) => ({
    r: 0,
    c: i,
    dir: 0,
    id: i,
    color: 0,
    need: 1,
    vip: false,
    lockColor: -1,
    ice: 0,
    ...d,
  }));
  assignPicky(ds);
  const rules = normaliseRules(opts.rules);
  const P = {
    ...paramsFor(1),
    seats: opts.seats ?? 2,
    beltCap: opts.beltCap ?? 8,
    colors: opts.colors ?? 4,
    visibleNext: 3,
    rows: 1,
    cols: ds.length,
    ...(hasRules(rules) ? { rules } : {}),
  };
  return { P, rows: 1, cols: ds.length, diners: ds, kitchen, seed: 1 };
}

const intended = (lv: LevelLike, trace?: (e: SimTrace) => void) => simulate(lv, rng(1), 0, { intended: true, trace });

describe('chained seats', () => {
  it('the back seat only waits: a plate for the waiting guest jams the belt', () => {
    // A (colour 0) sits in front, B (colour 1) waits behind. B's plate comes first and nobody can take it.
    const lv = level([{ color: 0 }, { color: 1 }], [plate(1), plate(0)], { seats: 2, beltCap: 1, rules: { chain: 1 } });
    expect(intended(lv)).toBe('fail');
    const plain = level([{ color: 0 }, { color: 1 }], [plate(1), plate(0)], { seats: 2, beltCap: 1 });
    expect(intended(plain)).toBe('win');
  });

  it('the waiting guest slides forward and eats once the front guest leaves', () => {
    const lv = level([{ color: 0 }, { color: 1 }], [plate(0), plate(1)], { seats: 2, beltCap: 1, rules: { chain: 1 } });
    expect(intended(lv)).toBe('win');
  });

  it('kitchenSim derives the service order with the reduced concurrency', () => {
    const ds = level([{ color: 0 }, { color: 1 }, { color: 2 }], [], { seats: 2 }).diners;
    const { kitchen } = kitchenSim(ds, 2, rng(3), { rules: normaliseRules({ chain: 1 }) });
    // With one eating seat the plates must come strictly in diner order.
    expect(kitchen.map((p) => p.color)).toEqual([0, 1, 2]);
  });
});

describe('reserved seat', () => {
  it('only the reserved colour may sit there; others wait for a plain seat', () => {
    // Seat 0 is reserved for colour 1, so A (colour 0) and B (colour 2) cannot eat side by side: a kitchen
    // order that interleaves their plates jams a one-plate belt, while the same order wins on plain seats.
    const diners = [
      { color: 0, need: 2 },
      { color: 2, need: 2 },
      { color: 1, need: 1 },
    ];
    const interleaved = [plate(0), plate(2), plate(0), plate(2), plate(1)];
    expect(intended(level(diners, interleaved, { seats: 2, beltCap: 1 }))).toBe('win');
    expect(intended(level(diners, interleaved, { seats: 2, beltCap: 1, rules: { reserved: [1, -1] } }))).toBe('fail');
    // Served one guest at a time (as the kitchen simulation would plan it) the reserved seat is fine.
    const planned = [plate(0), plate(0), plate(2), plate(2), plate(1)];
    expect(intended(level(diners, planned, { seats: 2, beltCap: 1, rules: { reserved: [1, -1] } }))).toBe('win');
    // The kitchen simulation itself never interleaves A and B: A's plates come first, then B and C share.
    const ds = level(diners, [], { seats: 2 }).diners;
    const { kitchen } = kitchenSim(ds, 2, rng(1), { rules: normaliseRules({ reserved: [1, -1] }) });
    expect(kitchen.slice(0, 2).map((p) => p.color)).toEqual([0, 0]);
    expect(
      kitchen
        .slice(2)
        .map((p) => p.color)
        .sort()
    ).toEqual([1, 2, 2]);
  });

  it('validation rejects a seat reserved for a colour nobody has', () => {
    const lv = level([{ color: 0 }, { color: 0 }], [plate(0), plate(0)], { seats: 2, rules: { reserved: [3, -1] } });
    expect(validateLevel(lv, 10).problems.join(' ')).toMatch(/reserved for a colour nobody has/);
  });
});

describe('rush hour', () => {
  it('sends plates 1.5x as fast from the trigger plate on', () => {
    const many = Array.from({ length: 30 }, () => plate(0));
    const diners = [
      { color: 0, need: 5 },
      { color: 0, need: 5 },
      { color: 0, need: 5 },
      { color: 0, need: 5 },
      { color: 0, need: 5 },
      { color: 0, need: 5 },
    ];
    const base = level(diners, many, { seats: 4, beltCap: 12 });
    const rush = level(diners, many, { seats: 4, beltCap: 12, rules: { rush: 2 } });
    const emitted = (lv: LevelLike) => {
      const at: number[] = [];
      intended(lv, (e) => {
        if (e.step <= 8) at.push(e.emitted);
      });
      return at;
    };
    const a = emitted(base),
      b = emitted(rush);
    expect(a[7]).toBe(8);
    expect(b[7]).toBeGreaterThanOrEqual(11);
    let sawRush = false;
    intended(rush, (e) => {
      if (e.rush) sawRush = true;
    });
    expect(sawRush).toBe(true);
  });

  it('validation rejects a rush that starts after the last plate', () => {
    const lv = level([{ color: 0 }], [plate(0)], { seats: 1, rules: { rush: 5 } });
    expect(validateLevel(lv, 10).problems.join(' ')).toMatch(/rush hour starts at plate/);
  });
});

describe("chef's special", () => {
  it('any ordinary diner takes it; VIPs and ticket guests refuse', () => {
    const sp = plate(0, { special: true });
    expect(matchDP({ color: 3 }, sp, 1)).toBe(true);
    expect(matchDP({ color: 3, vip: true }, sp, 1)).toBe(false);
    expect(matchDP({ color: 3, seq: [3, 1], picky: 0 }, sp, 2)).toBe(false);
    expect(matchDP({ color: 3 }, sp, 0)).toBe(false);
  });

  it('is planned for a guest and counts as one of their plates', () => {
    const lv = level([{ color: 0, need: 2 }], [plate(0, { special: true }), plate(0)], { seats: 1, beltCap: 1 });
    expect(intended(lv)).toBe('win');
    expect(validateLevel(lv, 10).ok).toBe(true);
    // An extra plate beyond the appetite is flagged by validation but still cannot strand the level.
    const extra = level([{ color: 0, need: 2 }], [plate(0, { special: true }), plate(0), plate(0)], {
      seats: 1,
      beltCap: 1,
    });
    expect(validateLevel(extra, 10).problems.join(' ')).toMatch(/plates 3 vs appetite 2/);
    expect(intended(extra)).toBe('win');
  });

  it('when the wrong guest takes it, the chef swaps the leftover for the missing colour', () => {
    // The special was planned for B (colour 1) but A (colour 0, seated first) grabs it. A's own plate is now
    // spare and B is one short: the spare plate is recoloured to 1 and B still finishes.
    const lv = level(
      [
        { color: 0, need: 1 },
        { color: 1, need: 2 },
      ],
      [plate(1, { special: true }), plate(0), plate(1)],
      {
        seats: 2,
        beltCap: 2,
      }
    );
    expect(intended(lv)).toBe('win');
    const { kitchen } = kitchenSim(lv.diners, 2, rng(2), { specialP: 1 });
    // The plan credits its specials, so plates plus specials always equal appetite per colour.
    const units = (c: number) => kitchen.filter((p) => p.color === c).length;
    expect(units(0)).toBe(1);
    expect(units(1)).toBe(2);
  });

  it('with chained or reserved seats the plan follows the belt: the first eating guest takes a plate', () => {
    // Two colour-0 guests eat side by side; B needs a double at some point. The plan must never send a
    // double that only the second guest could take after the first has eaten the single.
    const diners = [
      { color: 0, need: 1 },
      { color: 0, need: 3 },
      { color: 1, need: 1 },
      { color: 2, need: 1 },
    ];
    for (let seed = 1; seed <= 30; seed++) {
      const ds = level(diners, [], { seats: 3 }).diners;
      const rules = normaliseRules({ chain: 1 });
      const { kitchen } = kitchenSim(ds, 3, rng(seed), { doubleP: 0.8, rules });
      const lv = level(diners, kitchen, { seats: 3, beltCap: 3, rules: { chain: 1 } });
      expect(intended(lv), 'seed ' + seed).toBe('win');
    }
  });

  it('a special nobody can take any more is collected too', () => {
    const lv = level([{ color: 0, vip: true }], [plate(0, { special: true }), plate(0, { vip: true })], {
      seats: 1,
      beltCap: 1,
    });
    expect(intended(lv)).toBe('win');
  });
});

describe('ticket (picky) guests', () => {
  it('eat only their named plates, in the printed order', () => {
    const p = { color: 2, seq: [2, 0], picky: 0 };
    expect(matchDP(p, plate(2, { owner: 0 }), 2)).toBe(true);
    expect(matchDP(p, plate(0, { owner: 0 }), 2)).toBe(false);
    expect(matchDP(p, plate(0, { owner: 0 }), 1)).toBe(true);
    expect(matchDP(p, plate(2), 2)).toBe(false);
    expect(matchDP({ color: 2 }, plate(2, { owner: 0 }), 1)).toBe(false);
  });

  it('a sequence out of order still finishes once the right plate comes round', () => {
    const lv = level([{ color: 2, need: 2, seq: [2, 0] }], [plate(0, { owner: 0 }), plate(2, { owner: 0 })], {
      seats: 1,
      beltCap: 2,
    });
    expect(intended(lv)).toBe('win');
  });

  it('kitchenSim sends named plates in the ticket order and assignPicky numbers guests by position', () => {
    const ds = level([{ color: 0 }, { color: 1, need: 3, seq: [1, 2, 0] }, { color: 2 }], [], { seats: 1 }).diners;
    expect(ds[1].picky).toBe(0);
    const { kitchen } = kitchenSim(ds, 1, rng(5));
    expect(kitchen.map((p) => p.color)).toEqual([0, 1, 2, 0, 2]);
    expect(kitchen.map((p) => p.owner ?? -1)).toEqual([-1, 0, 0, 0, -1]);
  });

  it('validation checks the ticket against the kitchen', () => {
    const bad = level([{ color: 1, need: 2, seq: [1, 0] }], [plate(1, { owner: 0 }), plate(2, { owner: 0 })], {
      seats: 1,
    });
    expect(validateLevel(bad, 10).problems.join(' ')).toMatch(/ticket says/);
    const short = level([{ color: 1, need: 3, seq: [1, 0] }], [plate(1, { owner: 0 }), plate(0, { owner: 0 })], {
      seats: 1,
    });
    expect(validateLevel(short, 10).problems.join(' ')).toMatch(/sequence of 2 vs appetite 3/);
  });
});

describe('belt reversal', () => {
  it('returns belt plates to the kitchen while reversed and pauses the kitchen', () => {
    const many = Array.from({ length: 12 }, () => plate(1));
    const lv = level([{ color: 0 }, { color: 1, need: 12 }], [plate(0), ...many], {
      seats: 1,
      beltCap: 12,
      rules: { reverse: [4.2, 2.1] }, // 6 steps forward, 3 reversed
    });
    const trace: SimTrace[] = [];
    intended(lv, (e) => trace.push(e));
    const rev = trace.filter((e) => e.reversed);
    expect(rev.length).toBeGreaterThan(0);
    for (const e of rev) {
      const prev = trace[e.step - 2];
      // Nothing is emitted and the belt shrinks (or is already empty) during a reversal.
      expect(e.emitted).toBe(prev.emitted);
      expect(e.belt).toBeLessThanOrEqual(prev.belt);
    }
    expect(trace[5].reversed).toBe(false);
    expect(trace[6].reversed).toBe(true);
    expect(trace[9].reversed).toBe(false);
  });

  it('validation rejects a bad cadence', () => {
    const lv = level([{ color: 0 }], [plate(0)], { seats: 1, rules: { reverse: [3, 5] } });
    expect(validateLevel(lv, 10).problems.join(' ')).toMatch(/cadence/);
  });
});

describe('rules plumbing', () => {
  it('normaliseRules and rulesJson round trip and drop empties', () => {
    expect(hasRules(normaliseRules({}))).toBe(false);
    expect(rulesJson(normaliseRules({ chain: 0, reserved: [-1, -1] }))).toBeUndefined();
    const r = normaliseRules({ chain: 1, rush: 6, reserved: [-1, 2], reverse: [14, 4] });
    expect(rulesJson(r)).toEqual({ chain: 1, rush: 6, reserved: [-1, 2], reverse: [14, 4] });
  });

  it('tokens carry tickets, specials and named plates', () => {
    expect(parseCellToken('1^3P102')).toEqual({
      color: 1,
      dir: 0,
      need: 3,
      vip: false,
      lockColor: -1,
      ice: 0,
      seq: [1, 0, 2],
    });
    expect(formatCell({ color: 1, dir: 0, need: 3, vip: false, lockColor: -1, ice: 0, seq: [1, 0, 2] })).toBe(
      '1^3P102'
    );
    const k = parseKitchen('0S 2N1 3VD 1WC');
    expect(k[0].special).toBe(true);
    expect(k[1].owner).toBe(1);
    expect(k[2].vip && k[2].double).toBe(true);
    expect(formatKitchen(k)).toBe('0S 2N1 3VD 1WC');
  });

  it('a JSON level with rules loads, plays and reports its mechanics', () => {
    const j: LevelJson = {
      n: 200,
      band: [0, 1],
      rows: 1,
      cols: 3,
      colors: 3,
      seats: 3,
      cells: ['0^1 1^2P12 2^1'],
      kitchen: '0 1N0 2N0 2S',
      rules: { chain: 1, rush: 2, reverse: [14, 4] },
      seed: 7,
    };
    const lv = levelFromJson(j);
    expect(lv.P.rules).toEqual({ chain: 1, rush: 2, reserved: [], reverse: [14, 4] });
    expect(mechsOf(lv)).toEqual(['chain', 'rush', 'special', 'picky', 'reverse']);
    expect(validateLevel(lv, 20).problems).toEqual([]);
  });

  it('the generator uses every rule somewhere in levels 132 to 200, and all twelve when forced', () => {
    const seen = new Set<string>();
    for (let n = 132; n <= 200; n++) for (const m of makeGenerated(n).mechs) seen.add(m);
    for (const m of ALL_MECHS) expect(seen.has(m), m).toBe(true);
    const forced = new Set<string>();
    for (let n = 30; n <= 60; n++) for (const m of makeGenerated(n, 'all').mechs) forced.add(m);
    for (const m of ALL_MECHS) expect(forced.has(m), m + ' (all)').toBe(true);
  });
});
