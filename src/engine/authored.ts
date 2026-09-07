/* Authored levels: the JSON format stored in /levels, its compact cell and kitchen grammar, the kitchen
   simulation for hand-made boards, and validation. Pure: used by the game, the editor, the tool and CI.

   Cell token:   <colour><dir><need>[V][L<colour>][I<ice>]   e.g. "2v3", "0>2V", "4<4L1", "3^3I3", "." = empty
   Kitchen token: <colour>[V][D][W][C]                          V vip, D double, W wasabi, C covered */

import { evalLevel, matchDP, pathClear, peelOrder, plateUnits, simulate, tierFromDiff, paramsFor } from './levels';
import { rng } from './rng';
import type { DinerDef, GridCell, LevelDef, LevelLike, LevelParams, MechKind, PlateDef, Rng } from './types';

export interface LevelJson {
  n: number;
  /** Design beat this level plays, e.g. "teach", "wall", "relief", "intro:wasabi". */
  beat?: string;
  /** Target fail-rate band [low, high] the measured rate must land in. */
  band: [number, number];
  rows: number;
  cols: number;
  colors: number;
  seats?: number;
  beltCap?: number;
  visibleNext?: number;
  speed?: number;
  cells: string[];
  kitchen: string;
  seed?: number;
  /** Fail rate measured with 200 solver runs at authoring time. */
  diff?: number;
  name?: string;
}

export interface AuthoredCell extends GridCell {
  color: number;
  need: number;
  vip: boolean;
  lockColor: number;
  ice: number;
}

const DIRS = '^>v<';

export function parseCellToken(tk: string): Omit<AuthoredCell, 'r' | 'c'> | null {
  const m = /^(\d)([\^>v<])(\d)((?:V|L\d|I\d)*)$/.exec(tk.trim());
  if (!m) return null;
  let vip = false,
    lockColor = -1,
    ice = 0;
  for (const f of m[4].matchAll(/V|L(\d)|I(\d)/g)) {
    if (f[0] === 'V') vip = true;
    else if (f[1] !== undefined) lockColor = +f[1];
    else if (f[2] !== undefined) ice = +f[2];
  }
  return { color: +m[1], dir: DIRS.indexOf(m[2]), need: +m[3], vip, lockColor, ice };
}

export function formatCell(c: Omit<AuthoredCell, 'r' | 'c'>): string {
  return (
    `${c.color}${DIRS[c.dir]}${c.need}` +
    (c.vip ? 'V' : '') +
    (c.lockColor >= 0 ? 'L' + c.lockColor : '') +
    (c.ice > 0 ? 'I' + c.ice : '')
  );
}

export function parseCells(rows: string[]): { cells: AuthoredCell[]; rows: number; cols: number } {
  const cells: AuthoredCell[] = [];
  let cols = 0;
  rows.forEach((line, r) => {
    const toks = line.trim().split(/\s+/).filter(Boolean);
    cols = Math.max(cols, toks.length);
    toks.forEach((tk, c) => {
      if (tk === '.') return;
      const p = parseCellToken(tk);
      if (p) cells.push({ r, c, ...p });
    });
  });
  return { cells, rows: rows.length, cols };
}

export function formatCells(cells: AuthoredCell[], rows: number, cols: number): string[] {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const toks: string[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = cells.find((x) => x.r === r && x.c === c);
      toks.push(cell ? formatCell(cell) : '.');
    }
    out.push(toks.join(' '));
  }
  return out;
}

export function parseKitchen(s: string): PlateDef[] {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tk) => {
      const m = /^(\d)([VDWC]*)$/.exec(tk);
      if (!m) return null;
      const f = m[2];
      return {
        color: +m[1],
        vip: f.includes('V'),
        double: f.includes('D'),
        wasabi: f.includes('W'),
        covered: f.includes('C'),
      };
    })
    .filter((p): p is PlateDef => !!p);
}

export function formatKitchen(k: PlateDef[]): string {
  return k
    .map(
      (p) => `${p.color}` + (p.vip ? 'V' : '') + (p.double ? 'D' : '') + (p.wasabi ? 'W' : '') + (p.covered ? 'C' : '')
    )
    .join(' ');
}

