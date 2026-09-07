import { describe, expect, it } from 'vitest';
import { AUTHORED } from '../src/data/authored';
import { rng } from '../src/engine/rng';
import {
  decorate,
  gridGenerate,
  makeGenerated,
  paramsFor,
  parseAuthored,
  pathClear,
  peelOrder,
  plateUnits,
  simulate,
} from '../src/engine/levels';
import type { GridCell } from '../src/engine/types';

const LEVELS = Array.from({ length: 200 }, (_, i) => i + 1);

describe('reverse generation', () => {
  it('never produces a deadlocked grid: reverse placement order is always a valid peel', () => {
    for (let rows = 3; rows <= 6; rows++)
      for (let cols = 3; cols <= 6; cols++)
        for (let seed = 1; seed <= 40; seed++) {
          const R = rng(seed * 7919 + rows * 31 + cols);
          const target = Math.round(rows * cols * 0.92);
          const placed = gridGenerate(rows, cols, target, R);
          expect(placed.length).toBeGreaterThan(0);
          // Remove in reverse placement order; every diner must have a clear path when its turn comes.
          const occ: (GridCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
          for (const c of placed) occ[c.r][c.c] = c;
          for (const c of placed.slice().reverse()) {
            expect(pathClear(occ, c.r, c.c, c.dir, rows, cols)).toBe(true);
            occ[c.r][c.c] = null;
          }
          // And the generic peeler agrees the board is solvable.
          expect(peelOrder(placed, rows, cols)).not.toBeNull();
        }
  });

  it('every generated level board (1..200) is peelable in its intended order', () => {
    for (const n of LEVELS) {
      const lv = makeGenerated(n);
      const occ: (unknown | null)[][] = Array.from({ length: lv.rows }, () => Array(lv.cols).fill(null));
      for (const d of lv.diners) occ[d.r][d.c] = d;
      for (const d of lv.diners) {
        expect(pathClear(occ, d.r, d.c, d.dir, lv.rows, lv.cols), `level ${n} diner ${d.id}`).toBe(true);
        occ[d.r][d.c] = null;
      }
    }
  });
});

describe('kitchen accounting', () => {
  it('plate units always equal total appetite (levels 1..200; a special counts one)', () => {
    for (const n of LEVELS) {
      const lv = makeGenerated(n);
      const units = lv.kitchen.reduce((a, p) => a + plateUnits(p), 0);
      const appetite = lv.diners.reduce((a, d) => a + d.need, 0);
      expect(units, `level ${n}`).toBe(appetite);
    }
  });

  it('plate units equal appetite with every mechanic forced on (levels 1..80)', () => {
    for (let n = 1; n <= 80; n++) {
      const lv = makeGenerated(n, true);
      const units = lv.kitchen.reduce((a, p) => a + plateUnits(p), 0);
      const appetite = lv.diners.reduce((a, d) => a + d.need, 0);
      expect(units, `level ${n} (all mechanics)`).toBe(appetite);
    }
  });

  it('plate units equal appetite and the intended order wins with all twelve rules forced on (levels 1..80)', () => {
    for (let n = 1; n <= 80; n++) {
      const lv = makeGenerated(n, 'all');
      const units = lv.kitchen.reduce((a, p) => a + plateUnits(p), 0);
      const appetite = lv.diners.reduce((a, d) => a + d.need, 0);
      expect(units, `level ${n} (all rules)`).toBe(appetite);
      expect(simulate(lv, rng(1), 0, { intended: true }), `level ${n} (all rules)`).toBe('win');
    }
  });

  it('decorate never assigns a VIP plate to a non-VIP diner or vice versa', () => {
    for (let n = 41; n <= 60; n++) {
      const P = paramsFor(n);
      const R = rng(n);
      const placed = gridGenerate(P.rows, P.cols, Math.round(P.rows * P.cols * P.fill), R);
      const { diners, kitchen } = decorate(n, P, R, placed.slice().reverse());
      const vipUnits = kitchen.filter((p) => p.vip).reduce((a, p) => a + plateUnits(p), 0);
      const vipNeed = diners.filter((d) => d.vip).reduce((a, d) => a + d.need, 0);
      expect(vipUnits).toBe(vipNeed);
    }
  });
});

describe('solver', () => {
  it('returns win on the intended order for every level 1..200', () => {
    for (const n of LEVELS) {
      const lv = makeGenerated(n);
      expect(simulate(lv, rng(1), 0, { intended: true }), `level ${n}`).toBe('win');
    }
  });

  it('returns win on the intended order with every mechanic forced on (levels 1..80)', () => {
    for (let n = 1; n <= 80; n++) {
      const lv = makeGenerated(n, true);
      expect(simulate(lv, rng(1), 0, { intended: true }), `level ${n} (all mechanics)`).toBe('win');
    }
  });

  it('measures a fail rate in [0,1] and labels a tier', () => {
    for (const n of [1, 5, 10, 20, 30, 50, 77, 100]) {
      const lv = makeGenerated(n);
      expect(lv.diff).toBeGreaterThanOrEqual(0);
      expect(lv.diff).toBeLessThanOrEqual(1);
      expect(['Easy', 'Medium', 'Hard', 'Super Hard']).toContain(lv.tierLabel);
    }
  });
});

describe('authored boards', () => {
  it('every authored board parses and is peelable', () => {
    for (const [k, rowsStr] of Object.entries(AUTHORED)) {
      const parsed = parseAuthored(rowsStr);
      expect(parsed, `level ${k} parses`).not.toBeNull();
      if (!parsed) continue;
      const tokens = rowsStr
        .join(' ')
        .trim()
        .split(/\s+/)
        .filter((t) => t !== '.').length;
      expect(parsed.cells.length, `level ${k} cell count`).toBe(tokens);
      expect(peelOrder(parsed.cells, parsed.rows, parsed.cols), `level ${k} peelable`).not.toBeNull();
    }
  });

  it('authored levels keep their hand-made layout', () => {
    for (const k of Object.keys(AUTHORED).map(Number)) {
      const lv = makeGenerated(k);
      const parsed = parseAuthored(AUTHORED[k]);
      if (!parsed) throw new Error('unparseable');
      // The generated level may fall back to a generated board if the authored one cannot be tuned into band.
      if (lv.authored) {
        expect(lv.rows).toBe(parsed.rows);
        expect(lv.cols).toBe(parsed.cols);
        expect(lv.diners.length).toBe(parsed.cells.length);
      }
    }
  });
});

describe('determinism', () => {
  it('the same level number always produces the same level', () => {
    for (const n of [1, 7, 10, 23, 48, 99, 150]) {
      const a = makeGenerated(n),
        b = makeGenerated(n);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});
