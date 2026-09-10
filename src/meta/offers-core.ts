/* The starter pack offer rule, pure: once, after the first fail or after level 5, whichever comes first; one
   more time 24 hours later if it was declined; never again once bought. No imports, so the save schema can
   use it. */

export const STARTER_RESHOW_MS = 24 * 3600000;
export const STARTER_MAX_SHOWS = 2;
export const STARTER_LEVEL = 5;

export interface StarterState {
  shows: number;
  lastAt: number;
  bought: boolean;
}

export function defaultStarter(): StarterState {
  return { shows: 0, lastAt: 0, bought: false };
}

export function cleanStarter(x: unknown): StarterState {
  const d = defaultStarter();
  if (!x || typeof x !== 'object') return d;
  const s = x as Record<string, unknown>;
  return {
    shows: typeof s.shows === 'number' && s.shows >= 0 ? Math.floor(s.shows) : d.shows,
    lastAt: typeof s.lastAt === 'number' && Number.isFinite(s.lastAt) ? s.lastAt : d.lastAt,
    bought: s.bought === true,
  };
}

/** `trigger` is what just happened: a fail, or a level cleared (with its number). */
export function shouldShowStarter(st: StarterState, trigger: 'fail' | 'level', level: number, now: number): boolean {
  if (st.bought) return false;
  if (trigger === 'level' && level < STARTER_LEVEL) return false;
  if (st.shows === 0) return true;
  if (st.shows >= STARTER_MAX_SHOWS) return false;
  return now - st.lastAt >= STARTER_RESHOW_MS;
}
