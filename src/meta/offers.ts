/* The starter pack offer at runtime: queue the screen when the rule says so, count the show when it opens,
   remember a purchase. The rule itself is in offers-core.ts. */

import { G } from '../engine/state';
import { shouldShowStarter } from './offers-core';
import { S, save } from './save';

export {
  cleanStarter,
  defaultStarter,
  shouldShowStarter,
  STARTER_LEVEL,
  STARTER_MAX_SHOWS,
  STARTER_RESHOW_MS,
  type StarterState,
} from './offers-core';

/** Queue the offer screen if the rule says so. Counting a show happens when the screen opens. */
export function queueStarter(trigger: 'fail' | 'level', level: number, now = Date.now()): boolean {
  if (!shouldShowStarter(S.starter, trigger, level, now)) return false;
  G.pending.push(() => {
    S.starter.shows++;
    S.starter.lastAt = Date.now();
    save();
    G.screen = { type: 'offer', t: 0 };
  });
  return true;
}

export function starterBought(): void {
  S.starter.bought = true;
  save();
}
