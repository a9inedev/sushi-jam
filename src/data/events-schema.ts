/* Live events and the season pass as data. Definitions come from events.json (bundled, cached, or fetched);
   everything here is pure so the tests can drive it with a fake clock. Dates are ISO strings in the JSON and
   milliseconds once validated. */

export type EventType = 'streak' | 'plates' | 'boss';

export interface Reward {
  coins?: number;
  /** Season pass points. */
  points?: number;
  vip?: number;
  takeout?: number;
  sendback?: number;
}

export interface EventDef {
  id: string;
  type: EventType;
  name: string;
  /** Localised names, by locale code; `name` is the fallback. */
  names?: Record<string, string>;
  start: number;
  end: number;
  /** streak: wins in a row; plates: plates of `color` served; boss: 1. */
  goal: number;
  color?: number;
  /** boss: the curve row the boss board is built on. */
  level?: number;
  rewards: Reward;
}

export interface SeasonTier {
  free: Reward;
  premium: Reward;
}

export interface SeasonDef {
  id: string;
  name: string;
  start: number;
  end: number;
  pointsPerTier: number;
  tiers: SeasonTier[];
}

export interface EventsConfig {
  v: number;
  events: EventDef[];
  season: SeasonDef | null;
}

/** Per-event progress in the save. A completed event snapshots its name and reward so the reward survives
    the definition disappearing from the JSON. */
export interface EventProgress {
  progress: number;
  goal: number;
  claimed: boolean;
  done: boolean;
  name?: string;
  reward?: Reward;
}

export interface SeasonState {
  id: string;
  points: number;
  premium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
}

export const EVENTS_VERSION = 1;
export const POINTS_PER_WIN: Record<string, number> = { level: 10, daily: 15, zen: 4, rush: 5, boss: 0 };

const REWARD_KEYS: (keyof Reward)[] = ['coins', 'points', 'vip', 'takeout', 'sendback'];

function parseDate(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function cleanReward(x: unknown): Reward | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const r: Reward = {};
  for (const k of REWARD_KEYS) {
    const v = o[k];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return null;
    if (v > 0) r[k] = v;
  }
  return r;
}

export function rewardEmpty(r: Reward): boolean {
  return REWARD_KEYS.every((k) => !r[k]);
}

/** Shape and range check. Returns the clean config or the first problem. */
export function validateEvents(x: unknown): { config: EventsConfig | null; error: string | null } {
  const bad = (error: string) => ({ config: null, error });
  if (!x || typeof x !== 'object') return bad('not an object');
  const o = x as Record<string, unknown>;
  if (o.v !== EVENTS_VERSION) return bad(`version ${String(o.v)} is not ${EVENTS_VERSION}`);
  if (!Array.isArray(o.events)) return bad('events must be an array');
  const ids = new Set<string>();
  const events: EventDef[] = [];
  for (let i = 0; i < o.events.length; i++) {
    const e = o.events[i] as Record<string, unknown>;
    const at = `event ${i + 1}`;
    if (!e || typeof e !== 'object') return bad(`${at}: not an object`);
    if (typeof e.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(e.id)) return bad(`${at}: bad id`);
    if (ids.has(e.id)) return bad(`${at}: duplicate id ${e.id}`);
    ids.add(e.id);
    if (e.type !== 'streak' && e.type !== 'plates' && e.type !== 'boss') return bad(`${e.id}: unknown type`);
    if (typeof e.name !== 'string' || !e.name.trim()) return bad(`${e.id}: missing name`);
    const start = parseDate(e.start),
      end = parseDate(e.end);
    if (start === null || end === null || end <= start) return bad(`${e.id}: bad start/end`);
    const goal = e.type === 'boss' ? 1 : e.goal;
    if (typeof goal !== 'number' || !Number.isInteger(goal) || goal < 1 || goal > 100000)
      return bad(`${e.id}: bad goal`);
    const rewards = cleanReward(e.rewards);
    if (!rewards || rewardEmpty(rewards)) return bad(`${e.id}: bad rewards`);
    const def: EventDef = { id: e.id, type: e.type, name: e.name, start, end, goal, rewards };
    if (e.names && typeof e.names === 'object') {
      const names: Record<string, string> = {};
      for (const [k, v] of Object.entries(e.names as Record<string, unknown>)) if (typeof v === 'string') names[k] = v;
      def.names = names;
    }
    if (e.type === 'plates') {
      if (typeof e.color !== 'number' || !Number.isInteger(e.color) || e.color < 0 || e.color > 6)
        return bad(`${e.id}: bad colour`);
      def.color = e.color;
    }
    if (e.type === 'boss') {
      if (typeof e.level !== 'number' || !Number.isInteger(e.level) || e.level < 1 || e.level > 500)
        return bad(`${e.id}: bad level`);
      def.level = e.level;
    }
    events.push(def);
  }
  let season: SeasonDef | null = null;
  if (o.season != null) {
    const s = o.season as Record<string, unknown>;
    if (!s || typeof s !== 'object') return bad('season: not an object');
    if (typeof s.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(s.id)) return bad('season: bad id');
    if (typeof s.name !== 'string' || !s.name.trim()) return bad('season: missing name');
    const start = parseDate(s.start),
      end = parseDate(s.end);
    if (start === null || end === null || end <= start) return bad('season: bad start/end');
    const per = s.pointsPerTier;
    if (typeof per !== 'number' || !Number.isInteger(per) || per < 1) return bad('season: bad pointsPerTier');
    if (!Array.isArray(s.tiers) || s.tiers.length < 1 || s.tiers.length > 60) return bad('season: tiers must be 1..60');
    const tiers: SeasonTier[] = [];
    for (let i = 0; i < s.tiers.length; i++) {
      const t = s.tiers[i] as Record<string, unknown>;
      const free = t && cleanReward(t.free),
        premium = t && cleanReward(t.premium);
      if (!free || !premium) return bad(`season: tier ${i + 1} bad rewards`);
      tiers.push({ free, premium });
    }
    season = { id: s.id, name: s.name, start, end, pointsPerTier: per, tiers };
  }
  return { config: { v: EVENTS_VERSION, events, season }, error: null };
}

