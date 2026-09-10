/* Lives at runtime. Variant A has none (every call is a no-op and every gate passes); variant B keeps the
   stock in the save, loses one on a level fail, refills on the flag's interval, and gates every level start
   through the out-of-lives screen. */

import { G, toast } from '../engine/state';
import { t } from '../i18n';
import { track } from './analytics';
import { livesSettings, livesVariant, onFlagsChange } from './flags';
import {
  addLives,
  canPlay,
  grantUnlimited as grantCore,
  isUnlimited,
  lose,
  nextLifeIn,
  refill,
  withMax,
  type LivesState,
} from './lives-core';
import { S, save } from './save';

let clock: () => number = Date.now;

export function setLivesClock(fn: () => number): void {
  clock = fn;
}

export function livesEnabled(): boolean {
  return livesVariant() === 'B';
}

function refillMs(): number {
  return livesSettings().refillMinutes * 60000;
}

/** The stock, refilled to now. Writes back when something changed. */
export function lives(): LivesState {
  const now = clock();
  const max = livesSettings().max;
  let st = S.lives.max === max ? S.lives : withMax(S.lives, max);
  st = refill(st, now, refillMs());
  // Only a change in the stock itself is worth a write; the clock drifts along with the next regular save.
  if (st !== S.lives) {
    const changed = st.n !== S.lives.n || st.max !== S.lives.max;
    S.lives = st;
    if (changed) save();
  }
  return st;
}

export function livesUnlimited(): boolean {
  return isUnlimited(S.lives, clock());
}

export function livesNextIn(): number {
  return nextLifeIn(lives(), clock(), refillMs());
}

export function livesCanPlay(): boolean {
  return !livesEnabled() || canPlay(lives(), clock(), refillMs());
}

/** A level fail. */
export function loseLife(): void {
  if (!livesEnabled()) return;
  const before = lives();
  S.lives = lose(before, clock(), refillMs());
  save();
}

export function addLife(k: number): void {
  S.lives = addLives(lives(), k, clock(), refillMs());
  save();
}

export function grantUnlimitedLives(minutes: number): void {
  S.lives = grantCore(S.lives, minutes, clock());
  save();
  toast(t('lives.unlimitedGranted', { n: minutes }), 2.6, 0.3);
}

/** Run `then` now if a life is available (or lives are off); otherwise open the out-of-lives screen, which
    runs it once the player has a life again. */
export function withLife(then: () => void): boolean {
  if (livesCanPlay()) {
    then();
    return true;
  }
  track('lives_out');
  G.screen = { type: 'lives', t: 0, onDone: then };
  return false;
}

export function initLives(): void {
  onFlagsChange(() => lives());
  lives();
}

/** Dev/test: set the stock directly. */
export function setLives(patch: Partial<LivesState>): LivesState {
  S.lives = { ...S.lives, ...patch };
  save();
  return lives();
}
