/* The difficulty curve: one row per level with the target fail rate and every tuning number the generator
   and solver read. curve.json is the bundled default; a validated remote copy can replace it at boot
   (see curve-remote.ts). Nothing in the engine hard-codes these numbers any more. */

import bundled from './curve.json';

export const CURVE_VERSION = 1;

export interface CurveLevel {
  n: number;
  /** Target fail rate for the noisy solver, 0..1. */
  fail: number;
  /** The band the measured fail rate must land in; CI reports and (for authored levels) enforces it. */
  band: [number, number];
  rows: number;
  cols: number;
  colors: number;
  seats: number;
  beltCap: number;
  visibleNext: number;
  /** Appetite range, inclusive. */
  app: [number, number];
  /** Fraction of the grid the generator tries to fill. */
  fill: number;
  /** Belt speed in laps per second. */
  speed: number;
}

export interface CurveSolver {
  /** Chance per decision that the solver picks a random diner instead of the best one. */
  noise: number;
  /** Runs used at level build time for the tier badge. */
  runs: number;
  /** Runs used by CI and the authoring tool. */
  ciRuns: number;
}

export interface Curve {
  v: number;
  solver: CurveSolver;
  levels: CurveLevel[];
}

export type CurveSource = 'bundled' | 'cache' | 'remote';

const RANGES: Record<string, [number, number]> = {
  rows: [2, 8],
  cols: [2, 8],
  colors: [2, 7],
  seats: [1, 6],
  beltCap: [3, 14],
  visibleNext: [0, 3],
  fill: [0.2, 1],
  speed: [0.02, 1],
  fail: [0, 1],
};
const INTEGERS = new Set(['rows', 'cols', 'colors', 'seats', 'beltCap', 'visibleNext']);

const isNum = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isPair = (v: unknown, lo: number, hi: number, int: boolean): v is [number, number] =>
  Array.isArray(v) &&
  v.length === 2 &&
  isNum(v[0], lo, hi) &&
  isNum(v[1], lo, hi) &&
  v[0] <= v[1] &&
  (!int || (Number.isInteger(v[0]) && Number.isInteger(v[1])));

/** Shape and range check for anything claiming to be a curve. Returns a clean copy or the first problem. */
export function validateCurve(x: unknown): { curve: Curve | null; error: string | null } {
  const bad = (error: string) => ({ curve: null, error });
  if (!x || typeof x !== 'object') return bad('not an object');
  const o = x as Record<string, unknown>;
  if (o.v !== CURVE_VERSION) return bad(`version ${String(o.v)} is not ${CURVE_VERSION}`);
  const s = o.solver as Record<string, unknown> | undefined;
  if (!s || typeof s !== 'object') return bad('missing solver');
  if (!isNum(s.noise, 0, 1) || !isNum(s.runs, 1, 1000) || !isNum(s.ciRuns, 1, 5000)) return bad('solver out of range');
  if (!Array.isArray(o.levels) || o.levels.length < 1) return bad('levels must be a non-empty array');
  const levels: CurveLevel[] = [];
  for (let i = 0; i < o.levels.length; i++) {
    const e = o.levels[i] as Record<string, unknown>;
    const at = `level ${i + 1}`;
    if (!e || typeof e !== 'object') return bad(`${at}: not an object`);
    if (e.n !== i + 1) return bad(`${at}: n is ${String(e.n)}; levels must be contiguous from 1`);
    for (const k of Object.keys(RANGES)) {
      const [lo, hi] = RANGES[k];
      if (!isNum(e[k], lo, hi) || (INTEGERS.has(k) && !Number.isInteger(e[k])))
        return bad(`${at}: ${k} must be ${INTEGERS.has(k) ? 'an integer' : 'a number'} in ${lo}..${hi}`);
    }
    if (!isPair(e.app, 1, 6, true)) return bad(`${at}: app must be [lo, hi] integers in 1..6`);
    if (!isPair(e.band, 0, 1, false)) return bad(`${at}: band must be [lo, hi] in 0..1`);
    const fail = e.fail as number;
    if (fail < e.band[0] || fail > e.band[1]) return bad(`${at}: fail target ${fail} is outside its band`);
    levels.push({
      n: i + 1,
      fail,
      band: [e.band[0], e.band[1]],
      rows: e.rows as number,
      cols: e.cols as number,
      colors: e.colors as number,
      seats: e.seats as number,
      beltCap: e.beltCap as number,
      visibleNext: e.visibleNext as number,
      app: [e.app[0], e.app[1]],
      fill: e.fill as number,
      speed: e.speed as number,
    });
  }
  return {
    curve: {
      v: CURVE_VERSION,
      solver: { noise: s.noise as number, runs: s.runs as number, ciRuns: s.ciRuns as number },
      levels,
    },
    error: null,
  };
}

const BUNDLED: Curve = (() => {
  const r = validateCurve(bundled);
  if (!r.curve) throw new Error('bundled curve.json is invalid: ' + r.error);
  return r.curve;
})();

let active: Curve = BUNDLED;
let source: CurveSource = 'bundled';
const listeners: (() => void)[] = [];

export function curve(): Curve {
  return active;
}

export function bundledCurve(): Curve {
  return BUNDLED;
}

export function curveSource(): CurveSource {
  return source;
}

/** The row for level n. Beyond the last row the curve holds at its final values. */
export function curveFor(n: number): CurveLevel {
  const L = active.levels;
  const i = Math.min(Math.max(1, Math.floor(n)), L.length) - 1;
  const e = L[i];
  return e.n === n ? e : { ...e, n };
}

/** Swap the active curve. Listeners (the level cache) are told so the next level built uses it. */
export function setCurve(c: Curve, src: CurveSource): void {
  active = c;
  source = src;
  for (const fn of listeners) fn();
}

export function resetCurve(): void {
  setCurve(BUNDLED, 'bundled');
}

export function onCurveChange(fn: () => void): void {
  listeners.push(fn);
}

export function sameCurve(a: Curve, b: Curve): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
