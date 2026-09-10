/* Save schema, envelope format and migrations. Pure: no storage access, fully unit-tested.

   History
     v1  sushijam.v1   { level, coins, sound }
     v2  sushijam.v2   flat SaveState blob, no version field
     v3  sushijam.save { v: 3, savedAt, sum, data: SaveState }  (checksummed envelope, atomic writes, backup copy)
     v4  same envelope, data gains reduceMotion
     v5  data gains volMusic, volSfx, volUi
     v6  data gains tutorial, colorblind, leftHanded, lang
     v7  data gains puzzleDays, rushBest, rushRuns, zenLevel, zenWins (the side modes); stats carry a mode
     v8  data gains themesSeen and decorRewards (the restaurant journey)
     v9  data gains events (per-event progress) and season (the pass)
     v10 data gains profile, bestStreak and lbQueue (leaderboards and the share card)
     v11 data gains notif (reminder opt-in and per-type switches)
     v12 data gains purchases (granted transaction ids) and starter (offer state); starterShown is folded in
*/

import { hashStr } from '../engine/rng';
import { emptySeason, type EventProgress, type SeasonState } from '../data/events-schema';
import { cleanQueue, type QueuedScore } from './leaderboards-core';
import { cleanPrefs, defaultPrefs, type NotifyPrefs } from './notify-core';
import { cleanStarter, defaultStarter, type StarterState } from './offers-core';
import { cleanPurchases, defaultPurchases, type PurchaseRecord } from './purchases-core';
import { THEMES } from '../data/themes';
import type { MechKind, StatRecord } from '../engine/types';

export const SAVE_VERSION = 12;

export interface Inventory {
  vip: number;
  takeout: number;
  sendback: number;
}

export interface SaveState {
  level: number;
  coins: number;
  streak: number;
  sound: boolean;
  best: number;
  inv: Inventory;
  decor: string[];
  noAds: boolean;
  lastDaily: string;
  dailyStreak: number;
  weekKey: string;
  weekly: number;
  stats: StatRecord[];
  seenMech: MechKind[];
  levelsSinceAd: number;
  devAllMech: boolean;
  demoAds: boolean;
  /** Vibration on seat, grab, jam and clear. Added in v3; older saves default to on. */
  haptics: boolean;
  /** Player-chosen reduce motion. Added in v4; the OS preference is honoured on top of this. */
  reduceMotion: boolean;
  /** Mixer bus volumes 0..1. Added in v5. `sound` stays the master switch. */
  volMusic: number;
  volSfx: number;
  volUi: number;
  /** v6: highest level whose guided tutorial is complete (0..3), accessibility and locale preferences. */
  tutorial: number;
  colorblind: boolean;
  leftHanded: boolean;
  /** Locale code, or empty for automatic. */
  lang: string;
  /** v7: side modes. Calendar days the daily puzzle was won, rush best and runs, zen rung and wins. */
  puzzleDays: string[];
  rushBest: number;
  rushRuns: number;
  zenLevel: number;
  zenWins: number;
  /** v8: restaurants whose reveal has played, and restaurants whose decor set reward was paid. */
  themesSeen: string[];
  decorRewards: string[];
  /** v9: live event progress by event id, and the season pass. */
  events: Record<string, EventProgress>;
  season: SeasonState;
  /** v10: the public name and diner avatar, the best level streak, scores waiting to post. */
  profile: { name: string; avatar: number };
  bestStreak: number;
  lbQueue: QueuedScore[];
  /** v11: reminders. Everything off until the player opts in. */
  notif: NotifyPrefs;
  /** v12: store transactions already granted, and the starter offer's state. */
  purchases: PurchaseRecord;
  starter: StarterState;
}

export function defaultSave(): SaveState {
  return {
    level: 1,
    coins: 300,
    streak: 0,
    sound: true,
    best: 1,
    inv: { vip: 0, takeout: 0, sendback: 0 },
    decor: [],
    noAds: false,
    lastDaily: '',
    dailyStreak: 0,
    weekKey: '',
    weekly: 0,
    stats: [],
    seenMech: [],
    levelsSinceAd: 0,
    devAllMech: false,
    demoAds: true,
    haptics: true,
    reduceMotion: false,
    volMusic: 0.6,
    volSfx: 1,
    volUi: 0.8,
    tutorial: 0,
    colorblind: false,
    leftHanded: false,
    lang: '',
    puzzleDays: [],
    rushBest: 0,
    rushRuns: 0,
    zenLevel: 1,
    zenWins: 0,
    themesSeen: [],
    decorRewards: [],
    events: {},
    season: emptySeason(),
    profile: { name: '', avatar: 0 },
    bestStreak: 0,
    lbQueue: [],
    notif: defaultPrefs(),
    purchases: defaultPurchases(),
    starter: defaultStarter(),
  };
}

