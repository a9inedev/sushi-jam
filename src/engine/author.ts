/* The beat sheet for levels 1 to 100 and the search that turns a beat into a concrete board. Pure.

   Rhythm: 1-12 teach, 13-19 ramp, every x0 a wall, every x1 a relief (and from 21 the new rule's intro),
   x2-x6 medium, x7-x9 hard. The search generates boards by reverse placement, decorates them to the beat,
   measures the fail rate with 200 solver runs and keeps the seed that lands closest to the band centre. */

import { curveFor } from '../data/curve';
import { MECH_UNLOCK } from '../data/mechanics';
import {
  finishedBeforeSeat,
  formatCells,
  formatKitchen,
  kitchenFromSolution,
  levelLikeFromJson,
  validateLevel,
  type AuthoredCell,
  type LevelJson,
} from './authored';
import { gridGenerate, paramsFor, peelOrder } from './levels';
import { rng } from './rng';
import type { DinerDef, LevelLike, LevelParams, MechKind, PlateDef, Rng } from './types';

export type BeatKind = 'teach' | 'ramp' | 'medium' | 'hard' | 'wall' | 'relief' | 'intro';

export interface Beat {
  n: number;
  kind: BeatKind;
  rows: number;
  cols: number;
  colors: number;
  fill: number;
  app: [number, number];
  visibleNext: number;
  beltCap: number;
  seats: number;
  band: [number, number];
  /** Mechanics allowed on this level and how often they appear. */
  mechs: Partial<Record<MechKind, number>>;
  /** The rule this level introduces; exactly one instance is guaranteed. */
  intro?: MechKind;
}

const INTRO_AT: Record<number, MechKind> = {};
for (const [k, n] of Object.entries(MECH_UNLOCK)) INTRO_AT[n] = k as MechKind;

/** Unlocked mechanics for level n with a gentle default density. */
function unlocked(n: number): Partial<Record<MechKind, number>> {
  const m: Partial<Record<MechKind, number>> = {};
  if (n > MECH_UNLOCK.wasabi) m.wasabi = 0.06;
  if (n > MECH_UNLOCK.covered) m.covered = 0.08;
  if (n > MECH_UNLOCK.vip) m.vip = 0.15;
  if (n > MECH_UNLOCK.lock) m.lock = 0.12;
  if (n > MECH_UNLOCK.frozen) m.frozen = 0.12;
  if (n > MECH_UNLOCK.double) m.double = 0.25;
  return m;
}

/** Beat kind, mechanic densities and the intro rule; every number comes from the curve. */
function beatShape(n: number): { kind: BeatKind; mechs: Partial<Record<MechKind, number>>; intro?: MechKind } {
  if (n <= 9) return { kind: 'teach', mechs: {} };
  const pos = n % 10,
    mechs = unlocked(n);
  if (pos === 0) return { kind: 'wall', mechs };
  if (pos === 1) {
    const intro = INTRO_AT[n];
    return intro ? { kind: 'intro', mechs: { ...mechs, [intro]: 0 }, intro } : { kind: 'relief', mechs };
  }
  if (n <= 12) return { kind: 'teach', mechs: {} };
  if (n <= 19) return { kind: 'ramp', mechs: {} };
  if (pos >= 7) return { kind: 'hard', mechs };
  return { kind: 'medium', mechs };
}

export function beatFor(n: number): Beat {
  const c = curveFor(n);
  return {
    n,
    ...beatShape(n),
    rows: c.rows,
    cols: c.cols,
    colors: c.colors,
    fill: c.fill,
    app: [c.app[0], c.app[1]],
    visibleNext: c.visibleNext,
    beltCap: c.beltCap,
    seats: c.seats,
    band: [c.band[0], c.band[1]],
  };
}

interface Built {
  lv: LevelLike;
  cells: AuthoredCell[];
}

