/* Authored levels: the JSON format stored in /levels, its compact cell and kitchen grammar, the kitchen
   simulation for hand-made boards, and validation. Pure: used by the game, the editor, the tool and CI.

   Cell token:   <colour><dir><need>[V][L<colour>][I<ice>][P<seq>]  e.g. "2v3", "0>2V", "4<4L1", "3^3I3",
                 "1^3P102" (ticket guest eating colours 1, 0, 2), "." = empty
   Kitchen token: <colour>[V][D][W][C][S][N<ticket>]   V vip, D double, W wasabi, C covered, S chef's special,
                 N<k> named plate for ticket guest k
   Level rules (chain, rush, reserved, reverse) live in the JSON "rules" object. */

import {
  assignPicky,
  evalLevel,
  kitchenSim,
  matchDP,
  mechsOf,
  NO_RULES,
  normaliseRules,
  pathClear,
  peelOrder,
  plateUnits,
  rulesOf,
  simulate,
  tierFromDiff,
  paramsFor,
} from './levels';
export { mechsOf } from './levels';
import { rng } from './rng';
import type { DinerDef, GridCell, LevelDef, LevelLike, LevelParams, LevelRules, PlateDef, Rng } from './types';

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
  /** Level-wide rules; absent means none. */
  rules?: Partial<LevelRules>;
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
  seq?: number[];
}

const DIRS = '^>v<';

export function parseCellToken(tk: string): Omit<AuthoredCell, 'r' | 'c'> | null {
  const m = /^(\d)([\^>v<])(\d)((?:V|L\d|I\d|P\d+)*)$/.exec(tk.trim());
  if (!m) return null;
  let vip = false,
    lockColor = -1,
    ice = 0,
    seq: number[] | undefined;
  for (const f of m[4].matchAll(/V|L(\d)|I(\d)|P(\d+)/g)) {
    if (f[0] === 'V') vip = true;
    else if (f[1] !== undefined) lockColor = +f[1];
    else if (f[2] !== undefined) ice = +f[2];
    else if (f[3] !== undefined) seq = f[3].split('').map(Number);
  }
  const cell: Omit<AuthoredCell, 'r' | 'c'> = {
    color: +m[1],
    dir: DIRS.indexOf(m[2]),
    need: +m[3],
    vip,
    lockColor,
    ice,
  };
  if (seq && seq.length) cell.seq = seq;
  return cell;
}

export function formatCell(c: Omit<AuthoredCell, 'r' | 'c'>): string {
  return (
    `${c.color}${DIRS[c.dir]}${c.need}` +
    (c.vip ? 'V' : '') +
    (c.lockColor >= 0 ? 'L' + c.lockColor : '') +
    (c.ice > 0 ? 'I' + c.ice : '') +
    (c.seq && c.seq.length ? 'P' + c.seq.join('') : '')
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
      const m = /^(\d)((?:[VDWCS]|N\d+)*)$/.exec(tk);
      if (!m) return null;
      const f = m[2];
      const p: PlateDef = {
        color: +m[1],
        vip: f.includes('V'),
        double: f.includes('D'),
        wasabi: f.includes('W'),
        covered: f.includes('C'),
      };
      if (f.includes('S')) p.special = true;
      const owner = /N(\d+)/.exec(f);
      if (owner) p.owner = +owner[1];
      return p;
    })
    .filter((p): p is PlateDef => !!p);
}

export function formatKitchen(k: PlateDef[]): string {
  return k
    .map(
      (p) =>
        `${p.color}` +
        (p.vip ? 'V' : '') +
        (p.double ? 'D' : '') +
        (p.wasabi ? 'W' : '') +
        (p.covered ? 'C' : '') +
        (p.special ? 'S' : '') +
        (p.owner != null && p.owner >= 0 ? 'N' + p.owner : '')
    )
    .join(' ');
}

/** Diners in solution (peel) order with ids assigned, or null if the board cannot be peeled. */
export function dinersFromCells(cells: AuthoredCell[], rows: number, cols: number): DinerDef[] | null {
  const order = peelOrder(cells, rows, cols) as AuthoredCell[] | null;
  if (!order) return null;
  const diners = order.map((c, i) => {
    const d: DinerDef = {
      r: c.r,
      c: c.c,
      dir: c.dir,
      id: i,
      color: c.color,
      need: c.need,
      vip: c.vip,
      lockColor: c.lockColor,
      ice: c.ice,
    };
    if (c.seq && c.seq.length) d.seq = c.seq.slice();
    return d;
  });
  assignPicky(diners);
  return diners;
}

/** Service order of the diners' appetites with K seats under the level rules: the plates the kitchen sends. */
export function kitchenFromSolution(
  diners: DinerDef[],
  K: number,
  R: Rng,
  doubleP = 0,
  rules: LevelRules = NO_RULES,
  specialP = 0
): PlateDef[] {
  return kitchenSim(diners, K, R, { doubleP, rules, specialP }).kitchen;
}

