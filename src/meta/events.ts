/* Live events and the season pass at runtime: the config (bundled, cached, or fetched with a timeout), the
   progress hooks the rules call, the claim flow, the once-a-second tick that expires events and settles a
   season, and the remote override that lets a test event be switched on by editing events.json alone. */

import { sfx } from '../audio/audio';
import bundled from '../data/events.json';
import {
  addRewards,
  claimableTiers,
  emptyProgress,
  emptySeason,
  isActive,
  isEnded,
  pruneProgress,
  tierOf,
  validateEvents,
  visibleEvents,
  POINTS_PER_WIN,
  type EventDef,
  type EventProgress,
  type EventsConfig,
  type Reward,
} from '../data/events-schema';
import { hashStr } from '../engine/rng';
import { makeGenerated } from '../engine/levels';
import { newLevelDef } from '../engine/rules';
import { G, toast } from '../engine/state';
import type { GameMode } from '../engine/types';
import { t } from '../i18n';
import { grantUnlimitedLives } from './lives';
import { S, save } from './save';

export const EVENTS_CACHE_KEY = 'sushijam.events';
export const EVENTS_URL_KEY = 'sushijam.eventsUrl';
export const DEFAULT_EVENTS_URL: string =
  (import.meta.env && (import.meta.env.VITE_EVENTS_URL as string | undefined)) ||
  'https://a9inedev.github.io/sushi-jam/events.json';

export type EventsSource = 'bundled' | 'cache' | 'remote';

const BUNDLED: EventsConfig = (() => {
  const r = validateEvents(bundled);
  if (!r.config) throw new Error('bundled events.json is invalid: ' + r.error);
  return r.config;
})();

let active: EventsConfig = BUNDLED;
let source: EventsSource = 'bundled';
const status: { fetchedAt: number | null; lastResult: string | null; lastError: string | null } = {
  fetchedAt: null,
  lastResult: null,
  lastError: null,
};
/** Injected clock, so tests and the dev panel can move time. */
let clock: () => number = Date.now;

export function setEventsClock(fn: () => number): void {
  clock = fn;
}

export function eventsNow(): number {
  return clock();
}

export function eventsConfig(): EventsConfig {
  return active;
}

export function eventsStatus(): {
  source: EventsSource;
  url: string;
  fetchedAt: number | null;
  lastResult: string | null;
  lastError: string | null;
} {
  return { source, url: eventsUrl(), ...status };
}

export function setEventsConfig(c: EventsConfig, src: EventsSource): void {
  active = c;
  source = src;
  tickEvents(clock());
}

export function resetEvents(): void {
  setEventsConfig(BUNDLED, 'bundled');
}

/* ---------- remote ---------- */

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem(EVENTS_CACHE_KEY);
    return s;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    const s = storage();
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* blocked storage: the config still applies this session */
  }
}

export function eventsUrl(): string {
  return read(EVENTS_URL_KEY) || DEFAULT_EVENTS_URL;
}

export function setEventsUrl(url: string | null): void {
  write(EVENTS_URL_KEY, url);
}

/** Boot: the last validated download for the current URL, applied synchronously. */
export function applyCachedEvents(): boolean {
  const raw = read(EVENTS_CACHE_KEY);
  if (!raw) return false;
  try {
    const e = JSON.parse(raw) as { url?: string; fetchedAt?: number; config?: unknown };
    const v = validateEvents(e.config);
    if (!v.config || e.url !== eventsUrl() || typeof e.fetchedAt !== 'number') throw new Error('bad cache');
    status.fetchedAt = e.fetchedAt;
    setEventsConfig(v.config, 'cache');
    return true;
  } catch {
    write(EVENTS_CACHE_KEY, null);
    return false;
  }
}

