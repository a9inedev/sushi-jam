/* Remote override for the difficulty curve. At boot the last validated download is applied from the cache
   synchronously (so the first level already uses it), then a fresh copy is fetched in the background with a
   timeout. Anything that fails validation, times out or errors leaves the current curve in place. Tuning
   therefore changes on the launch after a new curve.json is published, without an app update. */

import { bundledCurve, curve, curveSource, resetCurve, sameCurve, setCurve, validateCurve, type Curve } from './curve';

export const CACHE_KEY = 'sushijam.curve';
/** Dev override for the URL (set through the dev API or by tests); absent in normal play. */
export const URL_KEY = 'sushijam.curveUrl';
export const DEFAULT_CURVE_URL: string =
  (import.meta.env && (import.meta.env.VITE_CURVE_URL as string | undefined)) ||
  'https://a9inedev.github.io/sushi-jam/curve.json';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RemoteDeps {
  fetch: typeof fetch | null;
  storage: StorageLike | null;
  now: () => number;
}

export type RemoteResult = 'applied' | 'unchanged' | 'failed' | 'skipped';

export interface CurveStatus {
  source: string;
  url: string;
  fetchedAt: number | null;
  lastResult: RemoteResult | null;
  lastError: string | null;
}

interface CacheEntry {
  url: string;
  fetchedAt: number;
  curve: Curve;
}

const status: { fetchedAt: number | null; lastResult: RemoteResult | null; lastError: string | null } = {
  fetchedAt: null,
  lastResult: null,
  lastError: null,
};

function safeStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem(CACHE_KEY);
    return s;
  } catch {
    return null;
  }
}

export function defaultDeps(): RemoteDeps {
  return {
    fetch: typeof fetch === 'function' ? fetch.bind(globalThis) : null,
    storage: safeStorage(),
    now: Date.now,
  };
}

function read(storage: StorageLike | null, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function write(storage: StorageLike | null, key: string, value: string | null): void {
  try {
    if (!storage) return;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    /* storage full or blocked: the curve still applies for this session */
  }
}

export function curveUrl(deps: RemoteDeps = defaultDeps()): string {
  return read(deps.storage, URL_KEY) || DEFAULT_CURVE_URL;
}

export function setCurveUrl(url: string | null, deps: RemoteDeps = defaultDeps()): void {
  write(deps.storage, URL_KEY, url);
}

function readCache(deps: RemoteDeps): CacheEntry | null {
  const raw = read(deps.storage, CACHE_KEY);
  if (!raw) return null;
  try {
    const e = JSON.parse(raw) as Partial<CacheEntry>;
    const v = validateCurve(e.curve);
    if (!v.curve || typeof e.url !== 'string' || typeof e.fetchedAt !== 'number') throw new Error('bad cache');
    return { url: e.url, fetchedAt: e.fetchedAt, curve: v.curve };
  } catch {
    write(deps.storage, CACHE_KEY, null);
    return null;
  }
}

/** Boot step: apply the cached download for the current URL, if any. Synchronous. */
export function applyCachedCurve(deps: RemoteDeps = defaultDeps()): boolean {
  const c = readCache(deps);
  if (!c || c.url !== curveUrl(deps)) return false;
  status.fetchedAt = c.fetchedAt;
  if (sameCurve(c.curve, bundledCurve())) return false;
  setCurve(c.curve, 'cache');
  return true;
}

/** Fetch, validate, cache and apply. Never throws; the current curve stays on any failure. */
export async function fetchRemoteCurve(
  opts: { url?: string; timeoutMs?: number; deps?: RemoteDeps } = {}
): Promise<RemoteResult> {
  const deps = opts.deps ?? defaultDeps();
  const url = opts.url ?? curveUrl(deps);
  const done = (r: RemoteResult, err: string | null = null): RemoteResult => {
    status.lastResult = r;
    status.lastError = err;
    return r;
  };
  if (!deps.fetch || !url) return done('skipped', 'no fetch available');
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await deps.fetch(url, { cache: 'no-store', signal: ctrl?.signal });
    if (!res.ok) return done('failed', `HTTP ${res.status}`);
    const v = validateCurve(await res.json());
    if (!v.curve) return done('failed', v.error);
    status.fetchedAt = deps.now();
    write(deps.storage, CACHE_KEY, JSON.stringify({ url, fetchedAt: status.fetchedAt, curve: v.curve }));
    if (sameCurve(v.curve, curve())) return done('unchanged');
    setCurve(v.curve, 'remote');
    return done('applied');
  } catch (e) {
    return done('failed', String((e as Error)?.message || e));
  } finally {
    clearTimeout(timer);
  }
}

export function curveStatus(deps: RemoteDeps = defaultDeps()): CurveStatus {
  return { source: curveSource(), url: curveUrl(deps), ...status };
}

/** Drop the cached download and go back to the bundled curve. */
export function clearCurveCache(deps: RemoteDeps = defaultDeps()): void {
  write(deps.storage, CACHE_KEY, null);
  status.fetchedAt = null;
  status.lastResult = null;
  status.lastError = null;
  resetCurve();
}
