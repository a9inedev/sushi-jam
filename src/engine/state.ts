/* Mutable runtime store shared by rules, rendering and UI, plus the small helpers that only touch it. */

import { easeInOut, type Ease } from './util';
import type { Diner, ExprType, RuntimeLevel } from './types';

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  onTap: () => void;
}

export interface Tween {
  obj: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  t: number;
  dur: number;
  ease: Ease;
  onDone?: () => void;
}

export interface CoinParticle {
  x: number;
  y: number;
  t: number;
  dur: number;
  value: number;
}

export interface Toast {
  text: string;
  t: number;
  dur: number;
}

export type Fx =
  | { kind: 'bonk' | 'puff' | 'unlock'; x: number; y: number; t: number; dur: number }
  | { kind: 'shard' | 'crumb'; x: number; y: number; vx: number; vy: number; t: number; dur: number; c?: string };

export interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  c: string;
  w: number;
  h: number;
}

export type ScreenType = 'ad' | 'shop' | 'offer' | 'daily' | 'dev' | 'map' | 'settings' | 'pause' | 'confirm';
export type MapTab = 'path' | 'decor' | 'weekly';

export interface Screen {
  type: ScreenType;
  t: number;
  kind?: 'inter' | 'reward';
  dur?: number;
  onDone?: (() => void) | null;
  seed?: number;
  back?: Screen | null;
  reward?: number;
  tab?: MapTab;
  /* confirm dialogs */
  title?: string;
  text?: string;
  yes?: string;
  danger?: boolean;
  onYes?: () => void;
}

export const G = {
  L: null as RuntimeLevel | null,
  buttons: [] as Button[],
  tweens: [] as Tween[],
  particles: [] as CoinParticle[],
  toasts: [] as Toast[],
  fx: [] as Fx[],
  confetti: [] as Confetti[],
  screen: null as Screen | null,
  pending: [] as Array<() => void>,
  lastT: 0,
  lastDt: 0,
  gt: 0,
  coinPop: 0,
  devTaps: [] as number[],
};

/** The current level. Only call from code paths that run after newLevel(). */
export function cur(): RuntimeLevel {
  return G.L as RuntimeLevel;
}

export function tween(obj: object, to: Record<string, number>, dur: number, ease?: Ease, onDone?: () => void): void {
  const o = obj as Record<string, number>;
  const from: Record<string, number> = {};
  for (const k in to) from[k] = o[k];
  G.tweens.push({ obj: o, from, to, t: 0, dur, ease: ease || easeInOut, onDone });
}

export function toast(text: string, dur?: number, delay?: number): void {
  G.toasts.push({ text, t: -(delay || 0), dur: dur || 2.2 });
}

export function setExpr(d: Diner, type: ExprType, dur: number): void {
  d.expr = { type, until: G.gt + dur };
}

export function showAd(kind: 'inter' | 'reward', onDone: (() => void) | null): void {
  G.screen = { type: 'ad', kind, t: 0, dur: kind === 'inter' ? 3 : 5, onDone, seed: Math.random() };
}

export function closeScreen(): void {
  G.screen = null;
}

export function runPending(): void {
  if (G.pending.length) {
    const f = G.pending.shift() as () => void;
    f();
  }
}
