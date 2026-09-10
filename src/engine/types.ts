/* Shared types for level definitions (pure data) and the runtime level state. */

import type { ThemeId } from '../data/themes';

export type Tier = 'Easy' | 'Medium' | 'Hard' | 'Super Hard';
export type MechKind =
  | 'wasabi'
  | 'covered'
  | 'vip'
  | 'lock'
  | 'frozen'
  | 'double'
  | 'chain'
  | 'rush'
  | 'special'
  | 'picky'
  | 'reserved'
  | 'reverse';
export type BoosterKind = 'vip' | 'takeout' | 'sendback';
export type ExprType = 'idle' | 'happy' | 'chew' | 'grumpy';
export type DinerState = 'grid' | 'walking' | 'seated' | 'paying' | 'leaving' | 'done';
export type LevelStatus = 'intro' | 'reveal' | 'mech' | 'play' | 'failing' | 'fail' | 'win';
export type FailReason = 'jam' | 'wasabi' | 'rush' | 'reserved' | 'chain' | 'reverse' | 'picky';
export type SimResult = 'win' | 'fail';
/** The level loop, or one of the side modes (docs/modes.md). */
export type GameMode = 'level' | 'daily' | 'rush' | 'zen' | 'boss';
export type Rng = () => number;

/** Level-wide rules. chain: seats 1 and 2 share one queue (the back seat waits). rush: the plate index at
    which rush hour starts (0 = none). reserved: per seat, the only colour that may sit there (-1 = anyone).
    reverse: [seconds between reversals, seconds reversed]. */
export interface LevelRules {
  chain: number;
  rush: number;
  reserved: number[];
  reverse: [number, number] | null;
}

export interface LevelParams {
  tier: Tier;
  colors: number;
  cols: number;
  rows: number;
  fill: number;
  app: [number, number];
  visibleNext: number;
  beltCap: number;
  speed: number;
  seats: number;
  rules?: LevelRules;
}

/** A grid cell from generation or an authored board. Direction: 0 up, 1 right, 2 down, 3 left. */
export interface GridCell {
  r: number;
  c: number;
  dir: number;
  color?: number;
}

export interface DinerDef {
  r: number;
  c: number;
  dir: number;
  id: number;
  color: number;
  need: number;
  vip: boolean;
  lockColor: number;
  ice: number;
  /** Picky (ticket) guest: the colours they eat, in order; length equals need. */
  seq?: number[];
  /** Ticket number of a picky guest, in reading order; matches PlateDef.owner. */
  picky?: number;
}

export interface PlateDef {
  color: number;
  vip: boolean;
  double: boolean;
  wasabi: boolean;
  covered: boolean;
  /** Chef's special: an extra plate any ordinary diner may take. */
  special?: boolean;
  /** Named plate for the picky guest with this ticket number. */
  owner?: number;
}

/** Minimal plate shape accepted by matching and drawing helpers. */
export interface PlateLike {
  color: number;
  vip?: boolean;
  double?: boolean;
  wasabi?: boolean;
  covered?: boolean;
  revealed?: boolean;
  special?: boolean;
  owner?: number;
}

export interface LevelDef {
  n: number;
  P: LevelParams;
  rows: number;
  cols: number;
  diners: DinerDef[];
  kitchen: PlateDef[];
  seed: number;
  diff: number;
  tierLabel: Tier;
  mechs: MechKind[];
  authored?: boolean;
  tuned?: boolean;
  count?: number;
  /** Side-mode boards carry their mode; the level loop leaves it unset. */
  mode?: GameMode;
  /** Daily puzzle: the calendar day the board belongs to. */
  modeKey?: string;
}

/** What the solver needs from a level; a LevelDef satisfies it before diff/tier are known. */
export interface LevelLike {
  P: LevelParams;
  rows: number;
  cols: number;
  diners: DinerDef[];
  kitchen: PlateDef[];
  seed: number;
}

/* ---------- runtime ---------- */

