/* Save schema, envelope format and migrations. Pure: no storage access, fully unit-tested.

   History
     v1  sushijam.v1   { level, coins, sound }
     v2  sushijam.v2   flat SaveState blob, no version field
     v3  sushijam.save { v: 3, savedAt, sum, data: SaveState }  (checksummed envelope, atomic writes, backup copy)
*/

import { hashStr } from '../engine/rng';
import type { MechKind, StatRecord } from '../engine/types';

export const SAVE_VERSION = 3;

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
  starterShown: boolean;
  levelsSinceAd: number;
  devAllMech: boolean;
  demoAds: boolean;
  /** Vibration on seat, grab, jam and clear. Added in v3; older saves default to on. */
  haptics: boolean;
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
    starterShown: false,
    levelsSinceAd: 0,
    devAllMech: false,
    demoAds: true,
    haptics: true,
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

/** Keyed by the version the migration starts from. */
export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
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

const MECHS: MechKind[] = ['wasabi', 'covered', 'vip', 'lock', 'frozen', 'double'];

/** Coerce any blob into a well-typed SaveState. Bad fields fall back to their defaults, never to garbage. */
export function normalize(x: unknown): SaveState {
  const d = defaultSave();
  const o = (x && typeof x === 'object' ? x : {}) as Blob;
  const int = (k: keyof SaveState, min: number, def: number) => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : def;
  };
  const bool = (k: keyof SaveState, def: boolean) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : def);
  const str = (k: keyof SaveState, def: string) => (typeof o[k] === 'string' ? (o[k] as string) : def);
  const invIn = (o.inv && typeof o.inv === 'object' ? o.inv : {}) as Blob;
  const invInt = (k: keyof Inventory) => {
    const v = invIn[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  };
  const level = int('level', 1, d.level);
  const stats = Array.isArray(o.stats) ? (o.stats.filter((s) => s && typeof s === 'object') as StatRecord[]) : [];
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
    starterShown: bool('starterShown', d.starterShown),
    levelsSinceAd: int('levelsSinceAd', 0, d.levelsSinceAd),
    devAllMech: bool('devAllMech', d.devAllMech),
    demoAds: bool('demoAds', d.demoAds),
    haptics: bool('haptics', d.haptics),
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
