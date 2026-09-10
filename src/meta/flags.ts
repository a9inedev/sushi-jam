/* Remote flags at runtime: bundled defaults, the last validated download applied at boot, a fetch with a
   timeout, a URL override for tests, and a local override for the dev panel. */

import bundled from '../data/flags.json';
import { defaultFlags, validateFlags, variantFor, type Flags, type LivesVariant } from '../data/flags-schema';
import { S } from './save';

export const FLAGS_CACHE_KEY = 'sushijam.flags';
export const FLAGS_URL_KEY = 'sushijam.flagsUrl';
/** Dev override: 'A', 'B' or unset (follow the flag). */
export const LIVES_OVERRIDE_KEY = 'sushijam.livesVariant';
export const DEFAULT_FLAGS_URL: string =
  (import.meta.env && (import.meta.env.VITE_FLAGS_URL as string | undefined)) ||
  'https://a9inedev.github.io/sushi-jam/flags.json';

const BUNDLED: Flags = (() => {
  const r = validateFlags(bundled);
  if (!r.flags) throw new Error('bundled flags.json is invalid: ' + r.error);
  return r.flags;
})();

let active: Flags = BUNDLED;
let source: 'bundled' | 'cache' | 'remote' = 'bundled';
const status: { fetchedAt: number | null; lastResult: string | null; lastError: string | null } = {
  fetchedAt: null,
  lastResult: null,
  lastError: null,
};
const listeners: (() => void)[] = [];

export function flags(): Flags {
  return active;
}

export function flagsStatus() {
  return { source, url: flagsUrl(), ...status };
}

export function onFlagsChange(fn: () => void): void {
  listeners.push(fn);
}

function setFlags(f: Flags, src: typeof source): void {
  active = f;
  source = src;
  for (const l of listeners) l();
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage || null;
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
    /* blocked storage: flags still apply this session */
  }
}

export function flagsUrl(): string {
  return read(FLAGS_URL_KEY) || DEFAULT_FLAGS_URL;
}

export function setFlagsUrl(url: string | null): void {
  write(FLAGS_URL_KEY, url);
}

export function applyCachedFlags(): boolean {
  const raw = read(FLAGS_CACHE_KEY);
  if (!raw) return false;
  try {
    const e = JSON.parse(raw) as { url?: string; fetchedAt?: number; flags?: unknown };
    const v = validateFlags(e.flags);
    if (!v.flags || e.url !== flagsUrl() || typeof e.fetchedAt !== 'number') throw new Error('bad cache');
    status.fetchedAt = e.fetchedAt;
    setFlags(v.flags, 'cache');
    return true;
  } catch {
    write(FLAGS_CACHE_KEY, null);
    return false;
  }
}

export async function fetchRemoteFlags(
  opts: { url?: string; timeoutMs?: number; fetchImpl?: typeof fetch | null } = {}
): Promise<string> {
  const f =
    opts.fetchImpl === undefined ? (typeof fetch === 'function' ? fetch.bind(globalThis) : null) : opts.fetchImpl;
  const url = opts.url ?? flagsUrl();
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
    const v = validateFlags(await res.json());
    if (!v.flags) return done('failed', v.error);
    status.fetchedAt = Date.now();
    write(FLAGS_CACHE_KEY, JSON.stringify({ url, fetchedAt: status.fetchedAt, flags: v.flags }));
    if (JSON.stringify(v.flags) === JSON.stringify(active)) return done('unchanged');
    setFlags(v.flags, 'remote');
    return done('applied');
  } catch (e) {
    return done('failed', String((e as Error)?.message || e));
  } finally {
    clearTimeout(timer);
  }
}

export function clearFlagsCache(): void {
  write(FLAGS_CACHE_KEY, null);
  setFlags(BUNDLED, 'bundled');
}

/* ---------- the lives arm ---------- */

export function livesOverride(): LivesVariant | null {
  const v = read(LIVES_OVERRIDE_KEY);
  return v === 'A' || v === 'B' ? v : null;
}

export function setLivesOverride(v: LivesVariant | null): void {
  write(LIVES_OVERRIDE_KEY, v);
  for (const l of listeners) l();
}

/** The arm this install plays: the dev override, else the flag (a split hashes the install id). */
export function livesVariant(): LivesVariant {
  return livesOverride() || variantFor(active, S.installId);
}

export function livesSettings(): { max: number; refillMinutes: number } {
  return { max: active.lives.max, refillMinutes: active.lives.refillMinutes };
}

export { defaultFlags };