/** Decorate a placed board to the beat: colours, appetites, then mechanics with the beat's densities. */
function decorateToBeat(beat: Beat, P: LevelParams, R: Rng, order: AuthoredCell[], forceIntro: boolean): Built | null {
  const K = P.seats;
  const diners: DinerDef[] = order.map((c, i) => ({
    r: c.r,
    c: c.c,
    dir: c.dir,
    id: i,
    color: Math.floor(R() * P.colors),
    need: beat.app[0] + Math.floor(R() * (beat.app[1] - beat.app[0] + 1)),
    vip: false,
    lockColor: -1,
    ice: 0,
  }));
  if (diners.length > 1 && diners.every((d) => d.color === diners[0].color))
    diners[1].color = (diners[0].color + 1) % P.colors;
  const rate = (k: MechKind) => beat.mechs[k] ?? 0;
  const want = (k: MechKind) => forceIntro && beat.intro === k;
  if (rate('frozen') > 0 || want('frozen')) {
    for (const d of diners) if (d.id >= K && R() < rate('frozen')) d.ice = 3;
    if (want('frozen') && !diners.some((d) => d.ice > 0)) {
      const c = diners.filter((d) => d.id >= K);
      if (!c.length) return null;
      c[Math.floor(R() * c.length)].ice = 3;
    }
  }
  if (rate('vip') > 0 || want('vip')) {
    for (const d of diners) if (R() < rate('vip')) d.vip = true;
    if (want('vip') && !diners.some((d) => d.vip)) diners[Math.floor(R() * diners.length)].vip = true;
    if (diners.every((d) => d.vip)) diners[0].vip = false;
  }
  const doubleP = want('double') ? Math.max(0.3, rate('double')) : rate('double');
  let kitchen: PlateDef[] = kitchenFromSolution(diners, K, R, doubleP);
  if (want('double') && !kitchen.some((p) => p.double)) {
    // Re-roll the service order until a stack appears; every diner needs at least two.
    for (let i = 0; i < 20 && !kitchen.some((p) => p.double); i++) kitchen = kitchenFromSolution(diners, K, R, 0.6);
    if (!kitchen.some((p) => p.double)) return null;
  }
  if (rate('lock') > 0 || want('lock')) {
    const before = finishedBeforeSeat(diners, kitchen, K);
    for (const d of diners) {
      const fin = before[d.id] || [];
      if (d.id >= K && fin.length && R() < rate('lock')) d.lockColor = diners[fin[Math.floor(R() * fin.length)]].color;
    }
    if (want('lock') && !diners.some((d) => d.lockColor >= 0)) {
      const cands = diners.filter((d) => d.id >= K && (before[d.id] || []).length);
      if (!cands.length) return null;
      const d = cands[Math.floor(R() * cands.length)];
      const fin = before[d.id];
      d.lockColor = diners[fin[Math.floor(R() * fin.length)]].color;
    }
  }
  if (rate('wasabi') > 0 || want('wasabi')) {
    kitchen.forEach((p, i) => {
      if (i >= 6 && !p.double && R() < rate('wasabi')) p.wasabi = true;
    });
    if (want('wasabi') && !kitchen.some((p) => p.wasabi)) {
      const idx = kitchen.findIndex((p, i) => i >= 5 && !p.double);
      if (idx < 0) return null;
      kitchen[idx].wasabi = true;
    }
  }
  if (rate('covered') > 0 || want('covered')) {
    kitchen.forEach((p, i) => {
      if (i >= 4 && !p.wasabi && R() < rate('covered')) p.covered = true;
    });
    if (want('covered') && !kitchen.some((p) => p.covered)) {
      const idx = kitchen.findIndex((p, i) => i >= 3 && !p.wasabi);
      if (idx < 0) return null;
      kitchen[idx].covered = true;
    }
  }
  const cells: AuthoredCell[] = diners.map((d) => ({
    r: d.r,
    c: d.c,
    dir: d.dir,
    color: d.color,
    need: d.need,
    vip: d.vip,
    lockColor: d.lockColor,
    ice: d.ice,
  }));
  return { lv: { P, rows: beat.rows, cols: beat.cols, diners, kitchen, seed: 0 }, cells };
}

