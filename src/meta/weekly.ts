import { GHOST_NAMES } from '../data/constants';
import { hashStr, rng } from '../engine/rng';
import { weekKey } from '../engine/util';
import { S } from './save';

export interface GhostRow {
  name: string;
  score: number;
  me?: boolean;
}

/** Nine local rivals seeded by the ISO week, so the board is stable for seven days. */
export function ghosts(): GhostRow[] {
  const R = rng(hashStr(S.weekKey || weekKey()));
  const names = GHOST_NAMES.slice()
    .sort(() => R() - 0.5)
    .slice(0, 9);
  return names.map((n) => ({ name: n, score: 3 + Math.floor(Math.pow(R(), 1.6) * 40) }));
}

export function weeklyBoard(): GhostRow[] {
  return ghosts()
    .concat([{ name: 'You', score: S.weekly || 0, me: true }])
    .sort((a, b) => b.score - a.score);
}
