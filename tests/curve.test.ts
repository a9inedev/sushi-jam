/* The curve is the only source of tuning numbers: the generator, the solver, the beat sheet and the authored
   level defaults all read it, and swapping the active curve changes the next level built. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { bundledCurve, curve, curveFor, resetCurve, setCurve, validateCurve, type Curve } from '../src/data/curve';
import { beatFor } from '../src/engine/author';
import { levelFromJson, type LevelJson } from '../src/engine/authored';
import { clearLevelCache, evalLevel, getLevel, makeGenerated, paramsFor, schedTier } from '../src/engine/levels';

const clone = (): Curve => JSON.parse(JSON.stringify(bundledCurve()));

afterEach(() => {
  resetCurve();
  clearLevelCache();
});

describe('curve.json', () => {
  it('has 200 contiguous levels, each with its target inside its band', () => {
    const c = bundledCurve();
    expect(c.levels.length).toBe(200);
    c.levels.forEach((e, i) => {
      expect(e.n).toBe(i + 1);
      expect(e.fail).toBeGreaterThanOrEqual(e.band[0]);
      expect(e.fail).toBeLessThanOrEqual(e.band[1]);
    });
    expect(c.solver).toEqual({ noise: 0.25, runs: 40, ciRuns: 200 });
  });

  it('grows the board and the palette and keeps walls on x0 with relief after them', () => {
    const c = bundledCurve().levels;
    expect(c[0].rows * c[0].cols).toBeLessThan(c[49].rows * c[49].cols);
    expect(c[0].colors).toBeLessThan(c[49].colors);
    for (let n = 20; n <= 200; n += 10) {
      expect(c[n - 1].fail, `wall ${n}`).toBeGreaterThanOrEqual(0.45);
      if (n < 200) expect(c[n].fail, `relief ${n + 1}`).toBeLessThan(c[n - 1].fail - 0.2);
    }
  });

  it('validateCurve rejects broken curves with a reason', () => {
    const cases: [(c: Curve) => unknown, RegExp][] = [
      [(c) => ({ ...c, v: 2 }), /version/],
      [(c) => ({ ...c, solver: undefined }), /solver/],
      [(c) => ({ ...c, levels: [] }), /non-empty/],
      [(c) => ({ ...c, levels: c.levels.filter((e) => e.n !== 3) }), /contiguous/],
      [(c) => ((c.levels[4].colors = 9), c), /colors/],
      [(c) => ((c.levels[4].seats = 2.5), c), /seats must be an integer/],
      [(c) => ((c.levels[4].app = [4, 2]), c), /app/],
      [(c) => ((c.levels[4].fail = 0.9), c), /outside its band/],
      [() => 'nope', /not an object/],
    ];
    for (const [mutate, re] of cases) {
      const r = validateCurve(mutate(clone()));
      expect(r.curve).toBeNull();
      expect(r.error).toMatch(re);
    }
    expect(validateCurve(clone()).curve).toEqual(bundledCurve());
  });
});

describe('the engine reads the curve', () => {
  it('paramsFor and schedTier come from the row for that level', () => {
    const e = curveFor(150);
    const p = paramsFor(150);
    expect([p.rows, p.cols, p.colors, p.seats, p.beltCap, p.visibleNext, p.fill, p.speed]).toEqual([
      e.rows,
      e.cols,
      e.colors,
      e.seats,
      e.beltCap,
      e.visibleNext,
      e.fill,
      e.speed,
    ]);
    expect(p.app).toEqual(e.app);
    expect(schedTier(1)).toBe('Easy');
    expect(schedTier(20)).toBe('Super Hard');
  });

  it('holds at the last row beyond the curve', () => {
    const last = curve().levels[199];
    expect(curveFor(500)).toEqual({ ...last, n: 500 });
    expect(paramsFor(500).rows).toBe(last.rows);
  });

  it('changing one number changes the next generated level, and the level cache is dropped', () => {
    const before = getLevel(150);
    expect(before.P.seats).toBe(4);
    const c = clone();
    c.levels[149].seats = 3;
    c.levels[149].beltCap = 6;
    setCurve(c, 'remote');
    const after = getLevel(150);
    expect(after).not.toBe(before);
    expect(after.P.seats).toBe(3);
    expect(after.P.beltCap).toBe(6);
    expect(makeGenerated(150).P.seats).toBe(3);
    expect(paramsFor(150).seats).toBe(3);
  });

  it('changing one number changes an authored level too, through the defaults its file leaves out', () => {
    const j = JSON.parse(readFileSync('levels/005.json', 'utf8')) as LevelJson;
    expect(j.seats).toBeUndefined();
    expect(levelFromJson(j).P.seats).toBe(4);
    const c = clone();
    c.levels[4].seats = 3;
    c.levels[4].speed = 0.2;
    setCurve(c, 'remote');
    const lv = levelFromJson(j);
    expect(lv.P.seats).toBe(3);
    expect(lv.P.speed).toBe(0.2);
  });

  it('the beat sheet takes its numbers and its band from the curve', () => {
    const c = clone();
    c.levels[41].band = [0.2, 0.5];
    c.levels[41].fail = 0.35;
    c.levels[41].colors = 3;
    setCurve(c, 'remote');
    const b = beatFor(42);
    expect(b.band).toEqual([0.2, 0.5]);
    expect(b.colors).toBe(3);
    expect(b.kind).toBe('medium');
  });

  it('the solver noise comes from the curve', () => {
    const lv = makeGenerated(150);
    const noisy = evalLevel(lv, 40);
    const c = clone();
    c.solver.noise = 0;
    setCurve(c, 'remote');
    const quiet = evalLevel(lv, 40);
    expect(quiet).toBeLessThanOrEqual(noisy);
    c.solver.noise = 1;
    setCurve(c, 'remote');
    expect(evalLevel(lv, 40)).toBeGreaterThan(quiet);
  });
});