/** Diners in solution (peel) order with ids assigned, or null if the board cannot be peeled. */
export function dinersFromCells(cells: AuthoredCell[], rows: number, cols: number): DinerDef[] | null {
  const order = peelOrder(cells, rows, cols) as AuthoredCell[] | null;
  if (!order) return null;
  return order.map((c, i) => ({
    r: c.r,
    c: c.c,
    dir: c.dir,
    id: i,
    color: c.color,
    need: c.need,
    vip: c.vip,
    lockColor: c.lockColor,
    ice: c.ice,
  }));
}

/** Weighted-random service order of the diners' appetites with K seats: the plates the kitchen must send. */
export function kitchenFromSolution(diners: DinerDef[], K: number, R: Rng, doubleP = 0): PlateDef[] {
  const kitchen: PlateDef[] = [];
  const sim = diners.map((d) => ({ id: d.id, color: d.color, vip: d.vip, need: d.need }));
  const seated: typeof sim = [];
  let idx = 0;
  const seatNext = () => {
    if (idx < sim.length) seated.push(sim[idx++]);
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
      dbl = doubleP > 0 && d.need >= 2 && R() < doubleP;
    kitchen.push({ color: d.color, vip: d.vip, double: dbl, wasabi: false, covered: false });
    d.need -= dbl ? 2 : 1;
    if (d.need <= 0) {
      seated.splice(k, 1);
      seatNext();
    }
  }
  return kitchen;
}

/** Which diners have finished before each diner is seated, in the K-seat solution; used to place valid locks. */
export function finishedBeforeSeat(diners: DinerDef[], kitchen: PlateDef[], K: number): Record<number, number[]> {
  const before: Record<number, number[]> = {};
  const need = diners.map((d) => d.need);
  const seated: number[] = [];
  const finished: number[] = [];
  let idx = 0;
  const seatNext = () => {
    if (idx < diners.length) {
      before[idx] = finished.slice();
      seated.push(idx++);
    }
  };
  while (seated.length < K && idx < diners.length) seatNext();
  for (const p of kitchen) {
    const id = seated.find(
      (i) => diners[i].color === p.color && !!diners[i].vip === !!p.vip && need[i] >= plateUnits(p)
    );
    if (id === undefined) continue;
    need[id] -= plateUnits(p);
    if (need[id] <= 0) {
      seated.splice(seated.indexOf(id), 1);
      finished.push(id);
      seatNext();
    }
  }
  return before;
}

export function paramsFromJson(j: LevelJson): LevelParams {
  const base = paramsFor(j.n);
  return {
    ...base,
    rows: j.rows,
    cols: j.cols,
    colors: j.colors,
    seats: j.seats ?? base.seats,
    beltCap: j.beltCap ?? base.beltCap,
    visibleNext: j.visibleNext ?? base.visibleNext,
    speed: j.speed ?? base.speed,
  };
}

export function mechsOf(lv: LevelLike): MechKind[] {
  const m: MechKind[] = [];
  if (lv.kitchen.some((p) => p.wasabi)) m.push('wasabi');
  if (lv.kitchen.some((p) => p.covered)) m.push('covered');
  if (lv.diners.some((d) => d.vip)) m.push('vip');
  if (lv.diners.some((d) => d.lockColor >= 0)) m.push('lock');
  if (lv.diners.some((d) => d.ice > 0)) m.push('frozen');
  if (lv.kitchen.some((p) => p.double)) m.push('double');
  return m;
}

/** The playable board from its JSON, without measuring it. Throws when the board is not peelable. The diner
    order (and so the kitchen) comes from peeling the row-major cell list; the authoring tool measures levels
    through this same function so the stored fail rate is what the game and CI see. */
