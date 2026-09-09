/* The three side modes at the data level: the daily puzzle is the same board for everyone on a day and a
   different one the next, its streak is counted on the calendar, zen strips every timer, rush builds a board
   that refills and cooks to order, and the save carries the modes' own progress. */
import { describe, expect, it } from 'vitest';
import {
  clearDirs,
  dailyLevelNumber,
  dailySeed,
  dateKey,
  makeDaily,
  makeRush,
  makeZen,
  puzzleStreak,
  rushDiner,
  rushPlateColor,
  shiftKey,
} from '../src/engine/modes-core';
import { rulesOf, simulate } from '../src/engine/levels';
import { rng } from '../src/engine/rng';
import { defaultSave, migrateV6toV7, normalize, SAVE_VERSION } from '../src/meta/save-schema';

describe('daily puzzle', () => {
  it('keys days locally and shifts across month ends', () => {
    expect(dateKey(new Date(2026, 8, 8))).toBe('2026-09-08');
    expect(shiftKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('is the same board for the same day and a different one the next day', () => {
    const a = makeDaily('2026-09-08'),
      b = makeDaily('2026-09-08'),
      c = makeDaily('2026-09-09');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
    expect(a.mode).toBe('daily');
    expect(a.modeKey).toBe('2026-09-08');
    expect(dailySeed('2026-09-08')).not.toBe(dailySeed('2026-09-09'));
  });

  it('picks a level row in the range where the rules live and wins its intended order', () => {
    for (let i = 0; i < 12; i++) {
      const key = shiftKey('2026-09-01', i);
      const n = dailyLevelNumber(key);
      expect(n).toBeGreaterThanOrEqual(41);
      expect(n).toBeLessThanOrEqual(140);
      const lv = makeDaily(key);
      expect(lv.n).toBe(n);
      expect(simulate(lv, rng(1), 0, { intended: true }), key).toBe('win');
    }
  });

  it('counts the streak on the calendar, allowing today to still be open', () => {
    const today = '2026-09-08';
    expect(puzzleStreak([], today)).toBe(0);
    expect(puzzleStreak(['2026-09-08'], today)).toBe(1);
    expect(puzzleStreak(['2026-09-07', '2026-09-08'], today)).toBe(2);
    expect(puzzleStreak(['2026-09-06', '2026-09-07'], today)).toBe(2);
    expect(puzzleStreak(['2026-09-05', '2026-09-07', '2026-09-08'], today)).toBe(2);
    expect(puzzleStreak(['2026-09-01'], today)).toBe(0);
  });
});

describe('zen', () => {
  it('removes every timer and keeps the board winnable', () => {
    for (const k of [5, 30, 95, 135]) {
      const lv = makeZen(k);
      expect(lv.mode).toBe('zen');
      expect(lv.kitchen.some((p) => p.wasabi)).toBe(false);
      const r = rulesOf(lv.P);
      expect(r.rush).toBe(0);
      expect(r.reverse).toBeNull();
      expect(lv.mechs).not.toContain('wasabi');
      expect(lv.mechs).not.toContain('rush');
      expect(lv.mechs).not.toContain('reverse');
      expect(simulate(lv, rng(1), 0, { intended: true }), 'zen ' + k).toBe('win');
    }
  });
});

describe('rush', () => {
  it('builds a refillable board with an empty kitchen', () => {
    const lv = makeRush(7);
    expect(lv.mode).toBe('rush');
    expect(lv.rows * lv.cols).toBe(25);
    expect(lv.diners.length).toBeGreaterThanOrEqual(16);
    expect(lv.kitchen).toEqual([]);
    expect(JSON.stringify(makeRush(7))).toBe(JSON.stringify(lv));
  });

  it('spawns diners facing a clear exit when one exists', () => {
    const occ: (unknown | null)[][] = Array.from({ length: 3 }, () => Array(3).fill(null));
    occ[1][0] = {};
    occ[0][1] = {};
    occ[2][1] = {};
    expect(clearDirs(occ, 1, 1, 3, 3)).toEqual([1]);
    const d = rushDiner(occ, 1, 1, 3, 3, 5, 42, rng(3));
    expect(d.dir).toBe(1);
    expect(d.id).toBe(42);
    expect(d.need).toBeGreaterThanOrEqual(1);
    expect(d.need).toBeLessThanOrEqual(3);
  });

  it('cooks for the seated guests in proportion to their appetite', () => {
    const R = rng(9);
    const seated = [
      { color: 2, remaining: 3 },
      { color: 4, remaining: 1 },
      { color: 0, remaining: 0 },
    ];
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 400; i++) counts[rushPlateColor(seated, R) as number]++;
    expect(counts[0]).toBe(0);
    expect(counts[2]).toBeGreaterThan(counts[4] * 2);
    expect(rushPlateColor([], R)).toBeNull();
  });
});

describe('save v7', () => {
  it('adds the modes progress with defaults and keeps it through normalize', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(7);
    const v6 = { ...(defaultSave() as unknown as Record<string, unknown>) };
    delete v6.puzzleDays;
    delete v6.rushBest;
    const v7 = migrateV6toV7(v6);
    expect(v7.puzzleDays).toEqual([]);
    expect(v7.rushBest).toBe(0);
    expect(v7.zenLevel).toBe(1);
    const s = normalize({ ...v7, puzzleDays: ['2026-09-08', 5, 'x'], rushBest: 12.7, zenLevel: 0 });
    expect(s.puzzleDays).toEqual(['2026-09-08']);
    expect(s.rushBest).toBe(12);
    expect(s.zenLevel).toBe(1);
  });

  it('stat records keep their mode and default older ones to level', () => {
    const s = normalize({
      ...defaultSave(),
      stats: [
        { n: 3, result: 'win', ts: 1 },
        { n: 0, result: 'win', ts: 2, mode: 'rush', score: 17 },
      ],
    });
    expect(s.stats[0].mode).toBe('level');
    expect(s.stats[1].mode).toBe('rush');
    expect(s.stats[1].score).toBe(17);
  });
});
