/* Pure builders and rules for the three side modes. Nothing here touches the runtime store, so the tests can
   pin the behaviour and the daily puzzle is provably the same board for everyone on a given day.

   Daily: one generated board per calendar day, seeded by the date, on a level row between 41 and 140.
   Rush:  a 5x5 board that refills forever and a kitchen that cooks for whoever is seated; 90 seconds.
   Zen:   the generated ladder with every timer stripped (no wasabi, rush hour or reversal). */

import { curveFor } from '../data/curve';
import { hashStr } from './rng';
import { gridGenerate, hasRules, makeGenerated, normaliseRules, NO_RULES, paramsFor, rulesOf } from './levels';
import { rng } from './rng';
import type { DinerDef, GameMode, LevelDef, LevelParams, Rng } from './types';

export const RUSH_SECONDS_TOTAL = 90;
export const RUSH_SPAWN_DELAY = 0.8;
export const RUSH_KITCHEN_MIN = 5;
/** Zen pays this share of the level reward. */
export const ZEN_COIN_SHARE = 0.4;

/** Local calendar day as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function dailySeed(key: string): number {
  return hashStr('daily:' + key) >>> 0;
}

/** The curve row the day's board is built on: a different difficulty each day, never below the point
    where the rules have started. */
export function dailyLevelNumber(key: string): number {
  return 41 + (dailySeed(key) % 100);
}

export function makeDaily(key: string): LevelDef {
  const n = dailyLevelNumber(key);
  const lv = makeGenerated(n, false, dailySeed(key));
  return { ...lv, mode: 'daily', modeKey: key };
}

/** Consecutive won days ending today, or ending yesterday when today is still open. */
export function puzzleStreak(days: string[], today: string): number {
  const set = new Set(days);
  let key = set.has(today) ? today : shiftKey(today, -1);
  let n = 0;
  while (set.has(key)) {
    n++;
    key = shiftKey(key, -1);
  }
  return n;
}

/** Zen level k: the generated board for k with every timer removed. Rules that only shape the board stay. */
export function makeZen(k: number): LevelDef {
  const lv = makeGenerated(Math.max(1, k));
  const rules = rulesOf(lv.P);
  const calm = normaliseRules({ ...rules, rush: 0, reverse: null });
  const P: LevelParams = { ...lv.P };
  delete P.rules;
  if (hasRules(calm)) P.rules = calm;
  const kitchen = lv.kitchen.map((p) => (p.wasabi ? { ...p, wasabi: false } : p));
  const mechs = lv.mechs.filter((m) => m !== 'wasabi' && m !== 'rush' && m !== 'reverse');
  return { ...lv, P, kitchen, mechs, mode: 'zen' };
}

/** Directions from (r, c) with a clear path off the board, given an occupancy grid. */
export function clearDirs(occ: (unknown | null)[][], r: number, c: number, rows: number, cols: number): number[] {
  const DR = [-1, 0, 1, 0],
    DC = [0, 1, 0, -1];
  const out: number[] = [];
  for (let d = 0; d < 4; d++) {
    let rr = r + DR[d],
      cc = c + DC[d],
      clear = true;
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      if (occ[rr][cc]) {
        clear = false;
        break;
      }
      rr += DR[d];
      cc += DC[d];
    }
    if (clear) out.push(d);
  }
  return out;
}

/** A fresh rush diner for a cell: a clear direction when one exists, a random colour, appetite 1 to 3. */
export function rushDiner(
  occ: (unknown | null)[][],
  r: number,
  c: number,
  rows: number,
  cols: number,
  colors: number,
  id: number,
  R: Rng
): DinerDef {
  const dirs = clearDirs(occ, r, c, rows, cols);
  const dir = dirs.length ? dirs[Math.floor(R() * dirs.length)] : Math.floor(R() * 4);
  return {
    r,
    c,
    dir,
    id,
    color: Math.floor(R() * colors),
    need: 1 + Math.floor(R() * 3),
    vip: false,
    lockColor: -1,
    ice: 0,
  };
}

/** The next rush plate: weighted by the remaining appetite of the seated guests, or null when nobody sits. */
export function rushPlateColor(seated: { color: number; remaining: number }[], R: Rng): number | null {
  const live = seated.filter((s) => s.remaining > 0);
  const tot = live.reduce((a, s) => a + s.remaining, 0);
  if (!tot) return null;
  let pick = R() * tot;
  for (const s of live) {
    if (pick < s.remaining) return s.color;
    pick -= s.remaining;
  }
  return live[live.length - 1].color;
}

/** The opening rush board: a 5x5 grid, five colours, an empty kitchen (it cooks to order once play starts). */
export function makeRush(seed = Date.now()): LevelDef {
  const rows = 5,
    cols = 5,
    colors = 5;
  const base = paramsFor(1);
  const P: LevelParams = {
    ...base,
    tier: 'Medium',
    rows,
    cols,
    colors,
    fill: 0.8,
    app: [1, 3],
    visibleNext: 3,
    beltCap: 8,
    seats: 4,
    speed: curveFor(40).speed,
  };
  const R = rng(seed >>> 0);
  const placed = gridGenerate(rows, cols, Math.round(rows * cols * P.fill), R);
  const occ: (unknown | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const diners: DinerDef[] = placed
    .slice()
    .reverse()
    .map((cell, i) => ({
      r: cell.r,
      c: cell.c,
      dir: cell.dir,
      id: i,
      color: Math.floor(R() * colors),
      need: 1 + Math.floor(R() * 3),
      vip: false,
      lockColor: -1,
      ice: 0,
    }));
  for (const d of diners) occ[d.r][d.c] = d;
  return {
    n: 0,
    P,
    rows,
    cols,
    diners,
    kitchen: [],
    seed: seed >>> 0,
    diff: 0,
    tierLabel: 'Medium',
    mechs: [],
    mode: 'rush',
  };
}

export function modeOf(lv: { mode?: GameMode }): GameMode {
  return lv.mode || 'level';
}

export { NO_RULES };
