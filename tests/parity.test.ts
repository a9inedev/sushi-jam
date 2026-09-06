/* Proves the TypeScript engine generates exactly the levels the legacy single-file build did.
   The fixture was dumped from the pre-split index.html with tools/dump-legacy-levels.mjs. */
import { describe, expect, it } from 'vitest';
import { makeLevel } from '../src/engine/levels';
import fixture from './fixtures/legacy-levels.json';

interface Compact {
  n: number;
  seed: number;
  diff: number;
  tierLabel: string;
  rows: number;
  cols: number;
  authored: boolean;
  visibleNext: number;
  beltCap: number;
  mechs: string[];
  diners: number[][];
  kitchen: number[][];
}

function compact(n: number, allMech: boolean): Compact {
  const lv = makeLevel(n, allMech);
  return {
    n: lv.n,
    seed: lv.seed,
    diff: +lv.diff.toFixed(4),
    tierLabel: lv.tierLabel,
    rows: lv.rows,
    cols: lv.cols,
    authored: !!lv.authored,
    visibleNext: lv.P.visibleNext,
    beltCap: lv.P.beltCap,
    mechs: lv.mechs,
    diners: lv.diners.map((d) => [d.r, d.c, d.dir, d.color, d.need, d.vip ? 1 : 0, d.lockColor, d.ice]),
    kitchen: lv.kitchen.map((p) => [p.color, p.vip ? 1 : 0, p.double ? 1 : 0, p.wasabi ? 1 : 0, p.covered ? 1 : 0]),
  };
}

describe('parity with the legacy build', () => {
  it('levels 1..120 are identical (board, kitchen, tuning, measured fail rate)', () => {
    for (const legacy of fixture.normal as Compact[]) {
      expect(compact(legacy.n, false), `level ${legacy.n}`).toEqual(legacy);
    }
  });

  it('levels 1..60 with every mechanic forced on are identical', () => {
    for (const legacy of fixture.all as Compact[]) {
      expect(compact(legacy.n, true), `level ${legacy.n} (all mechanics)`).toEqual(legacy);
    }
  });
});