/** Fetch, validate, cache and apply. Never throws; anything wrong keeps the current config. */
export async function fetchRemoteEvents(
  opts: { url?: string; timeoutMs?: number; fetchImpl?: typeof fetch | null } = {}
): Promise<string> {
  const f =
    opts.fetchImpl === undefined ? (typeof fetch === 'function' ? fetch.bind(globalThis) : null) : opts.fetchImpl;
  const url = opts.url ?? eventsUrl();
  const done = (r: string, err: string | null = null) => {
    status.lastResult = r;
    status.lastError = err;
    return r;
  };
  if (!f || !url) return done('skipped', 'no fetch available');
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await f(url, { cache: 'no-store', signal: ctrl?.signal });
    if (!res.ok) return done('failed', `HTTP ${res.status}`);
    const v = validateEvents(await res.json());
    if (!v.config) return done('failed', v.error);
    status.fetchedAt = clock();
    write(EVENTS_CACHE_KEY, JSON.stringify({ url, fetchedAt: status.fetchedAt, config: v.config }));
    if (JSON.stringify(v.config) === JSON.stringify(active)) return done('unchanged');
    setEventsConfig(v.config, 'remote');
    return done('applied');
  } catch (e) {
    return done('failed', String((e as Error)?.message || e));
  } finally {
    clearTimeout(timer);
  }
}

export function clearEventsCache(): void {
  write(EVENTS_CACHE_KEY, null);
  resetEvents();
}

/* ---------- progress ---------- */

function entry(def: EventDef): EventProgress {
  let p = S.events[def.id];
  if (!p) {
    p = emptyProgress(def);
    S.events[def.id] = p;
  }
  return p;
}

function finish(def: EventDef, p: EventProgress): void {
  if (p.done) return;
  p.done = true;
  p.progress = def.goal;
  p.goal = def.goal;
  p.name = def.name;
  p.reward = { ...def.rewards };
  sfx.win();
  toast(t('events.complete', { name: def.name }), 3, 0.3);
}

function activeDefs(): EventDef[] {
  const now = clock();
  return active.events.filter((e) => isActive(e, now));
}

/** A level, mode or boss board was won. */
export function eventsOnWin(mode: GameMode): void {
  const pts = POINTS_PER_WIN[mode] || 0;
  if (pts) addSeasonPoints(pts, false);
  if (mode !== 'level') return;
  for (const def of activeDefs())
    if (def.type === 'streak') {
      const p = entry(def);
      if (p.done) continue;
      p.progress = Math.max(p.progress, S.streak);
      if (p.progress >= def.goal) finish(def, p);
    }
}

/** A plate of this colour was eaten. */
export function eventsOnPlate(color: number): void {
  for (const def of activeDefs())
    if (def.type === 'plates' && def.color === color) {
      const p = entry(def);
      if (p.done) continue;
      p.progress++;
      if (p.progress >= def.goal) finish(def, p);
    }
}

export function eventsOnBoss(id: string): void {
  const def = active.events.find((e) => e.id === id);
  if (!def) return;
  finish(def, entry(def));
}

/* ---------- rewards ---------- */

function grant(r: Reward): void {
  if (r.coins) {
    S.coins += r.coins;
    G.coinPop = 1;
  }
  if (r.vip) S.inv.vip += r.vip;
  if (r.takeout) S.inv.takeout += r.takeout;
  if (r.sendback) S.inv.sendback += r.sendback;
  if (r.points) addSeasonPoints(r.points, true);
  if (r.livesMinutes) grantUnlimitedLives(r.livesMinutes);
}

export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(t('events.reward.coins', { n: r.coins }));
  if (r.points) parts.push(t('events.reward.points', { n: r.points }));
  if (r.vip) parts.push(t('events.reward.booster', { n: r.vip, kind: t('booster.vip') }));
  if (r.takeout) parts.push(t('events.reward.booster', { n: r.takeout, kind: t('booster.takeout') }));
  if (r.sendback) parts.push(t('events.reward.booster', { n: r.sendback, kind: t('booster.sendback') }));
  if (r.livesMinutes) parts.push(t('events.reward.lives', { n: r.livesMinutes }));
  return parts.join(' · ');
}

export function claimEvent(id: string): boolean {
  const p = S.events[id];
  if (!p || !p.done || p.claimed) return false;
  const def = active.events.find((e) => e.id === id);
  const reward = p.reward || (def ? def.rewards : null);
  if (!reward) return false;
  p.claimed = true;
  grant(reward);
  save();
  sfx.cash();
  toast(t('events.claimedToast', { name: p.name || (def ? def.name : id), reward: rewardText(reward) }), 2.6);
  return true;
}

/* ---------- season ---------- */

/** Keep the save's season in step with the config: a new season id starts from zero. */
function syncSeason(): void {
  const season = active.season;
  if (!season) return;
  if (S.season.id !== season.id) {
    settleSeason();
    S.season = emptySeason(season.id);
  }
}

