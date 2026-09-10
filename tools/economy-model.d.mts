/* Types for the economy model (plain ESM so the CLI and CI can run it without a build). */

export interface EconCurveLevel {
  n: number;
  fail: number;
  reward?: number;
}
export interface EconCurve {
  levels: EconCurveLevel[];
}
export interface EconNumbers {
  start: { coins: number; inv: Record<string, number> };
  boosters: Record<string, number>;
  win: { base: number; slope: number; streakStep: number; streakMax: number };
  daily: { base: number; step: number; maxDays: number };
  puzzle: { base: number; perStreakDay: number; maxStreak: number };
  rush: { perPlate: number; cap: number };
  zen: { share: number };
  boss: { coins: number };
  rescue: { coins: number };
  decorRewards?: number[];
}
export interface LedgerRow {
  kind: 'source' | 'sink';
  name: string;
  amount: number;
  per: string;
  note: string;
}
export interface Assumptions {
  levels: number;
  runs: number;
  seed: number;
  boosterThreshold: number;
  boosterEffect: number;
  boosterMix: Record<string, number>;
  wallFails: number;
  levelsPerDay: number;
  puzzleRate: number;
  failMode: 'target' | 'measured';
  measured: (number | null)[] | null;
}
export interface LevelStat {
  n: number;
  fail: number;
  reward: number;
  coins: number;
  coinsP10: number;
  coinsP90: number;
  earned: number;
  spent: number;
  fails: number;
  boosters: number;
  walls: number;
  broke: number;
}
export interface Summary {
  levels: number;
  runs: number;
  income: number;
  incomePerLevel: number;
  avgBoosterCost: number;
  levelsPerBooster: number;
  boostersUsed: number;
  boostersPer3: number;
  failsTotal: number;
  wallsTotal: number;
  wallsAfter30: number;
  wallSpacingAfter30: number;
  wallsBefore30: number;
  endCoins: number;
  minCoins: number;
  brokeLevels: number;
}
export interface Simulation {
  assumptions: Assumptions;
  perLevel: LevelStat[];
  decades: { from: number; to: number; fails: number; boosters: number; walls: number }[];
  summary: Summary;
}
export interface TargetCheck {
  name: string;
  value: number;
  band: [number, number];
  ok: boolean;
}

export const DEFAULT_ASSUMPTIONS: Assumptions;
export const TARGETS: { levelsPerBooster: [number, number]; wallsAfter30: [number, number]; wallsBefore30Max: number };
export function winReward(curve: EconCurve, n: number): number;
export function streakBonus(econ: EconNumbers, streak: number): number;
export function dailyReward(econ: EconNumbers, dayStreak: number): number;
export function puzzleReward(econ: EconNumbers, puzzleStreak: number): number;
export function avgBoosterCost(econ: EconNumbers, mix?: Record<string, number>): number;
export function ledger(curve: EconCurve, econ: EconNumbers, n?: number): LedgerRow[];
export function simulate(curve: EconCurve, econ: EconNumbers, over?: Partial<Assumptions>): Simulation;
export function checkTargets(summary: Summary, targets?: typeof TARGETS): TargetCheck[];
export function rewardColumn(levels: number, base: number, slope: number): number[];
export function tune(
  curve: EconCurve,
  econ: EconNumbers,
  over?: Partial<Assumptions>,
  grid?: { base: [number, number, number]; slope: [number, number, number] }
): { base: number; slope: number; summary: Summary; ok: boolean; score: number }[];