export interface Expr {
  type: ExprType;
  until: number;
}

export interface Diner extends DinerDef {
  state: DinerState;
  x: number;
  y: number;
  hx: number;
  hy: number;
  pending: number;
  alpha: number;
  scale: number;
  bump: number;
  shake: number;
  shakeX: number;
  shakeY: number;
  bumping: boolean;
  seat: number;
  waitSince: number;
  movable: boolean;
  expr: Expr;
  blinkAt: number;
  bubblePop: number;
  paidT: number;
  leaveT: number;
  iceMax: number;
  /** Sitting in the back seat of a chained pair: eats only once promoted to the front. */
  waiting: boolean;
  /** Animation-only: rotation in radians and squash scale, driven by the tween manager. */
  lean: number;
  sx: number;
  sy: number;
}

export interface PlateArc {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  u: number;
}

export interface Plate extends PlateDef {
  t: number;
  /** belt: circling; grab: flying to a diner; landed: squashing on the diner for a tenth of a second. */
  state: 'belt' | 'grab' | 'landed';
  x: number;
  y: number;
  s: number;
  sx: number;
  sy: number;
  revealed: boolean;
  timer: number;
  id: number;
  arc?: PlateArc;
  /** Nobody can take it any more: the chef takes it back at the kitchen door. */
  surplus?: boolean;
}

export interface Seat {
  x: number;
  y: number;
  t: number;
  diner: Diner | null;
  /** 1 right after someone sits, decaying to 0: the stool compresses. */
  press: number;
  /** Only this colour may sit here; -1 for anyone. */
  reserved: number;
  /** 0 plain, 1 front of a chained pair, 2 back of a chained pair. */
  chain: 0 | 1 | 2;
}

export interface LevelStat {
  mode: GameMode;
  /** Rush: plates served. */
  score: number;
  n: number;
  sched: Tier;
  label: Tier;
  diff: number;
  t0: number;
  taps: number;
  boosters: number;
  beltPeak: number;
  fails?: number;
}

export interface StatRecord {
  mode: GameMode;
  score?: number;
  n: number;
  sched: Tier;
  label: Tier;
  diff: number;
  time: number;
  taps: number;
  boosters: number;
  beltPeak: number;
  result: string;
  ts: number;
}

export interface RuntimeLevel {
  n: number;
  lv: LevelDef;
  P: LevelParams;
  rows: number;
  cols: number;
  cell: number;
  gx: number;
  gy: number;
  diners: Diner[];
  kitchen: PlateDef[];
  totalPlates: number;
  belt: Plate[];
  seats: Seat[];
  seatCount: number;
  beltCap: number;
  speed: number;
  visibleNext: number;
  status: LevelStatus;
  introT: number;
  elapsed: number;
  sinceEmit: number;
  steamT: number;
  deadlock: number;
  failT: number;
  failReason: FailReason;
  failSlow: number;
  vipUsed: boolean;
  armed: BoosterKind | null;
  lastLeave: number;
  combo: number;
  earned: number;
  streakBonus: number;
  tension: number;
  seatShake: number;
  shake: number;
  doneColors: Set<number>;
  newMechs: MechKind[];
  mechIdx: number;
  plateId: number;
  /** Plates sent so far (rush hour triggers on a plate index). */
  emitted: number;
  /** Seconds of rush hour left. */
  rushT: number;
  reversed: boolean;
  /** Seconds until the belt flips direction (only with the reverse rule). */
  reverseT: number;
  /** Belt travel in laps, for the belt texture; runs backwards while reversed. */
  beltPhase: number;
  mode: GameMode;
  modeKey: string;
  /** Rush: seconds left, plates served, delay until the next guest fills an empty cell, next diner id. */
  timeLeft: number;
  score: number;
  spawnT: number;
  nextId: number;
  /** A new restaurant opens with this level: its reveal plays after the intro. */
  reveal: ThemeId | null;
  revealT: number;
  stat: LevelStat;
}