export function isActive(e: { start: number; end: number }, now: number): boolean {
  return now >= e.start && now < e.end;
}

export function isEnded(e: { end: number }, now: number): boolean {
  return now >= e.end;
}

export function timeLeft(e: { end: number }, now: number): number {
  return Math.max(0, e.end - now);
}

/** "2d 3h", "3h 12m", "12m 05s", "0:09". */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `0:${String(sec).padStart(2, '0')}`;
}

export function eventName(e: EventDef, locale: string): string {
  return (e.names && (e.names[locale] || e.names[locale.split('-')[0]])) || e.name;
}

export function emptyProgress(e: EventDef): EventProgress {
  return { progress: 0, goal: e.goal, claimed: false, done: false };
}

/** Everything the player should see: active events, and finished events whose reward is still unclaimed
    (even after they ended, even if their definition has gone). Claimable first, then by soonest end. */
export function visibleEvents(
  config: EventsConfig,
  progress: Record<string, EventProgress>,
  now: number
): { def: EventDef | null; id: string; state: EventProgress; active: boolean; claimable: boolean }[] {
  const out: { def: EventDef | null; id: string; state: EventProgress; active: boolean; claimable: boolean }[] = [];
  for (const def of config.events) {
    const state = progress[def.id] || emptyProgress(def);
    const active = isActive(def, now);
    const claimable = state.done && !state.claimed;
    if (active || claimable) out.push({ def, id: def.id, state, active, claimable });
  }
  for (const [id, state] of Object.entries(progress))
    if (!config.events.some((e) => e.id === id) && state.done && !state.claimed)
      out.push({ def: null, id, state, active: false, claimable: true });
  out.sort((a, b) => {
    if (a.claimable !== b.claimable) return a.claimable ? -1 : 1;
    return (a.def ? a.def.end : 0) - (b.def ? b.def.end : 0);
  });
  return out;
}

/** Drop progress that can never matter again: ended events that were not finished, and claimed ones.
    Finished-but-unclaimed entries are kept whatever happened to the definition. */
export function pruneProgress(
  config: EventsConfig,
  progress: Record<string, EventProgress>,
  now: number
): Record<string, EventProgress> {
  const out: Record<string, EventProgress> = {};
  for (const [id, state] of Object.entries(progress)) {
    const def = config.events.find((e) => e.id === id);
    if (state.claimed) continue;
    if (state.done) {
      out[id] = state;
      continue;
    }
    if (def && !isEnded(def, now)) out[id] = state;
  }
  return out;
}

export function tierOf(points: number, per: number, tiers: number): number {
  return Math.max(0, Math.min(tiers, Math.floor(points / Math.max(1, per))));
}

/** Tiers (1-based) whose reward on a track can be claimed right now. */
export function claimableTiers(season: SeasonDef, state: SeasonState, track: 'free' | 'premium'): number[] {
  if (state.id !== season.id) return [];
  if (track === 'premium' && !state.premium) return [];
  const reached = tierOf(state.points, season.pointsPerTier, season.tiers.length);
  const claimed = track === 'free' ? state.claimedFree : state.claimedPremium;
  const out: number[] = [];
  for (let t = 1; t <= reached; t++) if (!claimed.includes(t)) out.push(t);
  return out;
}

export function addRewards(a: Reward, b: Reward): Reward {
  const out: Reward = { ...a };
  for (const k of REWARD_KEYS) if (b[k]) out[k] = (out[k] || 0) + (b[k] as number);
  return out;
}

export function emptySeason(id = ''): SeasonState {
  return { id, points: 0, premium: false, claimedFree: [], claimedPremium: [] };
}
