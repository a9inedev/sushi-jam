/* Level generation and the abstract solver.
   Everything here is pure and seeded: the same level number always yields the same board, kitchen order and
   measured fail rate. The order of calls into the RNG is part of the contract with existing player progress. */

import { AUTHORED } from '../data/authored';
import { curve, curveFor, onCurveChange } from '../data/curve';
import { MECH_UNLOCK } from '../data/mechanics';
import { rng } from './rng';
import type {
  DinerDef,
  GridCell,
  LevelDef,
  LevelLike,
  LevelParams,
  MechKind,
  PlateDef,
  PlateLike,
  Rng,
  SimResult,
  Tier,
} from './types';

export const DIR_DR = [-1, 0, 1, 0];
export const DIR_DC = [0, 1, 0, -1];

/* ---------- schedule and parameters ---------- */

/** The tier the curve plans for level n (used by the map before a level is built). */
export function schedTier(n: number): Tier {
  return tierFromDiff(curveFor(n).fail);
}

export function paramsFor(n: number): LevelParams {
  const c = curveFor(n);
  return {
    tier: schedTier(n),
    colors: c.colors,
    cols: c.cols,
    rows: c.rows,
    fill: c.fill,
    app: [c.app[0], c.app[1]],
    visibleNext: c.visibleNext,
    beltCap: c.beltCap,
    speed: c.speed,
    seats: c.seats,
  };
}

export function mechActive(kind: MechKind, n: number, allMech = false): boolean {
  return allMech || n >= MECH_UNLOCK[kind];
}

/* ---------- grid rules ---------- */

export function pathClear(
  occ: (unknown | null)[][],
  r: number,
  c: number,
  d: number,
  rows: number,
  cols: number
): boolean {
  const dr = DIR_DR[d],
    dc = DIR_DC[d];
  let rr = r + dr,
    cc = c + dc;
  while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
    if (occ[rr][cc]) return false;
    rr += dr;
    cc += dc;
  }
  return true;
}

export function pathLen(r: number, c: number, d: number, rows: number, cols: number): number {
  return d === 0 ? r : d === 1 ? cols - 1 - c : d === 2 ? rows - 1 - r : c;
}

/* Reverse generation: the last diner placed is the first that can leave, so a valid removal order always
   exists and no state reachable by removals can deadlock the grid. */
