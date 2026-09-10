/* Mutable runtime store shared by rules, rendering and UI, plus the small helpers that only touch it.
   Tweens live in anim/tween and particles in anim/particles. */

import type { BoardId } from '../data/leaderboards';
import type { Diner, ExprType, RuntimeLevel } from './types';

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  onTap: () => void;
  /** Sliders: called with the pointer position on press and while dragging. */
  onDrag?: (x: number, y: number) => void;
}

export interface Toast {
  text: string;
  t: number;
  dur: number;
}

export type ScreenType =
  | 'ad'
  | 'shop'
  | 'offer'
  | 'daily'
  | 'dev'
  | 'map'
  | 'settings'
  | 'pause'
  | 'confirm'
  | 'editor'
  | 'events'
  | 'profile';
export type MapTab = 'path' | 'modes' | 'decor' | 'album' | 'weekly' | 'game' | 'account';

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
  /** Decor tab: the restaurant being browsed. */
  theme?: string;
  /** Ranks tab: which board is open. */
  board?: BoardId;
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
  toasts: [] as Toast[],
  screen: null as Screen | null,
  pending: [] as Array<() => void>,
  lastT: 0,
  lastDt: 0,
  gt: 0,
  coinPop: 0,
  devTaps: [] as number[],
  /** Smoothed frames per second, for the dev panel and the smoke test. */
  fps: 60,
  /** The slider currently being dragged, if any. */
  drag: null as Button | null,
};

/** The current level. Only call from code paths that run after newLevel(). */
export function cur(): RuntimeLevel {
  return G.L as RuntimeLevel;
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
