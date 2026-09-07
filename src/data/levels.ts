/* Loads every levels/NNN.json into the level engine. Importing this module is what makes authored levels
   play; tests that want the pure generator simply do not import it. */

import { levelFromJson, type LevelJson } from '../engine/authored';
import { registerAuthored } from '../engine/levels';
import type { LevelDef } from '../engine/types';

const files = import.meta.glob('../../levels/*.json', { eager: true, import: 'default' }) as Record<string, LevelJson>;

export const AUTHORED_LEVELS = new Map<number, LevelJson>();
for (const j of Object.values(files)) if (j && typeof j.n === 'number') AUTHORED_LEVELS.set(j.n, j);

const built = new Map<number, LevelDef>();

export function authoredLevel(n: number): LevelDef | null {
  const j = AUTHORED_LEVELS.get(n);
  if (!j) return null;
  let lv = built.get(n);
  if (!lv) {
    lv = levelFromJson(j);
    built.set(n, lv);
  }
  return lv;
}

export function authoredCount(): number {
  return AUTHORED_LEVELS.size;
}

registerAuthored(authoredLevel);
