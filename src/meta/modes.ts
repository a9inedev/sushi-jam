/* Starting, restarting and leaving the side modes. The level counter (S.level) is never touched here or by
   a mode's win: daily marks its calendar, rush keeps its best, zen climbs its own ladder. */

import { dateKey, makeDaily, makeRush, makeZen } from '../engine/modes-core';
import { newLevel, newLevelDef } from '../engine/rules';
import { cur, G } from '../engine/state';
import { track } from './analytics';
import { startBoss } from './events';
import { withLife } from './lives';
import { S } from './save';

export type SideMode = 'daily' | 'rush' | 'zen';

export function startMode(mode: SideMode, key = dateKey()): void {
  G.screen = null;
  G.pending = [];
  if (mode === 'daily') newLevelDef(makeDaily(key), 'daily', key);
  else if (mode === 'rush') newLevelDef(makeRush(Date.now()), 'rush');
  else newLevelDef(makeZen(S.zenLevel), 'zen');
}

/** Replay whatever is being played: the level, today's puzzle, a fresh rush board, or the same zen rung. */
export function restartLevel(): void {
  const L = cur();
  G.screen = null;
  if (L.mode === 'level') {
    track('retry', { n: L.n });
    withLife(() => newLevel(L.n));
  } else if (L.mode === 'daily') startMode('daily', L.modeKey);
  else if (L.mode === 'rush') startMode('rush');
  else if (L.mode === 'boss') startBoss(L.modeKey);
  else newLevelDef(makeZen(L.n), 'zen');
}

/** Back to the level loop where the player left it. */
export function leaveMode(): void {
  G.screen = null;
  G.pending = [];
  withLife(() => newLevel(S.level));
}