export function paramsFromJson(j: LevelJson): LevelParams {
  const base = paramsFor(j.n),
    rules = normaliseRules(j.rules);
  return {
    ...base,
    rows: j.rows,
    cols: j.cols,
    colors: j.colors,
    seats: j.seats ?? base.seats,
    beltCap: j.beltCap ?? base.beltCap,
    visibleNext: j.visibleNext ?? base.visibleNext,
    speed: j.speed ?? base.speed,
    ...(rules !== NO_RULES ? { rules } : {}),
  };
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

/** Everything that must hold for a level to ship: peelable, plates equal appetite per colour and for VIPs,
    ticket guests get exactly their printed plates, specials are plain extras, rules are well formed and refer
    to colours on the board, locks reference colours that finish first, the intended order wins without a
    booster (the fairness rule), and the measured rate. */
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
  const isPicky = (d: DinerDef) => !!(d.seq && d.seq.length);
  const named = (p: PlateDef) => p.owner != null && p.owner >= 0;
  // A special counts one unit for the colour it was planned for (its colour field); named plates belong to
  // their ticket guest and are checked against the ticket below.
  const regular = lv.kitchen.filter((p) => !named(p));
  const plain = lv.diners.filter((d) => !isPicky(d));
  const units = regular.reduce((a, p) => a + plateUnits(p), 0);
  const appetite = plain.reduce((a, d) => a + d.need, 0);
  if (units !== appetite) problems.push(`plates ${units} vs appetite ${appetite}`);
  const vipUnits = regular.filter((p) => p.vip).reduce((a, p) => a + plateUnits(p), 0);
  const vipNeed = plain.filter((d) => d.vip).reduce((a, d) => a + d.need, 0);
  if (vipUnits !== vipNeed) problems.push(`VIP plates ${vipUnits} vs VIP appetite ${vipNeed}`);
  for (let c = 0; c < lv.P.colors; c++) {
    const pu = regular.filter((p) => p.color === c).reduce((a, p) => a + plateUnits(p), 0);
    const dn = plain.filter((d) => d.color === c).reduce((a, d) => a + d.need, 0);
    if (pu !== dn) problems.push(`colour ${c}: plates ${pu} vs appetite ${dn}`);
  }
  for (const p of lv.kitchen)
    if (p.special && !plain.some((d) => !d.vip && d.color === p.color))
      problems.push(`a special is planned for colour ${p.color} but no ordinary guest of that colour exists`);
  for (const d of lv.diners) {
    if (d.color >= lv.P.colors) problems.push(`diner ${d.id} uses colour ${d.color} beyond the palette`);
    if (d.need < 1) problems.push(`diner ${d.id} has no appetite`);
    if (d.lockColor >= 0 && !lv.diners.some((o) => o.color === d.lockColor && o.id !== d.id))
      problems.push(`diner ${d.id} is locked on a colour nobody else has`);
    if (isPicky(d)) {
      const seq = d.seq as number[];
      if (seq.length !== d.need) problems.push(`ticket guest ${d.id}: sequence of ${seq.length} vs appetite ${d.need}`);
      if (d.vip) problems.push(`ticket guest ${d.id} cannot be a VIP`);
      if (seq.some((c) => c >= lv.P.colors)) problems.push(`ticket guest ${d.id} asks for a colour beyond the palette`);
      const owned = lv.kitchen.filter((p) => p.owner === d.picky);
      if (owned.some((p) => p.double || p.special || p.vip))
        problems.push(`ticket guest ${d.id}: named plates must be plain single plates`);
      const sent = owned.map((p) => p.color).join('');
      if (sent !== seq.join(''))
        problems.push(`ticket guest ${d.id}: kitchen sends [${sent}] but the ticket says [${seq.join('')}]`);
    }
  }
  for (const p of lv.kitchen) {
    if (named(p) && !lv.diners.some((d) => isPicky(d) && d.picky === p.owner))
      problems.push(`a plate is named for ticket ${p.owner} but no such guest exists`);
    if (p.special && (p.vip || p.double || named(p))) problems.push('a special must be a plain single plate');
  }
  const rules = rulesOf(lv.P),
    K = lv.P.seats;
  if (rules.chain > 0 && K < 3) problems.push('chained seats need at least three seats');
  if (rules.reserved.length && rules.reserved.length !== K)
    problems.push(`reserved list has ${rules.reserved.length} entries for ${K} seats`);
  rules.reserved.forEach((c, i) => {
    if (c < 0) return;
    if (c >= lv.P.colors) problems.push(`seat ${i} is reserved for colour ${c} beyond the palette`);
    else if (!lv.diners.some((d) => d.color === c)) problems.push(`seat ${i} is reserved for a colour nobody has`);
    if (rules.chain > 0 && i <= 1) problems.push('chained seats cannot be reserved');
  });
  if (rules.rush > 0 && rules.rush >= lv.kitchen.length)
    problems.push(`rush hour starts at plate ${rules.rush} but there are only ${lv.kitchen.length} plates`);
  if (rules.reverse && (rules.reverse[0] < 4 || rules.reverse[1] < 1 || rules.reverse[1] >= rules.reverse[0]))
    problems.push('reversal cadence must be [every >= 4 s, reversed >= 1 s and shorter than every]');
  if (!problems.length && simulate(lv, rng(1), 0, { intended: true }) !== 'win')
    problems.push(
      'the intended order does not win without a booster (check locks, wasabi timing, belt capacity, reserved seats and ticket order)'
    );
  const diff = problems.length ? 1 : evalLevel(lv, runs);
  return { ok: problems.length === 0, problems, diff, tier: tierFromDiff(diff) };
}

/** Whether a diner could take any plate in the kitchen: used by the editor to flag orphans. */
export function hasPlateFor(lv: LevelLike, d: DinerDef): boolean {
  return lv.kitchen.some((p) => matchDP(d, p, d.need));
}