export interface AuthorResult {
  json: LevelJson;
  tries: number;
  adjusted: string[];
}

/** Search seeds (and, failing that, nudge fill and visibility) until the level lands in its band. */
export function authorLevel(n: number, opts: { seeds?: number; runs?: number } = {}): AuthorResult {
  const seeds = opts.seeds ?? 60,
    runs = opts.runs ?? 200;
  const beat = beatFor(n),
    cv = curveFor(n);
  const adjusted: string[] = [];
  let fill = beat.fill,
    visibleNext = beat.visibleNext,
    beltCap = beat.beltCap;
  let tries = 0;
  for (let round = 0; round < 8; round++) {
    let best: { json: LevelJson; dist: number } | null = null;
    let easyCount = 0,
      hardCount = 0;
    for (let a = 0; a < seeds; a++) {
      tries++;
      const seed = (n * 7919 + a * 104729 + 900007 + round * 31) >>> 0;
      const R = rng(seed);
      const P: LevelParams = {
        ...paramsFor(n),
        rows: beat.rows,
        cols: beat.cols,
        colors: beat.colors,
        seats: beat.seats,
        beltCap,
        visibleNext,
        fill,
        app: beat.app,
      };
      const target = Math.max(4, Math.round(beat.rows * beat.cols * fill));
      const placed = gridGenerate(beat.rows, beat.cols, target, R);
      if (placed.length < target * 0.85) continue;
      // Solution order = the peel of the row-major cell list, exactly as levelLikeFromJson will rebuild it.
      const canon = placed.slice().sort((a, b) => a.r - b.r || a.c - b.c);
      const order = peelOrder(canon, beat.rows, beat.cols) as AuthoredCell[] | null;
      if (!order) continue;
      const built = decorateToBeat(beat, P, R, order, !!beat.intro);
      if (!built) continue;
      built.lv.seed = seed;
      const json: LevelJson = {
        n,
        beat: beat.intro ? `intro:${beat.intro}` : beat.kind,
        band: beat.band,
        rows: beat.rows,
        cols: beat.cols,
        colors: beat.colors,
        // Only what differs from the curve is pinned; the rest follows curve.json at load time.
        seats: beat.seats === cv.seats ? undefined : beat.seats,
        beltCap: beltCap === cv.beltCap ? undefined : beltCap,
        visibleNext: visibleNext === cv.visibleNext ? undefined : visibleNext,
        cells: formatCells(built.cells, beat.rows, beat.cols),
        kitchen: formatKitchen(built.lv.kitchen),
        seed,
      };
      // Measure the level as it will be loaded, not the one in memory.
      const v = validateLevel(levelLikeFromJson(json), runs);
      if (!v.ok) continue;
      const [lo, hi] = beat.band;
      if (v.diff < lo) easyCount++;
      else if (v.diff > hi) hardCount++;
      else {
        const centre = (lo + hi) / 2;
        const dist = Math.abs(v.diff - centre);
        if (!best || dist < best.dist) {
          best = { dist, json: { ...json, diff: +v.diff.toFixed(3) } };
        }
      }
    }
    if (best) return { json: best.json, tries, adjusted };
    // Nothing in band: move the knobs toward the band and try another round of seeds.
    if (hardCount >= easyCount) {
      if (visibleNext < 3) visibleNext++;
      else if (beltCap < 9) beltCap++;
      else fill = Math.max(0.5, fill - 0.05);
      adjusted.push(`easier: fill ${fill.toFixed(2)} visible ${visibleNext} belt ${beltCap}`);
    } else {
      if (visibleNext > 1) visibleNext--;
      else if (fill < 0.94) fill = Math.min(0.94, fill + 0.05);
      else if (beltCap > 6) beltCap--;
      adjusted.push(`harder: fill ${fill.toFixed(2)} visible ${visibleNext} belt ${beltCap}`);
    }
  }
  throw new Error(
    `level ${n}: no board landed in band ${beat.band.join('-')} after ${tries} tries (${adjusted.join('; ')})`
  );
}
