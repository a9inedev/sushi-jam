/* Generated levels are expensive to build (twelve seeds, solver runs, fairness checks), so test files share
   one cache, and long loops yield to the event loop now and then so the Vitest worker can answer the
   runner's heartbeat on slow CI machines. */
import { makeGenerated, type MechSet } from '../../src/engine/levels';
import type { LevelDef } from '../../src/engine/types';

const cache = new Map<string, LevelDef>();

export function generated(n: number, mode: MechSet = false): LevelDef {
  const key = n + ':' + String(mode);
  let lv = cache.get(key);
  if (!lv) {
    lv = makeGenerated(n, mode);
    cache.set(key, lv);
  }
  return lv;
}

/** Let the worker breathe between heavy iterations. */
export const tick = (): Promise<void> => new Promise((r) => setImmediate(r));
