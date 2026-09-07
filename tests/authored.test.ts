/* Every file in levels/ must be solvable, internally consistent, inside its fail-rate band, and follow the
   beat sheet. The solver is seeded, so the 200-run measurement here is exactly what the tool recorded. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MECH_UNLOCK } from '../src/data/mechanics';
import { beatFor } from '../src/engine/author';
import { levelFromJson, parseCells, validateLevel, type LevelJson } from '../src/engine/authored';
import { evalLevel, simulate } from '../src/engine/levels';
import { NEW_MECHS } from '../src/engine/levels';
import { rng } from '../src/engine/rng';
import type { MechKind } from '../src/engine/types';

const AUTHORED_MAX = 140;

const DIR = join(process.cwd(), 'levels');
const FILES = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
const LEVELS: LevelJson[] = FILES.map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

describe('authored level files', () => {
  it('cover levels 1 to 140 exactly once, named by number', () => {
    expect(LEVELS.length).toBe(AUTHORED_MAX);
    const ns = LEVELS.map((j) => j.n).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: AUTHORED_MAX }, (_, i) => i + 1));
    FILES.forEach((f, i) => expect(f).toBe(String(LEVELS[i].n).padStart(3, '0') + '.json'));
  });

  it('every level is solvable and consistent (peelable, plates equal appetite, intended order wins)', () => {
    for (const j of LEVELS) {
      const lv = levelFromJson(j);
      const v = validateLevel(lv, 40);
      expect(v.problems, `level ${j.n}`).toEqual([]);
      expect(simulate(lv, rng(1), 0, { intended: true }), `level ${j.n} intended`).toBe('win');
      const parsed = parseCells(j.cells);
      expect(parsed.rows, `level ${j.n} rows`).toBe(j.rows);
      expect(parsed.cols, `level ${j.n} cols`).toBe(j.cols);
    }
  });

  it('every level lands inside its band, and the stored fail rate matches a fresh 200-run measurement', () => {
    for (const j of LEVELS) {
      const lv = levelFromJson(j);
      const diff = evalLevel(lv, 200);
      expect(diff, `level ${j.n} stored ${j.diff} measured ${diff}`).toBeCloseTo(j.diff as number, 2);
      expect(diff, `level ${j.n} below band`).toBeGreaterThanOrEqual(j.band[0] - 1e-9);
      expect(diff, `level ${j.n} above band`).toBeLessThanOrEqual(j.band[1] + 1e-9);
    }
  });

  it('follows the rhythm: teach 1-12, ramp 13-19, walls on x0, relief and intros on x1, hard on x7-x9', () => {
    for (const j of LEVELS) {
      const b = beatFor(j.n);
      expect(j.band, `level ${j.n} band`).toEqual(b.band);
      const kind = (j.beat || '').split(':')[0];
      if (j.n <= 12) expect(['teach', 'wall', 'relief']).toContain(kind);
      if (j.n >= 13 && j.n <= 19) expect(kind).toBe('ramp');
      if (j.n % 10 === 0) {
        expect(kind).toBe('wall');
        expect(j.band[1]).toBeGreaterThanOrEqual(0.6);
      }
      if (j.n % 10 === 1 && j.n > 1) {
        expect(['relief', 'intro']).toContain(kind);
        expect(j.band[1]).toBeLessThanOrEqual(0.15);
      }
      if (j.n % 10 >= 7 && j.n > 19) expect(kind).toBe('hard');
      if (kind === 'showcase') expect([3, 6]).toContain(j.n % 10);
    }
    // A relief level follows every wall and is easier than it.
    for (let n = 10; n < AUTHORED_MAX; n += 10) {
      const wall = LEVELS.find((j) => j.n === n) as LevelJson,
        relief = LEVELS.find((j) => j.n === n + 1) as LevelJson;
      expect(relief.diff as number, `relief ${n + 1}`).toBeLessThan((wall.diff as number) - 0.2);
    }
  });

  it('introduces each mechanic on its unlock level with a gentle board and never earlier', () => {
    for (const [kind, at] of Object.entries(MECH_UNLOCK) as [MechKind, number][]) {
      for (const j of LEVELS) {
        const lv = levelFromJson(j);
        const has = lv.mechs.includes(kind);
        if (j.n < at) expect(has, `level ${j.n} uses ${kind} before its intro at ${at}`).toBe(false);
        if (j.n === at) {
          expect(has, `level ${j.n} must introduce ${kind}`).toBe(true);
          expect(j.beat).toBe('intro:' + kind);
          expect(lv.diff).toBeLessThanOrEqual(0.15);
          expect(lv.rows * lv.cols).toBeLessThanOrEqual(25);
        }
      }
    }
    for (const j of LEVELS.filter((j) => j.n <= 12)) expect(levelFromJson(j).mechs, `level ${j.n}`).toEqual([]);
  });

  it('gives each of the six later rules at least three authored showcase levels, all in band', () => {
    for (const kind of NEW_MECHS) {
      const withRule = LEVELS.filter((j) => levelFromJson(j).mechs.includes(kind));
      expect(withRule.length, kind).toBeGreaterThanOrEqual(3);
      expect(LEVELS.filter((j) => j.beat === 'showcase:' + kind).length, kind + ' showcases').toBe(2);
      for (const j of withRule) {
        expect(j.diff as number, `level ${j.n} (${kind})`).toBeGreaterThanOrEqual(j.band[0] - 1e-9);
        expect(j.diff as number, `level ${j.n} (${kind})`).toBeLessThanOrEqual(j.band[1] + 1e-9);
      }
    }
    // From 132 on the roster repeats in combination: every hard level there carries at least two rules.
    for (const j of LEVELS.filter((j) => j.n >= 132 && (j.beat || '').startsWith('hard')))
      expect(levelFromJson(j).mechs.length, `level ${j.n}`).toBeGreaterThanOrEqual(2);
  });

  it('grows the board and the palette with the level number', () => {
    const l1 = LEVELS.find((j) => j.n === 1) as LevelJson,
      l50 = LEVELS.find((j) => j.n === 50) as LevelJson,
      l100 = LEVELS.find((j) => j.n === 100) as LevelJson;
    expect(l1.rows * l1.cols).toBeLessThan(l50.rows * l50.cols);
    expect(l1.colors).toBeLessThan(l50.colors);
    expect(l100.rows * l100.cols).toBe(36);
    expect(l100.colors).toBe(7);
  });
});
