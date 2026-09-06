/* Where saves live. The local provider is the primary store and is synchronous; cloud providers mirror it
   asynchronously. Game Center and Play Games are stubs until the native plugins arrive (Phase 3.3). */

import { migrate, parseEnvelope, SAVE_VERSION, type SaveEnvelope, type SaveState } from './save-schema';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory stand-in when localStorage is unavailable (private mode, blocked storage, tests). */
export class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(key: string): string | null {
    return this.m.has(key) ? (this.m.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, String(value));
  }
  removeItem(key: string): void {
    this.m.delete(key);
  }
}

export const KEYS = {
  main: 'sushijam.save',
  tmp: 'sushijam.save.tmp',
  bak: 'sushijam.save.bak',
  v2: 'sushijam.v2',
  v1: 'sushijam.v1',
} as const;

export type LoadSource = 'main' | 'tmp' | 'bak' | 'v2' | 'v1' | 'none';

export interface LoadResult {
  state: SaveState | null;
  source: LoadSource;
  /** True when the primary copy was missing or corrupt and a temp or backup copy was used instead. */
  recovered: boolean;
  /** Schema version the data came from when it was not already current, else null. */
  migratedFrom: number | null;
  savedAt: number;
}

export function detectStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__sushijam_probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* fall through */
  }
  return new MemoryStorage();
}

export class LocalSaveProvider {
  readonly id = 'local';
  constructor(private readonly st: StorageLike = detectStorage()) {}

  private readEnv(key: string): SaveEnvelope | null {
    try {
      return parseEnvelope(this.st.getItem(key));
    } catch {
      return null;
    }
  }

  /** Newest valid copy among main, temp and backup; otherwise a migrated legacy blob; otherwise nothing. */
  load(): LoadResult {
    const cands: { env: SaveEnvelope; source: LoadSource }[] = [];
    for (const [key, source] of [
      [KEYS.main, 'main'],
      [KEYS.tmp, 'tmp'],
      [KEYS.bak, 'bak'],
    ] as [string, LoadSource][]) {
      const env = this.readEnv(key);
      if (env) cands.push({ env, source });
    }
    if (cands.length) {
      cands.sort((a, b) => b.env.savedAt - a.env.savedAt);
      const best = cands[0];
      const m = migrate(best.env);
      if (m)
        return {
          state: m.state,
          source: best.source,
          recovered: best.source !== 'main',
          migratedFrom: m.from === SAVE_VERSION ? null : m.from,
          savedAt: best.env.savedAt,
        };
    }
    for (const [key, source] of [
      [KEYS.v2, 'v2'],
      [KEYS.v1, 'v1'],
    ] as [string, LoadSource][]) {
      let raw: string | null;
      try {
        raw = this.st.getItem(key);
      } catch {
        continue;
      }
      if (!raw) continue;
      let j: unknown;
      try {
        j = JSON.parse(raw);
      } catch {
        continue;
      }
      const m = migrate(j);
      if (m) return { state: m.state, source, recovered: false, migratedFrom: m.from, savedAt: 0 };
    }
    return { state: null, source: 'none', recovered: false, migratedFrom: null, savedAt: 0 };
  }

  /** Atomic write: temp, verify, optionally rotate the old main into the backup, promote, drop temp.
      A failure at any step leaves the previous main untouched and, at worst, a newer temp copy that the next
      load will pick up. Returns false when nothing could be written. */
  write(json: string, opts: { rotateBackup: boolean }): boolean {
    try {
      const prevMain = this.st.getItem(KEYS.main);
      this.st.setItem(KEYS.tmp, json);
      if (this.st.getItem(KEYS.tmp) !== json) throw new Error('temp copy did not verify');
      if (prevMain && prevMain !== json && parseEnvelope(prevMain)) {
        const hasBak = !!this.readEnv(KEYS.bak);
        if (opts.rotateBackup || !hasBak) this.st.setItem(KEYS.bak, prevMain);
      }
      this.st.setItem(KEYS.main, json);
      if (this.st.getItem(KEYS.main) !== json) throw new Error('main copy did not verify');
      this.st.removeItem(KEYS.tmp);
      return true;
    } catch {
      return false;
    }
  }

  readMain(): SaveEnvelope | null {
    return this.readEnv(KEYS.main);
  }

  readBackup(): SaveEnvelope | null {
    return this.readEnv(KEYS.bak);
  }

  /** Copy the current main into the backup slot now. */
  rotateBackup(): boolean {
    try {
      const main = this.st.getItem(KEYS.main);
      if (!main || !parseEnvelope(main)) return false;
      this.st.setItem(KEYS.bak, main);
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    for (const k of Object.values(KEYS)) {
      try {
        this.st.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }
}

/* ---------- cloud ---------- */

export interface CloudSaveProvider {
  readonly id: 'gamecenter' | 'playgames';
  readonly label: string;
  /** Signed in and reachable. Stubs always report false. */
  isAvailable(): Promise<boolean>;
  signIn(): Promise<boolean>;
  load(): Promise<SaveEnvelope | null>;
  store(env: SaveEnvelope): Promise<void>;
  remove(): Promise<void>;
}

/** iOS: Game Center saved games (GKSavedGame). Wire through a Capacitor plugin in Phase 3.3. */
export class GameCenterSaveProvider implements CloudSaveProvider {
  readonly id = 'gamecenter' as const;
  readonly label = 'Game Center';
  async isAvailable(): Promise<boolean> {
    return false;
  }
  async signIn(): Promise<boolean> {
    return false;
  }
  async load(): Promise<SaveEnvelope | null> {
    return null;
  }
  async store(): Promise<void> {
    /* not connected */
  }
  async remove(): Promise<void> {
    /* not connected */
  }
}

/** Android: Play Games Services saved games (Snapshots). Wire through a Capacitor plugin in Phase 3.3. */
export class PlayGamesSaveProvider implements CloudSaveProvider {
  readonly id = 'playgames' as const;
  readonly label = 'Play Games';
  async isAvailable(): Promise<boolean> {
    return false;
  }
  async signIn(): Promise<boolean> {
    return false;
  }
  async load(): Promise<SaveEnvelope | null> {
    return null;
  }
  async store(): Promise<void> {
    /* not connected */
  }
  async remove(): Promise<void> {
    /* not connected */
  }
}

export function cloudProviderFor(platform: 'web' | 'ios' | 'android'): CloudSaveProvider | null {
  if (platform === 'ios') return new GameCenterSaveProvider();
  if (platform === 'android') return new PlayGamesSaveProvider();
  return null;
}