/** A season that has ended (or is being replaced) hands over every reached, unclaimed tier at once. */
function settleSeason(): void {
  const season = active.season;
  if (!season || S.season.id !== season.id) return;
  let total: Reward = {};
  let n = 0;
  for (const track of ['free', 'premium'] as const)
    for (const tier of claimableTiers(season, S.season, track)) {
      total = addRewards(total, season.tiers[tier - 1][track]);
      (track === 'free' ? S.season.claimedFree : S.season.claimedPremium).push(tier);
      n++;
    }
  if (n) {
    grant(total);
    save();
    toast(t('events.seasonEnded', { n }), 3.2, 0.3);
  }
}

export function addSeasonPoints(n: number, quiet: boolean): void {
  const season = active.season;
  if (!season || n <= 0) return;
  syncSeason();
  const before = tierOf(S.season.points, season.pointsPerTier, season.tiers.length);
  S.season.points += n;
  const after = tierOf(S.season.points, season.pointsPerTier, season.tiers.length);
  if (after > before && !quiet) {
    sfx.chime();
    toast(t('events.tierUp', { t: after }), 2.4, 0.4);
  }
}

export function claimTier(tier: number, track: 'free' | 'premium'): boolean {
  const season = active.season;
  if (!season) return false;
  syncSeason();
  if (!claimableTiers(season, S.season, track).includes(tier)) return false;
  (track === 'free' ? S.season.claimedFree : S.season.claimedPremium).push(tier);
  const r = season.tiers[tier - 1][track];
  grant(r);
  save();
  sfx.cash();
  toast(t('events.tierClaimed', { t: tier, reward: rewardText(r) }), 2.4);
  return true;
}

/** Claim every tier that is ready on both tracks. Returns how many were claimed. */
export function claimAllTiers(): number {
  const season = active.season;
  if (!season) return 0;
  let n = 0;
  for (const track of ['free', 'premium'] as const)
    for (const tier of claimableTiers(season, S.season, track)) if (claimTier(tier, track)) n++;
  return n;
}

export function seasonSummary(): {
  def: typeof active.season;
  tier: number;
  tiers: number;
  points: number;
  next: number;
  claimable: number;
} | null {
  const season = active.season;
  if (!season) return null;
  syncSeason();
  const tiers = season.tiers.length;
  const tier = tierOf(S.season.points, season.pointsPerTier, tiers);
  const next = tier >= tiers ? 0 : (tier + 1) * season.pointsPerTier - S.season.points;
  const claimable =
    claimableTiers(season, S.season, 'free').length + claimableTiers(season, S.season, 'premium').length;
  return { def: season, tier, tiers, points: S.season.points, next, claimable };
}

/* ---------- tick and views ---------- */

let lastTick = 0;

/** Once a second: expire what is over (rewards intact), settle a season that has ended, sync a new one. */
export function tickEvents(now = clock()): void {
  if (now - lastTick < 1000 && now >= lastTick) return;
  lastTick = now;
  const pruned = pruneProgress(active, S.events, now);
  if (Object.keys(pruned).length !== Object.keys(S.events).length) {
    S.events = pruned;
    save();
  }
  const season = active.season;
  if (season) {
    syncSeason();
    if (isEnded(season, now)) settleSeason();
  }
}

export function eventsView(): ReturnType<typeof visibleEvents> {
  return visibleEvents(active, S.events, clock());
}

/** What the banner and the HUD bar show: a claimable event first, else the soonest-ending active one. */
export function featuredEvent(): ReturnType<typeof visibleEvents>[number] | null {
  const v = eventsView();
  return v[0] || null;
}

/* ---------- boss ---------- */

export function bossDef(id: string): EventDef | null {
  return active.events.find((e) => e.id === id && e.type === 'boss') || null;
}

/** The boss board for an event: a rule-heavy generated level, the same for everyone in the event. */
export function startBoss(id: string): boolean {
  const def = bossDef(id);
  if (!def || !def.level) return false;
  const lv = makeGenerated(def.level, 'all', hashStr('boss:' + def.id) >>> 0);
  G.screen = null;
  G.pending = [];
  newLevelDef({ ...lv, mode: 'boss', modeKey: def.id }, 'boss', def.id);
  return true;
}

export function bossProgressDone(id: string): boolean {
  const p = S.events[id];
  return !!p && p.done;
}

export function currentBossId(): string | null {
  const L = G.L;
  return L && L.mode === 'boss' ? L.modeKey : null;
}