export interface SaveEnvelope {
  v: number;
  savedAt: number;
  sum: number;
  data: SaveState;
}

/** FNV-1a over the serialised data. Detects truncation and bit rot, not tampering. */
export function checksum(dataJson: string): number {
  return hashStr(dataJson);
}

/** Build the envelope and its exact serialised form without stringifying the data twice. */
export function envelopeFor(
  state: SaveState,
  savedAt = Date.now()
): { env: SaveEnvelope; json: string; dataJson: string } {
  const dataJson = JSON.stringify(state);
  const sum = checksum(dataJson);
  const env: SaveEnvelope = { v: SAVE_VERSION, savedAt, sum, data: state };
  const json = `{"v":${SAVE_VERSION},"savedAt":${savedAt},"sum":${sum},"data":${dataJson}}`;
  return { env, json, dataJson };
}

/** Parse and verify a stored envelope. Null when missing, malformed, pre-v3, or the checksum does not match. */
export function parseEnvelope(raw: string | null | undefined): SaveEnvelope | null {
  if (!raw) return null;
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!j || typeof j !== 'object') return null;
  const e = j as Partial<SaveEnvelope>;
  if (typeof e.v !== 'number' || e.v < 3 || !e.data || typeof e.data !== 'object') return null;
  if (typeof e.sum !== 'number' || checksum(JSON.stringify(e.data)) !== e.sum) return null;
  return { v: e.v, savedAt: typeof e.savedAt === 'number' ? e.savedAt : 0, sum: e.sum, data: e.data as SaveState };
}

/* ---------- migrations ---------- */

type Blob = Record<string, unknown>;
export type Migration = (data: Blob) => Blob;

/** v1 kept only level, coins and sound. Everything else takes the v2 defaults. */
export function migrateV1toV2(v1: Blob): Blob {
  const d = defaultSave() as unknown as Blob;
  delete d.haptics; // not a v2 field
  return {
    ...d,
    level: typeof v1.level === 'number' && v1.level >= 1 ? v1.level : 1,
    coins: typeof v1.coins === 'number' && v1.coins >= 0 ? v1.coins : 300,
    sound: v1.sound !== false,
  };
}

/** v2 was a flat blob. v3 adds the haptics flag and guarantees every inventory key. */
export function migrateV2toV3(v2: Blob): Blob {
  const inv = (v2.inv && typeof v2.inv === 'object' ? v2.inv : {}) as Partial<Inventory>;
  return {
    ...v2,
    inv: { vip: 0, takeout: 0, sendback: 0, ...inv },
    haptics: typeof v2.haptics === 'boolean' ? v2.haptics : true,
  };
}

/** v4 adds the reduce-motion preference, off by default. */
export function migrateV3toV4(v3: Blob): Blob {
  return { ...v3, reduceMotion: typeof v3.reduceMotion === 'boolean' ? v3.reduceMotion : false };
}

/** v5 adds the three mixer volumes with their defaults. */
export function migrateV4toV5(v4: Blob): Blob {
  const vol = (k: string, def: number) => (typeof v4[k] === 'number' ? (v4[k] as number) : def);
  return { ...v4, volMusic: vol('volMusic', 0.6), volSfx: vol('volSfx', 1), volUi: vol('volUi', 0.8) };
}

/** v6 adds tutorial progress, colour patterns, left-handed layout and language. */
export function migrateV5toV6(v5: Blob): Blob {
  return {
    ...v5,
    tutorial: typeof v5.tutorial === 'number' ? v5.tutorial : 0,
    colorblind: v5.colorblind === true,
    leftHanded: v5.leftHanded === true,
    lang: typeof v5.lang === 'string' ? v5.lang : '',
  };
}

/** v7 adds the side modes' progress. */
export function migrateV6toV7(v6: Blob): Blob {
  const num = (k: string, def: number) => (typeof v6[k] === 'number' ? (v6[k] as number) : def);
  return {
    ...v6,
    puzzleDays: Array.isArray(v6.puzzleDays) ? v6.puzzleDays : [],
    rushBest: num('rushBest', 0),
    rushRuns: num('rushRuns', 0),
    zenLevel: num('zenLevel', 1),
    zenWins: num('zenWins', 0),
  };
}

