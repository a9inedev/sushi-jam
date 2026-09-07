/* Level generation and the abstract solver.
   Everything here is pure and seeded: the same level number always yields the same board, kitchen order and
   measured fail rate. The order of calls into the RNG is part of the contract with existing player progress. */

import { AUTHORED } from '../data/authored';
import { curve, curveFor, onCurveChange } from '../data/curve';
import { MECH_UNLOCK } from '../data/mechanics';
import { rng } from './rng';
import type {
  LevelRules,
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

export const LEGACY_MECHS: MechKind[] = ['wasabi', 'covered', 'vip', 'lock', 'frozen', 'double'];
export const NEW_MECHS: MechKind[] = ['chain', 'rush', 'special', 'picky', 'reserved', 'reverse'];
export const ALL_MECHS: MechKind[] = [...LEGACY_MECHS, ...NEW_MECHS];
/** false: the level's own schedule; true: the six original rules everywhere (the parity fixture was dumped
    that way); 'all': every rule everywhere (the dev toggle). */
export type MechSet = boolean | 'all';

export function mechActive(kind: MechKind, n: number, allMech: MechSet = false): boolean {
  if (allMech === 'all') return true;
  if (allMech && LEGACY_MECHS.includes(kind)) return true;
  return n >= MECH_UNLOCK[kind];
}

/* ---------- level-wide rules ---------- */

export const NO_RULES: LevelRules = { chain: 0, rush: 0, reserved: [], reverse: null };

export function rulesOf(P: { rules?: LevelRules }): LevelRules {
  return P.rules || NO_RULES;
}

export function hasRules(r: LevelRules): boolean {
  return r.chain > 0 || r.rush > 0 || r.reserved.some((c) => c >= 0) || !!r.reverse;
}

/** Clean copy of a rules object from JSON; NO_RULES when nothing is set. */
export function normaliseRules(r?: Partial<LevelRules> | null): LevelRules {
  if (!r || typeof r !== 'object') return NO_RULES;
  const rev = r.reverse;
  const out: LevelRules = {
    chain: typeof r.chain === 'number' && r.chain > 0 ? 1 : 0,
    rush: typeof r.rush === 'number' && r.rush > 0 ? Math.floor(r.rush) : 0,
    reserved: Array.isArray(r.reserved)
      ? r.reserved.map((c) => (typeof c === 'number' && c >= 0 ? Math.floor(c) : -1))
      : [],
    reverse: Array.isArray(rev) && rev.length === 2 && rev[0] > 0 && rev[1] > 0 ? [rev[0], rev[1]] : null,
  };
  return hasRules(out) ? out : NO_RULES;
}

/** Rules in JSON form: only what is set, undefined when nothing is. */
export function rulesJson(r: LevelRules): Partial<LevelRules> | undefined {
  if (!hasRules(r)) return undefined;
  const o: Partial<LevelRules> = {};
  if (r.chain > 0) o.chain = r.chain;
  if (r.rush > 0) o.rush = r.rush;
  if (r.reserved.some((c) => c >= 0)) o.reserved = r.reserved.slice();
  if (r.reverse) o.reverse = [r.reverse[0], r.reverse[1]];
  return o;
}

/** Sim time per solver step, and the rush hour constants the runtime and the solver share. */
export const SIM_STEP = 0.7;
export const RUSH_SECONDS = 15;
export const RUSH_SPEED = 1.5;
export const RUSH_INTERVAL = 0.47;
export const RUSH_STEPS = Math.round(RUSH_SECONDS / SIM_STEP);
/** Default reversal cadence: seconds between reversals, seconds reversed. */
export const REVERSE_DEFAULT: [number, number] = [14, 4];

/** Ticket guests are numbered in reading order so their named plates stay valid however a board is peeled. */
export function assignPicky(diners: DinerDef[]): void {
  const picky = diners.filter((d) => d.seq && d.seq.length).sort((a, b) => a.r - b.r || a.c - b.c);
  for (const d of diners) if (!d.seq || !d.seq.length) delete d.picky;
  picky.forEach((d, i) => (d.picky = i));
}

/** A picky guest's sequence: their own colour first, then random colours. */
export function randomSeq(d: DinerDef, colors: number, R: Rng): number[] {
  const seq = [d.color];
  for (let i = 1; i < d.need; i++) seq.push(Math.floor(R() * colors));
  return seq;
}

/** Reserve the last seat for the most common colour on the board. */
export function reserveSeat(diners: DinerDef[], K: number): number[] {
  const count: number[] = [];
  for (const d of diners) count[d.color] = (count[d.color] || 0) + 1;
  let best = 0;
  for (let c = 1; c < count.length; c++) if ((count[c] || 0) > (count[best] || 0)) best = c;
  const r = Array(K).fill(-1);
  r[K - 1] = best;
  return r;
}

/** Which rules a level actually uses (drives the intro cards). */
export function mechsOf(lv: LevelLike): MechKind[] {
  const m: MechKind[] = [],
    rules = rulesOf(lv.P);
  if (lv.kitchen.some((p) => p.wasabi)) m.push('wasabi');
  if (lv.kitchen.some((p) => p.covered)) m.push('covered');
  if (lv.diners.some((d) => d.vip)) m.push('vip');
  if (lv.diners.some((d) => d.lockColor >= 0)) m.push('lock');
  if (lv.diners.some((d) => d.ice > 0)) m.push('frozen');
  if (lv.kitchen.some((p) => p.double)) m.push('double');
  if (rules.chain > 0) m.push('chain');
  if (rules.rush > 0) m.push('rush');
  if (lv.kitchen.some((p) => p.special)) m.push('special');
  if (lv.diners.some((d) => d.seq && d.seq.length)) m.push('picky');
  if (rules.reserved.some((c) => c >= 0)) m.push('reserved');
  if (rules.reverse) m.push('reverse');
  return m;
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

/** Can diner d take plate p with `remaining` appetite left? Specials go to any ordinary diner; named plates
    only to their ticket guest, and only in the printed order. */
export function matchDP(
  d: { color: number; vip?: boolean; seq?: number[]; picky?: number },
  p: PlateLike,
  remaining: number
): boolean {
  if (remaining < plateUnits(p)) return false;
  const seq = d.seq && d.seq.length ? d.seq : null;
  if (p.special) return !d.vip && !seq;
  if (p.owner != null && p.owner >= 0) return !!seq && d.picky === p.owner && seq[seq.length - remaining] === p.color;
  return !seq && d.color === p.color && !!d.vip === !!p.vip;
}

export interface KitchenOpts {
  doubleP?: number;
  specialP?: number;
  rules?: LevelRules;
  /** Credit plates the way the belt hands them out (see kitchenSim); defaults from the level's content. */
  exact?: boolean;
}

export interface KitchenResult {
  kitchen: PlateDef[];
  /** Ids of the diners that had finished when each diner sat down (for placing locks). */
  seatedAfter: Record<number, number[]>;
  /** Which diner each plate was planned for, by kitchen index (diagnostics). */
  credits: number[];
  /** Units the credited diner had already received before each plate (diagnostics and wasabi placement). */
  servedBefore: number[];
}

/** Simulate the intended solution with K seats to produce the service order. Seating follows the diner order
    strictly (the head of the queue waits when no seat it may use is free), the front seat of a chained pair
    eats while the back one waits, and reserved seats take only their colour. Plates are picked by weighted
    random over the eating diners' remaining appetite, so the belt never carries a plate nobody is waiting for.
    Ticket guests get their printed colours as named plates; specials are extra plates sprinkled in. */
export function kitchenSim(diners: DinerDef[], K: number, R: Rng, opts: KitchenOpts = {}): KitchenResult {
  const doubleP = opts.doubleP ?? 0,
    specialP = opts.specialP ?? 0,
    rules = opts.rules ?? NO_RULES;
  const chainBack = rules.chain > 0 && K >= 2 ? 1 : -1;
  // Levels with any of the later rules are planned "exactly": every plate is credited to the diner the belt
  // would actually hand it to (the highest seat first, as plates reach the right-hand stools first), so the
  // finishing order the plan assumes is the one play produces. Legacy levels keep the original crediting.
  const exact = opts.exact ?? (hasRules(rules) || specialP > 0 || diners.some((d) => d.seq && d.seq.length));
  type Sim = {
    id: number;
    color: number;
    vip: boolean;
    need: number;
    seq?: number[];
    picky: number;
    served: number;
  };
  const sim: Sim[] = diners.map((d) => ({
    id: d.id,
    color: d.color,
    vip: d.vip,
    need: d.need,
    seq: d.seq && d.seq.length ? d.seq : undefined,
    picky: d.picky ?? -1,
    served: 0,
  }));
  const kitchen: PlateDef[] = [];
  const credits: number[] = [];
  const servedBefore: number[] = [];
  const seatedAfter: Record<number, number[]> = {};
  const slots: (Sim | null)[] = Array(K).fill(null);
  const eating: Sim[] = [];
  const finished: number[] = [];
  let idx = 0;
  const allowed = (d: Sim, i: number) => {
    const c = rules.reserved[i] ?? -1;
    return c < 0 || c === d.color;
  };
  const seatNext = (): boolean => {
    if (idx >= sim.length) return false;
    const d = sim[idx];
    let i = slots.findIndex((s, k) => !s && k !== chainBack && allowed(d, k));
    if (i < 0 && chainBack >= 0 && !slots[chainBack] && slots[0]) i = chainBack;
    if (i < 0) return false;
    idx++;
    slots[i] = d;
    seatedAfter[d.id] = finished.slice();
    if (i !== chainBack) eating.push(d);
    return true;
  };
  const finish = (d: Sim) => {
    eating.splice(eating.indexOf(d), 1);
    finished.push(d.id);
    const si = slots.indexOf(d);
    slots[si] = null;
    if (si === 0 && chainBack >= 0 && slots[chainBack]) {
      const w = slots[chainBack] as Sim;
      slots[0] = w;
      slots[chainBack] = null;
      eating.push(w);
    }
    while (seatNext());
  };
  const bySeat = () => eating.slice().sort((a, b) => slots.indexOf(b) - slots.indexOf(a));
  const serve = (d: Sim, units: number) => {
    d.need -= units;
    d.served += units;
    if (d.need <= 0) finish(d);
  };
  while (seatNext());
  let guard = 0;
  while (eating.length && guard++ < 5000) {
    const tot = eating.reduce((a, d) => a + d.need, 0);
    let pick = R() * tot,
      k = 0;
    while (k < eating.length - 1 && pick >= eating[k].need) {
      pick -= eating[k].need;
      k++;
    }
    const d = eating[k],
      dbl = doubleP > 0 && d.need >= 2 && !d.seq && R() < doubleP;
    const plate: PlateDef = {
      color: d.seq ? d.seq[Math.min(d.served, d.seq.length - 1)] : d.color,
      vip: d.vip,
      double: dbl,
      wasabi: false,
      covered: false,
    };
    if (d.seq) plate.owner = d.picky;
    kitchen.push(plate);
    const taker = exact ? bySeat().find((s) => matchDP(s, plate, s.need)) || d : d;
    credits.push(taker.id);
    servedBefore.push(taker.served);
    serve(taker, dbl ? 2 : 1);
    if (specialP > 0 && kitchen.length >= 4 && (kitchen.length === 4 || R() < specialP)) {
      // A special is planned for the first ordinary diner eating (the first one is always at plate five);
      // its colour records who it was meant for.
      const sp: PlateDef = { color: 0, vip: false, double: false, wasabi: false, covered: false, special: true };
      const who = bySeat().find((s) => matchDP(s, sp, s.need));
      if (who) {
        sp.color = who.color;
        kitchen.push(sp);
        credits.push(who.id);
        servedBefore.push(who.served);
        serve(who, 1);
      }
    }
  }
  return { kitchen, seatedAfter, credits, servedBefore };
}

/** Colours, appetites, rules and the kitchen order for a generated board. Rules unlock by level number
    (MECH_UNLOCK) and appear at a gentle density; every draw is guarded so levels below an unlock consume the
    same random numbers they always did. */
export function decorate(
  n: number,
  P: LevelParams,
  R: Rng,
  order: GridCell[],
  allMech: MechSet = false
): { diners: DinerDef[]; kitchen: PlateDef[]; rules: LevelRules } {
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
  if (act('picky')) {
    for (const d of diners) if (d.id >= K && !d.vip && d.need >= 2 && R() < 0.1) d.seq = randomSeq(d, P.colors, R);
    assignPicky(diners);
  }
  const rules: LevelRules = { chain: 0, rush: 0, reserved: [], reverse: null };
  if (act('chain') && K >= 3 && R() < 0.4) rules.chain = 1;
  if (act('reserved') && K >= 3 && R() < 0.4) rules.reserved = reserveSeat(diners, K);
  const appetite = diners.reduce((a, d) => a + d.need, 0);
  if (act('rush') && appetite >= 10 && R() < 0.4) rules.rush = 4 + Math.floor(R() * 5);
  if (act('reverse') && R() < 0.3) rules.reverse = [REVERSE_DEFAULT[0], REVERSE_DEFAULT[1]];
  const exact = NEW_MECHS.some((k) => act(k));
  const { kitchen, seatedAfter, servedBefore } = kitchenSim(diners, K, R, {
    doubleP: act('double') ? 0.3 : 0,
    specialP: act('special') ? 0.06 : 0,
    rules,
    exact,
  });
  // On levels with timing rules a wasabi plate only goes to a diner who has already been served once, so
  // it never arrives in the same beat as the diner sits down.
  const settled = (i: number) => !exact || servedBefore[i] >= 1;
  if (act('lock'))
    for (const d of diners) {
      const fin = seatedAfter[d.id] || [];
      if (d.id >= K && fin.length && R() < 0.15) d.lockColor = diners[fin[Math.floor(R() * fin.length)]].color;
    }
  if (act('wasabi'))
    kitchen.forEach((p, i) => {
      if (i >= 6 && !p.double && !p.special && settled(i) && R() < 0.08) p.wasabi = true;
    });
  if (act('covered'))
    kitchen.forEach((p, i) => {
      if (i >= 4 && !p.wasabi && !p.special && R() < 0.1) p.covered = true;
    });
  return { diners, kitchen, rules: hasRules(rules) ? rules : NO_RULES };
}

/* ---------- abstract solver ---------- */

export interface SimTrace {
  step: number;
  emitted: number;
  belt: number;
  queue: number;
  reversed: boolean;
  rush: boolean;
  /** Eating diners and free seats after this step. */
  eating: number;
  free: number;
  /** Set on the last event when the run fails. */
  reason?: 'jam' | 'wasabi' | 'steps';
  detail?: string;
}

export interface SimOptions {
  /** Play the authored solution order instead of the noisy kitchen reader. Ice is cracked instantly. */
  intended?: boolean;
  /** Called once per step with the belt state; tests use it to watch rush hour and reversals. */
  trace?: (e: SimTrace) => void;
  /** Called when a plate is taken: its original kitchen index (-1 if swapped), the diner, the step. */
  onTake?: (plateIndex: number, dinerId: number, step: number) => void;
}

/** A noisy "reads the kitchen window" player. Returns 'win' or 'fail'. One step is roughly one plate leaving
    the kitchen (SIM_STEP seconds). Seats are slots so reserved and chained seats behave as in the game; rush
    hour sends plates 1.5x as fast; a reversal returns the newest belt plate to the kitchen each step; and the
    chef takes back plates nobody can eat any more (which only happens after a special is taken). */
export function simulate(lv: LevelLike, R: Rng, noise: number, opts: SimOptions = {}): SimResult {
  const K = lv.P.seats,
    C = lv.P.beltCap,
    vis = lv.P.visibleNext,
    rules = rulesOf(lv.P);
  const chainBack = rules.chain > 0 && K >= 2 ? 1 : -1;
  const reservedAt = (i: number) => rules.reserved[i] ?? -1;
  const revEvery = rules.reverse ? Math.max(1, Math.round(rules.reverse[0] / SIM_STEP)) : 0;
  const revDur = rules.reverse ? Math.max(1, Math.round(rules.reverse[1] / SIM_STEP)) : 0;
  const hasSpecial = lv.kitchen.some((p) => p.special);
  const exact = hasRules(rules) || hasSpecial || lv.diners.some((d) => d.seq && d.seq.length);
  type SimDiner = DinerDef & { state: 'grid' | 'seated' | 'done'; slot: number };
  const diners: SimDiner[] = lv.diners.map((d) => ({ ...d, state: 'grid', slot: -1 }));
  const occ: (SimDiner | null)[][] = Array.from({ length: lv.rows }, () => Array(lv.cols).fill(null));
  for (const d of diners) occ[d.r][d.c] = d;
  const eating: SimDiner[] = [],
    slots: (SimDiner | null)[] = Array(K).fill(null),
    belt: { p: PlateDef; age: number }[] = [],
    q = lv.kitchen.slice(),
    doneColors = new Set<number>();
  let steps = 0,
    doneCount = 0,
    emitted = 0,
    rushLeft = 0;
  const canGo = (d: SimDiner) =>
    d.state === 'grid' &&
    pathClear(occ, d.r, d.c, d.dir, lv.rows, lv.cols) &&
    (d.lockColor < 0 || doneColors.has(d.lockColor));
  const slotFor = (d: SimDiner): number => {
    let i = slots.findIndex((s, k) => !s && k !== chainBack && (reservedAt(k) < 0 || reservedAt(k) === d.color));
    if (i < 0 && chainBack >= 0 && !slots[chainBack] && slots[0]) i = chainBack;
    return i;
  };
  const seat = (pick: SimDiner) => {
    pick.state = 'seated';
    occ[pick.r][pick.c] = null;
    const i = slotFor(pick);
    slots[i] = pick;
    pick.slot = i;
    if (i !== chainBack) eating.push(pick);
  };
  /** Intended play: the head of the solution order sits whenever a seat it may use is free, as many as fit,
      the moment a seat frees. That is exactly how kitchenSim planned the service order. */
  const seatHeads = () => {
    for (;;) {
      const head = diners.find((d) => canGo(d));
      if (!head || slotFor(head) < 0) break;
      head.ice = 0;
      seat(head);
    }
  };
  const finish = (d: SimDiner) => {
    eating.splice(eating.indexOf(d), 1);
    d.state = 'done';
    slots[d.slot] = null;
    if (d.slot === 0 && chainBack >= 0 && slots[chainBack]) {
      const w = slots[chainBack] as SimDiner;
      slots[0] = w;
      w.slot = 0;
      slots[chainBack] = null;
      eating.push(w);
    }
    doneColors.add(d.color);
    doneCount++;
    if (opts.intended) seatHeads();
  };
  const keyOf = (p: PlateLike) => (p.owner != null && p.owner >= 0 ? 'o' + p.owner : p.color + (p.vip ? 'v' : ''));
  const snapshot = (reversed: boolean, rushLeft: number): SimTrace => ({
    step: steps,
    emitted,
    belt: belt.length,
    queue: q.length,
    reversed,
    rush: rushLeft > 0,
    eating: eating.length,
    free: slots.filter((s) => !s).length,
  });
  const dropSurplus = () => {
    // Per ordinary key (colour, non-VIP): plates in hand vs appetite left. A special taken by someone other
    // than the diner it was planned for leaves one key with a plate too many and another one short; the chef
    // swaps the leftover for the missing colour (last queued plate first), and only bins it when nobody is
    // short. Ticket guests and VIPs are never involved: they cannot take specials.
    const need = new Map<string, number>();
    let openNeed = 0;
    for (const d of diners) {
      if (d.state === 'done') continue;
      const picky = !!(d.seq && d.seq.length);
      const k = picky ? 'o' + d.picky : d.color + (d.vip ? 'v' : '');
      need.set(k, (need.get(k) || 0) + d.need);
      if (!d.vip && !picky) openNeed += d.need;
    }
    const have = new Map<string, number>();
    for (const pl of belt) if (!pl.p.special) have.set(keyOf(pl.p), (have.get(keyOf(pl.p)) || 0) + plateUnits(pl.p));
    for (const p of q) if (!p.special) have.set(keyOf(p), (have.get(keyOf(p)) || 0) + plateUnits(p));
    const deficit: number[] = [];
    for (const [k, n] of need)
      if (!k.startsWith('o') && !k.endsWith('v') && n > (have.get(k) || 0))
        for (let i = have.get(k) || 0; i < n; i++) deficit.push(+k);
    for (const [k, h] of have) {
      let extra = h - (need.get(k) || 0);
      while (extra > 0) {
        let qi = -1;
        for (let i = q.length - 1; i >= 0; i--)
          if (!q[i].special && keyOf(q[i]) === k) {
            qi = i;
            break;
          }
        const bi = qi < 0 ? belt.findIndex((pl) => !pl.p.special && keyOf(pl.p) === k) : -1;
        if (qi < 0 && bi < 0) break;
        const p = qi >= 0 ? q[qi] : belt[bi].p;
        const single = plateUnits(p) > extra;
        const to = deficit.shift();
        if (to !== undefined) {
          const swapped: PlateDef = { ...p, color: to, vip: false, double: single ? false : p.double };
          if (qi >= 0) q[qi] = swapped;
          else belt[bi].p = swapped;
          extra -= single ? 1 : plateUnits(p);
          continue;
        }
        if (single) {
          if (qi >= 0) q[qi] = { ...p, double: false };
          else belt[bi].p = { ...p, double: false };
          extra -= 1;
        } else {
          if (qi >= 0) q.splice(qi, 1);
          else belt.splice(bi, 1);
          extra -= plateUnits(p);
        }
      }
    }
    if (openNeed === 0) {
      for (let i = belt.length - 1; i >= 0; i--) if (belt[i].p.special) belt.splice(i, 1);
      for (let i = q.length - 1; i >= 0; i--) if (q[i].special) q.splice(i, 1);
    }
  };
  while (steps++ < 4000) {
    const reversed = revEvery > 0 && (steps - 1) % (revEvery + revDur) >= revEvery;
    if (reversed) {
      const last = belt.pop();
      if (last) q.unshift(last.p);
    } else {
      let emits = 1;
      if (rushLeft > 0) {
        emits = rushLeft % 2 === 0 ? 2 : 1;
        rushLeft--;
      }
      for (let e = 0; e < emits && q.length && belt.length < C; e++) {
        belt.push({ p: q.shift() as PlateDef, age: 0 });
        emitted++;
        if (rules.rush > 0 && emitted === rules.rush) rushLeft = RUSH_STEPS;
      }
    }
    for (const pl of belt.slice()) {
      pl.age++;
      if (pl.p.covered && pl.age < 2) continue;
      const takers = exact ? eating.slice().sort((a, b) => (reversed ? a.slot - b.slot : b.slot - a.slot)) : eating;
      const d = takers.find((s) => matchDP(s, pl.p, s.need));
      if (d) {
        if (opts.onTake) opts.onTake(lv.kitchen.indexOf(pl.p), d.id, steps);
        d.need -= plateUnits(pl.p);
        belt.splice(belt.indexOf(pl), 1);
        if (d.need <= 0) finish(d);
      } else if (pl.p.wasabi && pl.age > 3) {
        if (opts.trace)
          opts.trace({
            ...snapshot(reversed, rushLeft),
            reason: 'wasabi',
            detail: `plate ${pl.p.color} for nobody seated`,
          });
        return 'fail';
      }
    }
    if (hasSpecial) dropSurplus();
    if (opts.trace) opts.trace(snapshot(reversed, rushLeft));
    if (doneCount === diners.length) return 'win';
    const anyFree = slots.some((s) => !s);
    const movable = anyFree ? diners.filter((d) => canGo(d)) : [];
    const seatable = movable.filter((d) => slotFor(d) >= 0);
    if (
      !seatable.length &&
      !reversed &&
      !belt.some((pl) => eating.some((s) => matchDP(s, pl.p, s.need))) &&
      (q.length === 0 || belt.length >= C)
    ) {
      if (opts.trace)
        opts.trace({
          ...snapshot(reversed, rushLeft),
          reason: 'jam',
          detail: `belt [${belt.map((pl) => keyOf(pl.p)).join(' ')}] eating [${eating.map((d) => d.id + ':' + d.color + 'x' + d.need).join(' ')}] slots [${slots.map((s) => (s ? s.id : '-')).join(' ')}] grid ${diners.filter((d) => d.state === 'grid').length} movable ${movable.length}`,
        });
      return 'fail';
    }
    if (opts.intended) seatHeads();
    else if (seatable.length) {
      let pick: SimDiner | null = null;
      if (R() >= noise) {
        const wanted = [...belt.filter((pl) => !pl.p.covered).map((pl) => pl.p), ...q.slice(0, vis)];
        for (const p of wanted) {
          pick = seatable.find((d) => matchDP(d, p, d.need)) || null;
          if (pick) break;
        }
      }
      if (!pick) pick = seatable[Math.floor(R() * seatable.length)];
      if (pick.ice > 0) pick.ice--;
      else seat(pick);
    }
  }
  if (opts.trace) opts.trace({ ...snapshot(false, 0), reason: 'steps' });
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
export function makeGenerated(n: number, allMech: MechSet = false): LevelDef {
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
      if (hasRules(dec.rules)) P2.rules = dec.rules;
      const lv: Candidate = {
        P: P2,
        rows: auth.rows,
        cols: auth.cols,
        diners: dec.diners,
        kitchen: dec.kitchen,
        authored: true,
        seed,
      };
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
      const dec = decorate(n, P, R, placed.slice().reverse(), allMech);
      const cand: Candidate = {
        P: hasRules(dec.rules) ? { ...P, rules: dec.rules } : P,
        rows: P.rows,
        cols: P.cols,
        diners: dec.diners,
        kitchen: dec.kitchen,
        seed,
        count: placed.length,
      };
      if (placed.length >= tgt * 0.85) cands.push(cand);
      else if (!best || (cand.count as number) > (best.count as number)) best = cand;
    }
    if (!cands.length && best) cands.push(best);
  }
  for (const c of cands) if (c.diff == null) c.diff = evalLevel(c, runs);
  // Fairness for generated levels with the later rules: only candidates whose intended order wins without a
  // booster may ship (the authoring tool enforces the same through validateLevel). Legacy candidates are
  // not re-checked, so levels 1 to 80 are untouched.
  const isRuled = (c: Candidate) =>
    hasRules(rulesOf(c.P)) || c.kitchen.some((p) => p.special) || c.diners.some((d) => d.seq);
  const fair = (c: Candidate) => !isRuled(c) || simulate(c, rng(1), 0, { intended: true }) === 'win';
  const fairOnes = cands.filter(fair);
  const pool = fairOnes.length ? fairOnes : cands;
  pool.sort((a, b) => Math.abs((a.diff as number) - target) - Math.abs((b.diff as number) - target));
  const c0 = pool[0];
  // Generated levels that carry the later rules get the relief the authoring tool applies: open the kitchen
  // window, then the belt, until the measured rate is inside the band, so the roster in combination stays
  // playable past the authored range. Levels without those rules are left exactly as they always were.
  const band = curveFor(n).band;
  const ruled = isRuled(c0);
  if (ruled && (c0.diff as number) > band[1]) {
    const P0 = c0.P,
      diff0 = c0.diff as number;
    const P3 = { ...c0.P };
    c0.P = P3;
    let guard = 0;
    while ((c0.diff as number) > band[1] && guard++ < 6) {
      if (P3.visibleNext < 3) P3.visibleNext++;
      else if (P3.beltCap < 10) P3.beltCap++;
      else break;
      c0.diff = evalLevel(c0, runs);
    }
    c0.tuned = true;
    if (!fair(c0)) {
      // Relief must never cost the guarantee; fall back to the untouched parameters.
      c0.P = P0;
      c0.diff = diff0;
    }
  }
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
  lv.mechs = mechsOf(lv);
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
export function makeLevel(n: number, allMech: MechSet = false): LevelDef {
  return authoredSource(n) || makeGenerated(n, allMech);
}

const levelCache = new Map<string, LevelDef>();

export function getLevel(n: number, allMech: MechSet = false): LevelDef {
  const key = n + (allMech === 'all' ? 'A' : allMech ? 'a' : '');
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
