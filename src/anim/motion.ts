/* Reduce-motion: the OS preference or the Settings toggle. When on, tweens run 1.6x faster, decorative
   motion (lean, squash, bob, shake, confetti, steam) is skipped and particle counts drop to a third. */

import { S } from '../meta/save';
import { particles } from './particles';
import { tweens } from './tween';

let system = false;

export function systemReducedMotion(): boolean {
  return system;
}

export function reducedMotion(): boolean {
  return system || S.reduceMotion;
}

/** Push the current preference into the tween and particle systems. Call after toggling the setting. */
export function applyMotion(): void {
  const r = reducedMotion();
  tweens.setTimeScale(r ? 1.6 : 1);
  particles.reduced = r;
}

export function initMotion(): void {
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    system = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      system = e.matches;
      applyMotion();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  } catch {
    system = false;
  }
  applyMotion();
}

/** Motion budget in seconds for core actions. Anything the player waits on stays at or under this. */
export const MOTION_BUDGET = 0.4;