/** v8 adds the restaurant journey. */
export function migrateV7toV8(v7: Blob): Blob {
  return {
    ...v7,
    themesSeen: Array.isArray(v7.themesSeen) ? v7.themesSeen : [],
    decorRewards: Array.isArray(v7.decorRewards) ? v7.decorRewards : [],
  };
}

/** v9 adds event progress and the season pass. */
export function migrateV8toV9(v8: Blob): Blob {
  return {
    ...v8,
    events: v8.events && typeof v8.events === 'object' ? v8.events : {},
    season: v8.season && typeof v8.season === 'object' ? v8.season : emptySeason(),
  };
}

/** v10 adds the profile, the best streak (seeded from the current one) and the score queue. */
export function migrateV9toV10(v9: Blob): Blob {
  return {
    ...v9,
    profile: { name: '', avatar: 0 },
    bestStreak: typeof v9.streak === 'number' && v9.streak > 0 ? Math.floor(v9.streak) : 0,
    lbQueue: [],
  };
}

/** v11 adds the reminder preferences, all off. */
export function migrateV10toV11(v10: Blob): Blob {
  return { ...v10, notif: v10.notif && typeof v10.notif === 'object' ? v10.notif : defaultPrefs() };
}

/** v12 folds the old starterShown flag into the starter offer state and adds the purchase record. */
export function migrateV11toV12(v11: Blob, now = Date.now()): Blob {
  const { starterShown, ...rest } = v11;
  return {
    ...rest,
    purchases: rest.purchases && typeof rest.purchases === 'object' ? rest.purchases : defaultPurchases(),
    starter:
      rest.starter && typeof rest.starter === 'object'
        ? rest.starter
        : { shows: starterShown === true ? 1 : 0, lastAt: starterShown === true ? now : 0, bought: false },
  };
}

/** Keyed by the version the migration starts from. */
export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
  10: migrateV10toV11,
  11: migrateV11toV12,
};

/** Which schema a parsed blob belongs to, or null if it is not a save at all. */
export function detectVersion(x: unknown): number | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Blob;
  if (typeof o.v === 'number' && o.data && typeof o.data === 'object') return o.v;
  if ('inv' in o || 'stats' in o || 'decor' in o || 'seenMech' in o || 'best' in o) return 2;
  if ('level' in o || 'coins' in o || 'sound' in o) return 1;
  return null;
}

const MECHS: MechKind[] = [
  'wasabi',
  'covered',
  'vip',
  'lock',
  'frozen',
  'double',
  'chain',
  'rush',
  'special',
  'picky',
  'reserved',
  'reverse',
];