export function levelLikeFromJson(j: LevelJson): LevelLike {
  const parsed = parseCells(j.cells);
  const diners = dinersFromCells(parsed.cells, j.rows, j.cols);
  if (!diners) throw new Error(`level ${j.n}: board is not peelable`);
  const P = paramsFromJson(j);
  const seed = (j.seed ?? j.n * 7919 + 991) >>> 0;
  const kitchen = j.kitchen ? parseKitchen(j.kitchen) : kitchenFromSolution(diners, P.seats, rng(seed));
  return { P, rows: j.rows, cols: j.cols, diners, kitchen, seed };
}

/** Build the runtime level from its JSON, using the stored fail rate or measuring a quick one. */
export function levelFromJson(j: LevelJson): LevelDef {
  const lv = levelLikeFromJson(j);
  const diff = typeof j.diff === 'number' ? j.diff : evalLevel(lv, 40);
  return { ...lv, n: j.n, diff, tierLabel: tierFromDiff(diff), mechs: mechsOf(lv), authored: true };
}

export interface Validation {
  ok: boolean;
  problems: string[];
  diff: number;
  tier: string;
}

/** Everything that must hold for a level to ship: peelable, plates equal appetite, VIP plates match VIP
    appetite, locks reference colours that finish first, the intended order wins, and the measured rate. */
export function validateLevel(lv: LevelLike, runs = 200): Validation {
  const problems: string[] = [];
  const occ: (unknown | null)[][] = Array.from({ length: lv.rows }, () => Array(lv.cols).fill(null));
  for (const d of lv.diners) {
    if (d.r < 0 || d.r >= lv.rows || d.c < 0 || d.c >= lv.cols) problems.push(`diner ${d.id} outside the grid`);
    else if (occ[d.r][d.c]) problems.push(`two diners at ${d.r},${d.c}`);
    else occ[d.r][d.c] = d;
  }
  if (!problems.length) {
    for (const d of lv.diners) {
      if (!pathClear(occ, d.r, d.c, d.dir, lv.rows, lv.cols)) {
        problems.push(`diner ${d.id} cannot leave in solution order`);
        break;
      }
      occ[d.r][d.c] = null;
    }
  }
  const units = lv.kitchen.reduce((a, p) => a + plateUnits(p), 0);
  const appetite = lv.diners.reduce((a, d) => a + d.need, 0);
  if (units !== appetite) problems.push(`plates ${units} vs appetite ${appetite}`);
  const vipUnits = lv.kitchen.filter((p) => p.vip).reduce((a, p) => a + plateUnits(p), 0);
  const vipNeed = lv.diners.filter((d) => d.vip).reduce((a, d) => a + d.need, 0);
  if (vipUnits !== vipNeed) problems.push(`VIP plates ${vipUnits} vs VIP appetite ${vipNeed}`);
  for (let c = 0; c < lv.P.colors; c++) {
    const pu = lv.kitchen.filter((p) => p.color === c).reduce((a, p) => a + plateUnits(p), 0);
    const dn = lv.diners.filter((d) => d.color === c).reduce((a, d) => a + d.need, 0);
    if (pu !== dn) problems.push(`colour ${c}: plates ${pu} vs appetite ${dn}`);
  }
  for (const d of lv.diners) {
    if (d.color >= lv.P.colors) problems.push(`diner ${d.id} uses colour ${d.color} beyond the palette`);
    if (d.need < 1) problems.push(`diner ${d.id} has no appetite`);
    if (d.lockColor >= 0 && !lv.diners.some((o) => o.color === d.lockColor && o.id !== d.id))
      problems.push(`diner ${d.id} is locked on a colour nobody else has`);
  }
  if (!problems.length && simulate(lv, rng(1), 0, { intended: true }) !== 'win')
    problems.push('the intended order does not win (check locks, wasabi timing and belt capacity)');
  const diff = problems.length ? 1 : evalLevel(lv, runs);
  return { ok: problems.length === 0, problems, diff, tier: tierFromDiff(diff) };
}

/** Whether a diner could take any plate in the kitchen: used by the editor to flag orphans. */
export function hasPlateFor(lv: LevelLike, d: DinerDef): boolean {
  return lv.kitchen.some((p) => matchDP(d, p, d.need));
}
