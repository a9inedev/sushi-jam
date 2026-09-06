import { LEGACY_SAVE_KEY, SAVE_KEY } from '../data/constants';
import type { MechKind, StatRecord } from '../engine/types';

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
  };
}

/** The live save. Mutated in place everywhere; persisted with save(). */
export const S: SaveState = defaultSave();

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Apply a stored v2 blob (or a v1 blob) onto the live state. Exported for tests. */
export function applySaved(target: SaveState, v2: unknown, v1: unknown): void {
  if (v2 && typeof v2 === 'object') {
    const j = v2 as Partial<SaveState>;
    Object.assign(target, j);
    target.inv = Object.assign({ vip: 0, takeout: 0, sendback: 0 }, j.inv || {});
    return;
  }
  if (v1 && typeof v1 === 'object') {
    const old = v1 as { level?: number; coins?: number; sound?: boolean };
    target.level = old.level || 1;
    target.coins = old.coins || 300;
    target.sound = old.sound !== false;
  }
}

export function load(): void {
  const st = storage();
  if (!st) return;
  let v2: unknown = null,
    v1: unknown = null;
  try {
    v2 = JSON.parse(st.getItem(SAVE_KEY) || 'null');
  } catch {
    /* corrupt v2 blob: fall through to defaults */
  }
  if (!st.getItem(SAVE_KEY)) {
    try {
      v1 = JSON.parse(st.getItem(LEGACY_SAVE_KEY) || 'null');
    } catch {
      /* ignore */
    }
  }
  applySaved(S, v2, v1);
}

export function save(): void {
  const st = storage();
  if (!st) return;
  try {
    st.setItem(SAVE_KEY, JSON.stringify(S));
  } catch {
    /* quota or private mode: play continues without persistence */
  }
}

export function clearSave(): void {
  const st = storage();
  if (!st) return;
  try {
    st.removeItem(SAVE_KEY);
    st.removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* ignore */
  }
}