/** Coerce any blob into a well-typed SaveState. Bad fields fall back to their defaults, never to garbage. */
export function normalize(x: unknown): SaveState {
  const d = defaultSave();
  const o = (x && typeof x === 'object' ? x : {}) as Blob;
  const int = (k: keyof SaveState, min: number, def: number) => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : def;
  };
  const bool = (k: keyof SaveState, def: boolean) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : def);
  const unit = (k: keyof SaveState, def: number) => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : def;
  };
  const str = (k: keyof SaveState, def: string) => (typeof o[k] === 'string' ? (o[k] as string) : def);
  const invIn = (o.inv && typeof o.inv === 'object' ? o.inv : {}) as Blob;
  const invInt = (k: keyof Inventory) => {
    const v = invIn[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  };
  const level = int('level', 1, d.level);
  const MODES = ['level', 'daily', 'rush', 'zen'];
  const stats = Array.isArray(o.stats)
    ? (o.stats.filter((s) => s && typeof s === 'object') as StatRecord[]).map((s) => ({
        ...s,
        mode: MODES.includes(s.mode as string) ? s.mode : ('level' as const),
      }))
    : [];
  const THEME_IDS: string[] = THEMES.map((t) => t.id);
  const themeList = (k: keyof SaveState) =>
    Array.isArray(o[k])
      ? (o[k] as unknown[]).filter((v): v is string => typeof v === 'string' && THEME_IDS.includes(v))
      : [];
  const dayKeys = Array.isArray(o.puzzleDays)
    ? o.puzzleDays.filter((k): k is string => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k))
    : [];
  return {
    level,
    coins: int('coins', 0, d.coins),
    streak: int('streak', 0, d.streak),
    sound: bool('sound', d.sound),
    best: Math.max(level, int('best', 1, d.best)),
    inv: { vip: invInt('vip'), takeout: invInt('takeout'), sendback: invInt('sendback') },
    decor: Array.isArray(o.decor) ? o.decor.filter((s): s is string => typeof s === 'string') : [],
    noAds: bool('noAds', d.noAds),
    lastDaily: str('lastDaily', d.lastDaily),
    dailyStreak: int('dailyStreak', 0, d.dailyStreak),
    weekKey: str('weekKey', d.weekKey),
    weekly: int('weekly', 0, d.weekly),
    stats: stats.length > 500 ? stats.slice(stats.length - 500) : stats,
    seenMech: Array.isArray(o.seenMech) ? o.seenMech.filter((m): m is MechKind => MECHS.includes(m as MechKind)) : [],
    levelsSinceAd: int('levelsSinceAd', 0, d.levelsSinceAd),
    devAllMech: bool('devAllMech', d.devAllMech),
    demoAds: bool('demoAds', d.demoAds),
    haptics: bool('haptics', d.haptics),
    reduceMotion: bool('reduceMotion', d.reduceMotion),
    volMusic: unit('volMusic', d.volMusic),
    volSfx: unit('volSfx', d.volSfx),
    volUi: unit('volUi', d.volUi),
    tutorial: int('tutorial', 0, d.tutorial),
    colorblind: bool('colorblind', d.colorblind),
    leftHanded: bool('leftHanded', d.leftHanded),
    lang: str('lang', d.lang),
    puzzleDays: dayKeys.length > 400 ? dayKeys.slice(dayKeys.length - 400) : dayKeys,
    rushBest: int('rushBest', 0, d.rushBest),
    rushRuns: int('rushRuns', 0, d.rushRuns),
    zenLevel: int('zenLevel', 1, d.zenLevel),
    zenWins: int('zenWins', 0, d.zenWins),
    themesSeen: themeList('themesSeen'),
    decorRewards: themeList('decorRewards'),
    events: cleanEvents(o.events),
    season: cleanSeason(o.season),
    profile: cleanProfile(o.profile),
    bestStreak: int('bestStreak', 0, d.bestStreak),
    lbQueue: cleanQueue(o.lbQueue),
    notif: cleanPrefs(o.notif),
    purchases: cleanPurchases(o.purchases),
    starter: cleanStarter(o.starter),
  };
}

function cleanProfile(x: unknown): { name: string; avatar: number } {
  const d = { name: '', avatar: 0 };
  if (!x || typeof x !== 'object') return d;
  const p = x as Record<string, unknown>;
  return {
    name: typeof p.name === 'string' ? p.name.trim().slice(0, 16) : d.name,
    avatar:
      typeof p.avatar === 'number' && Number.isInteger(p.avatar) && p.avatar >= 0 && p.avatar < 7 ? p.avatar : d.avatar,
  };
}

function cleanEvents(x: unknown): Record<string, EventProgress> {
  const out: Record<string, EventProgress> = {};
  if (!x || typeof x !== 'object') return out;
  for (const [id, v] of Object.entries(x as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const p = v as Record<string, unknown>;
    if (typeof p.progress !== 'number' || typeof p.goal !== 'number') continue;
    const e: EventProgress = {
      progress: Math.max(0, Math.floor(p.progress)),
      goal: Math.max(1, Math.floor(p.goal)),
      claimed: p.claimed === true,
      done: p.done === true,
    };
    if (typeof p.name === 'string') e.name = p.name;
    if (p.reward && typeof p.reward === 'object') e.reward = p.reward as EventProgress['reward'];
    out[id] = e;
  }
  return out;
}

function cleanSeason(x: unknown): SeasonState {
  const d = emptySeason();
  if (!x || typeof x !== 'object') return d;
  const s = x as Record<string, unknown>;
  const ints = (v: unknown) =>
    Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1) : [];
  return {
    id: typeof s.id === 'string' ? s.id : d.id,
    points: typeof s.points === 'number' && Number.isFinite(s.points) && s.points >= 0 ? Math.floor(s.points) : 0,
    premium: s.premium === true,
    claimedFree: ints(s.claimedFree),
    claimedPremium: ints(s.claimedPremium),
  };
}

/** Bring any known save shape up to the current schema. Null when the input is not a save. */
export function migrate(x: unknown): { state: SaveState; from: number } | null {
  const from = detectVersion(x);
  if (from == null) return null;
  let v = from;
  let data: Blob = from >= 3 ? ((x as SaveEnvelope).data as unknown as Blob) : (x as Blob);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) return null;
    data = m(data);
    v++;
  }
  // A save from a newer build (v > SAVE_VERSION) is read best-effort: known fields survive, unknown ones are dropped.
  return { state: normalize(data), from };
}