export function gridGenerate(rows: number, cols: number, target: number, R: Rng): GridCell[] {
  const occ: (GridCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const placed: GridCell[] = [];
  while (placed.length < target) {
    const cands: { r: number; c: number; dirs: number[]; depth: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (occ[r][c]) continue;
        const dirs = [0, 1, 2, 3].filter((d) => pathClear(occ, r, c, d, rows, cols));
        if (dirs.length) cands.push({ r, c, dirs, depth: Math.min(r, c, rows - 1 - r, cols - 1 - c) });
      }
    if (!cands.length) break;
    const maxD = Math.max(...cands.map((k) => k.depth));
    const pool = cands.filter((k) => k.depth === maxD || R() < 0.25);
    const k = pool[Math.floor(R() * pool.length)];
    let dir = k.dirs[0];
    if (R() < 0.7) {
      let bestLen = -1;
      for (const d of k.dirs) {
        const len = pathLen(k.r, k.c, d, rows, cols);
        if (len > bestLen || (len === bestLen && R() < 0.5)) {
          bestLen = len;
          dir = d;
        }
      }
    } else dir = k.dirs[Math.floor(R() * k.dirs.length)];
    const dn: GridCell = { r: k.r, c: k.c, dir };
    occ[k.r][k.c] = dn;
    placed.push(dn);
  }
  return placed;
}

/** A removal order for a set of cells, or null if the board deadlocks. */
export function peelOrder(cells: GridCell[], rows: number, cols: number): GridCell[] | null {
  const occ: (GridCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const c of cells) occ[c.r][c.c] = c;
  const rem = new Set(cells),
    order: GridCell[] = [];
  while (rem.size) {
    let found: GridCell | null = null;
    for (const d of rem)
      if (pathClear(occ, d.r, d.c, d.dir, rows, cols)) {
        found = d;
        break;
      }
    if (!found) return null;
    order.push(found);
    rem.delete(found);
    occ[found.r][found.c] = null;
  }
  return order;
}

export function parseAuthored(rowsStr: string[]): { cells: GridCell[]; rows: number; cols: number } | null {
  const cells: GridCell[] = [];
  const rows = rowsStr.length;
  let cols = 0;
  rowsStr.forEach((line, r) => {
    const toks = line.trim().split(/\s+/);
    cols = Math.max(cols, toks.length);
    toks.forEach((tk, c) => {
      if (tk === '.') return;
      const color = parseInt(tk[0], 10),
        dir = '^>v<'.indexOf(tk[1]);
      if (isNaN(color) || dir < 0) return;
      cells.push({ r, c, dir, color });
    });
  });
  return cells.length ? { cells, rows, cols } : null;
}

/* ---------- decoration: colours, appetites, mechanics, kitchen order ---------- */

export function plateUnits(p: PlateLike): number {
  return p.double ? 2 : 1;
}

export function matchDP(d: { color: number; vip?: boolean }, p: PlateLike, remaining: number): boolean {
  return d.color === p.color && !!d.vip === !!p.vip && remaining >= plateUnits(p);
}

/** Colours, appetites, mechanics and the kitchen order, produced by simulating the solution with K seats. */
export function decorate(
  n: number,
  P: LevelParams,
  R: Rng,
  order: GridCell[],
  allMech = false
): { diners: DinerDef[]; kitchen: PlateDef[] } {
  const K = P.seats,
    act = (k: MechKind) => mechActive(k, n, allMech);
  const diners: DinerDef[] = order.map((d, i) => {
    const color = d.color != null ? d.color : Math.floor(R() * P.colors);
    const need = P.app[0] + Math.floor(R() * (P.app[1] - P.app[0] + 1));
    return { r: d.r, c: d.c, dir: d.dir, id: i, color, need, vip: false, lockColor: -1, ice: 0 };
  });
  if (diners.length > 1 && diners.every((d) => d.color === diners[0].color))
    diners[1].color = (diners[0].color + 1) % P.colors;
  if (act('frozen')) for (const d of diners) if (d.id >= K && R() < 0.15) d.ice = 3;
  if (act('vip')) {
    for (const d of diners) if (R() < 0.2) d.vip = true;
    if (diners.every((d) => d.vip)) diners[0].vip = false;
  }
  const kitchen: PlateDef[] = [];
  const sim = diners.map((d) => ({ id: d.id, color: d.color, vip: d.vip, need: d.need }));
  const seated: typeof sim = [],
    finished: number[] = [],
    seatedAfter: Record<number, number[]> = {};
  let idx = 0;
  const seatNext = () => {
    if (idx < sim.length) {
      const s = sim[idx++];
      seatedAfter[s.id] = finished.slice();
      seated.push(s);
    }
  };
  while (seated.length < K && idx < sim.length) seatNext();
  let guard = 0;
  while (seated.length && guard++ < 5000) {
    const tot = seated.reduce((a, d) => a + d.need, 0);
    let pick = R() * tot,
      k = 0;
    while (k < seated.length - 1 && pick >= seated[k].need) {
      pick -= seated[k].need;
      k++;
    }
    const d = seated[k],
      dbl = act('double') && d.need >= 2 && R() < 0.3;
    kitchen.push({ color: d.color, vip: d.vip, double: dbl, wasabi: false, covered: false });
    d.need -= dbl ? 2 : 1;
    if (d.need <= 0) {
      seated.splice(k, 1);
      finished.push(d.id);
      seatNext();
    }
  }
  if (act('lock'))
    for (const d of diners) {
      const fin = seatedAfter[d.id] || [];
      if (d.id >= K && fin.length && R() < 0.15) d.lockColor = diners[fin[Math.floor(R() * fin.length)]].color;
    }
  if (act('wasabi'))
    kitchen.forEach((p, i) => {
      if (i >= 6 && !p.double && R() < 0.08) p.wasabi = true;
    });
  if (act('covered'))
    kitchen.forEach((p, i) => {
      if (i >= 4 && !p.wasabi && R() < 0.1) p.covered = true;
    });
  return { diners, kitchen };
}

/* ---------- abstract solver ---------- */

export interface SimOptions {
  /** Play the authored solution order instead of the noisy kitchen reader. Ice is cracked instantly. */
  intended?: boolean;
}

/** A noisy "reads the kitchen window" player. Returns 'win' or 'fail'. */
export function simulate(lv: LevelLike, R: Rng, noise: number, opts: SimOptions = {}): SimResult {
  const K = lv.P.seats,
    C = lv.P.beltCap,
    vis = lv.P.visibleNext;
  type SimDiner = DinerDef & { state: 'grid' | 'seated' | 'done' };
  const diners: SimDiner[] = lv.diners.map((d) => ({ ...d, state: 'grid' }));
  const occ: (SimDiner | null)[][] = Array.from({ length: lv.rows }, () => Array(lv.cols).fill(null));
  for (const d of diners) occ[d.r][d.c] = d;
  const seats: SimDiner[] = [],
    belt: { p: PlateDef; age: number }[] = [],
    q = lv.kitchen.slice(),
    doneColors = new Set<number>();
  let steps = 0,
    doneCount = 0;
  const canGo = (d: SimDiner) =>
    d.state === 'grid' &&
    pathClear(occ, d.r, d.c, d.dir, lv.rows, lv.cols) &&
    (d.lockColor < 0 || doneColors.has(d.lockColor));
  while (steps++ < 4000) {
    if (q.length && belt.length < C) belt.push({ p: q.shift() as PlateDef, age: 0 });
    for (const pl of belt.slice()) {
      pl.age++;
      if (pl.p.covered && pl.age < 2) continue;
      const d = seats.find((s) => matchDP(s, pl.p, s.need));
      if (d) {
        d.need -= plateUnits(pl.p);
        belt.splice(belt.indexOf(pl), 1);
        if (d.need <= 0) {
          seats.splice(seats.indexOf(d), 1);
          d.state = 'done';
          doneColors.add(d.color);
          doneCount++;
        }
      } else if (pl.p.wasabi && pl.age > 3) return 'fail';
    }
    if (doneCount === diners.length) return 'win';
    const free = seats.length < K;
    if (
      !free &&
      !belt.some((pl) => seats.some((s) => matchDP(s, pl.p, s.need))) &&
      (q.length === 0 || belt.length >= C)
    )
      return 'fail';
    if (free) {
      const movable = diners.filter((d) => canGo(d));
      if (movable.length) {
        let pick: SimDiner | null = null;
        if (opts.intended) {
          pick = movable[0];
          pick.ice = 0;
        } else if (R() >= noise) {
          const wanted = [...belt.filter((pl) => !pl.p.covered).map((pl) => pl.p), ...q.slice(0, vis)];
          for (const p of wanted) {
            pick = movable.find((d) => matchDP(d, p, d.need)) || null;
            if (pick) break;
          }
        }
        if (!pick) pick = movable[Math.floor(R() * movable.length)];
        if (pick.ice > 0) pick.ice--;
        else {
          pick.state = 'seated';
          occ[pick.r][pick.c] = null;
          seats.push(pick);
        }
      }
    }
  }
  return 'fail';
}

export function evalLevel(lv: LevelLike, runs: number): number {
  const R = rng((lv.seed ^ 0x9e3779b9) >>> 0);
  let fails = 0;
  for (let i = 0; i < runs; i++) if (simulate(lv, R, curve().solver.noise) === 'fail') fails++;
  return fails / runs;
}

export function tierFromDiff(d: number): Tier {
  return d < 0.12 ? 'Easy' : d < 0.3 ? 'Medium' : d < 0.55 ? 'Hard' : 'Super Hard';
}

/* ---------- level assembly ---------- */

type Candidate = LevelLike & { diff?: number; authored?: boolean; tuned?: boolean; count?: number };

/** The procedurally generated level for n (plus the three legacy string boards). Deterministic by seed. */
export function makeGenerated(n: number, allMech = false): LevelDef {
  const P = paramsFor(n),
    target = curveFor(n).fail,
    runs = curve().solver.runs,
    cands: Candidate[] = [];
  const auth = AUTHORED[n] ? parseAuthored(AUTHORED[n]) : null;
  if (auth) {
    const order = peelOrder(auth.cells, auth.rows, auth.cols);
    if (order) {
      /* Hand-made boards keep their layout; the solver tunes kitchen visibility and belt room until the
         measured fail rate lands in a playable band. If it never does, the level falls back to a generated board. */
      const seed = n * 7919 + 991,
        R = rng(seed >>> 0);
      const P2: LevelParams = { ...P, rows: auth.rows, cols: auth.cols },
        dec = decorate(n, P2, R, order, allMech);
      const lv: Candidate = { P: P2, rows: auth.rows, cols: auth.cols, ...dec, authored: true, seed };
      let diff = evalLevel(lv, runs),
        guard = 0;
      while (diff > 0.75 && guard++ < 6) {
        if (P2.visibleNext < 3) P2.visibleNext++;
        else if (P2.beltCap < 10) P2.beltCap++;
        else break;
        diff = evalLevel(lv, runs);
      }
      while (diff < 0.35 && guard++ < 12) {
        if (P2.visibleNext > 1) P2.visibleNext--;
        else if (P2.beltCap > 6) P2.beltCap--;
        else break;
        diff = evalLevel(lv, runs);
      }
      lv.diff = diff;
      lv.tuned = true;
      if (diff <= 0.8) cands.push(lv);
    }
  }
  if (!cands.length) {
    let best: Candidate | null = null;
    for (let a = 0; a < 12; a++) {
      const seed = (n * 7919 + a * 104729 + 17) >>> 0,
        R = rng(seed),
        tgt = Math.max(4, Math.round(P.rows * P.cols * P.fill));
      const placed = gridGenerate(P.rows, P.cols, tgt, R);
      if (!placed.length) continue;
      const cand: Candidate = {
        P,
        rows: P.rows,
        cols: P.cols,
        ...decorate(n, P, R, placed.slice().reverse(), allMech),
        seed,
        count: placed.length,
      };
      if (placed.length >= tgt * 0.85) cands.push(cand);
      else if (!best || (cand.count as number) > (best.count as number)) best = cand;
    }
    if (!cands.length && best) cands.push(best);
  }
  for (const c of cands) if (c.diff == null) c.diff = evalLevel(c, runs);
  cands.sort((a, b) => Math.abs((a.diff as number) - target) - Math.abs((b.diff as number) - target));
  const c0 = cands[0];
  const lv: LevelDef = {
    n,
    P: c0.P,
    rows: c0.rows,
    cols: c0.cols,
    diners: c0.diners,
    kitchen: c0.kitchen,
    seed: c0.seed,
    diff: c0.diff as number,
    tierLabel: tierFromDiff(c0.diff as number),
    mechs: [],
    authored: c0.authored,
    tuned: c0.tuned,
    count: c0.count,
  };
  if (lv.kitchen.some((p) => p.wasabi)) lv.mechs.push('wasabi');
  if (lv.kitchen.some((p) => p.covered)) lv.mechs.push('covered');
  if (lv.diners.some((d) => d.vip)) lv.mechs.push('vip');
  if (lv.diners.some((d) => d.lockColor >= 0)) lv.mechs.push('lock');
  if (lv.diners.some((d) => d.ice > 0)) lv.mechs.push('frozen');
  if (lv.kitchen.some((p) => p.double)) lv.mechs.push('double');
  return lv;
}

/* ---------- authored source registry ---------- */

type AuthoredSource = (n: number) => LevelDef | null;
let authoredSource: AuthoredSource = () => null;

/** data/levels.ts registers the JSON levels here so the engine stays free of bundler-specific imports. */
export function registerAuthored(fn: AuthoredSource): void {
  authoredSource = fn;
}

export function isAuthored(n: number): boolean {
  return authoredSource(n) !== null || !!AUTHORED[n];
}

/** The level to play: the authored JSON level when one exists for n, otherwise the generated one. */
export function makeLevel(n: number, allMech = false): LevelDef {
  return authoredSource(n) || makeGenerated(n, allMech);
}

const levelCache = new Map<string, LevelDef>();

export function getLevel(n: number, allMech = false): LevelDef {
  const key = n + (allMech ? 'a' : '');
  let lv = levelCache.get(key);
  if (!lv) {
    lv = makeLevel(n, allMech);
    levelCache.set(key, lv);
  }
  return lv;
}

export function clearLevelCache(): void {
  levelCache.clear();
}

// A new curve (remote override, editor, tests) means every level must be rebuilt.
onCurveChange(clearLevelCache);
