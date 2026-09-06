/* Shared types for level definitions (pure data) and the runtime level state. */

export type Tier = 'Easy' | 'Medium' | 'Hard' | 'Super Hard';
export type MechKind = 'wasabi' | 'covered' | 'vip' | 'lock' | 'frozen' | 'double';
export type BoosterKind = 'vip' | 'takeout' | 'sendback';
export type ExprType = 'idle' | 'happy' | 'chew' | 'grumpy';
export type DinerState = 'grid' | 'walking' | 'seated' | 'paying' | 'leaving' | 'done';
export type LevelStatus = 'intro' | 'mech' | 'play' | 'failing' | 'fail' | 'win';
export type FailReason = 'jam' | 'wasabi';
export type SimResult = 'win' | 'fail';
export type Rng = () => number;

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
}

export interface PlateDef {
  color: number;
  vip: boolean;
  double: boolean;
  wasabi: boolean;
  covered: boolean;
}

/** Minimal plate shape accepted by matching and drawing helpers. */
export interface PlateLike {
  color: number;
  vip?: boolean;
  double?: boolean;
  wasabi?: boolean;
  covered?: boolean;
  revealed?: boolean;
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
}

export interface Seat {
  x: number;
  y: number;
  t: number;
  diner: Diner | null;
  /** 1 right after someone sits, decaying to 0: the stool compresses. */
  press: number;
}

export interface LevelStat {
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
  stat: LevelStat;
}
