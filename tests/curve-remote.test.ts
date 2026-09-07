/* Remote curve override: cache applied at boot, background fetch with validation, and a safe fallback for
   every failure mode. Uses an in-memory storage and a scripted fetch. */
import { afterEach, describe, expect, it } from 'vitest';
import { bundledCurve, curve, curveSource, resetCurve, type Curve } from '../src/data/curve';
import {
  applyCachedCurve,
  CACHE_KEY,
  clearCurveCache,
  curveStatus,
  curveUrl,
  DEFAULT_CURVE_URL,
  fetchRemoteCurve,
  setCurveUrl,
  type RemoteDeps,
  type StorageLike,
} from '../src/data/curve-remote';
import { clearLevelCache, getLevel } from '../src/engine/levels';

class MemStorage implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

type Reply = { status?: number; body?: unknown; throws?: string; hang?: boolean };
function deps(reply: Reply | null, storage = new MemStorage()): RemoteDeps & { calls: string[] } {
  const calls: string[] = [];
  const fetchImpl = reply
    ? (((url: string, init?: RequestInit) => {
        calls.push(url);
        if (reply.throws) return Promise.reject(new Error(reply.throws));
        if (reply.hang)
          return new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))));
        return Promise.resolve({
          ok: (reply.status ?? 200) < 400,
          status: reply.status ?? 200,
          json: () => Promise.resolve(reply.body),
        });
      }) as unknown as typeof fetch)
    : null;
  return { fetch: fetchImpl, storage, now: () => 1_700_000_000_000, calls };
}

const tuned = (): Curve => {
  const c = JSON.parse(JSON.stringify(bundledCurve())) as Curve;
  c.levels[149].seats = 3;
  return c;
};

afterEach(() => {
  resetCurve();
  clearLevelCache();
});

describe('remote curve', () => {
  it('a valid download is applied, cached, and the next level uses it', async () => {
    const d = deps({ body: tuned() });
    expect(getLevel(150).P.seats).toBe(4);
    expect(await fetchRemoteCurve({ deps: d })).toBe('applied');
    expect(curveSource()).toBe('remote');
    expect(getLevel(150).P.seats).toBe(3);
    expect(d.calls).toEqual([DEFAULT_CURVE_URL]);
    const cached = JSON.parse(d.storage!.getItem(CACHE_KEY) as string);
    expect(cached.url).toBe(DEFAULT_CURVE_URL);
    expect(cached.curve.levels[149].seats).toBe(3);
    expect(curveStatus(d).lastResult).toBe('applied');
  });

  it('the cache is applied synchronously on the next boot before any fetch', async () => {
    const storage = new MemStorage();
    await fetchRemoteCurve({ deps: deps({ body: tuned() }, storage) });
    resetCurve();
    clearLevelCache();
    expect(curveSource()).toBe('bundled');
    expect(applyCachedCurve(deps(null, storage))).toBe(true);
    expect(curveSource()).toBe('cache');
    expect(getLevel(150).P.seats).toBe(3);
  });

  it('a cache for a different URL, or a corrupt one, is ignored', async () => {
    const storage = new MemStorage();
    await fetchRemoteCurve({ deps: deps({ body: tuned() }, storage) });
    resetCurve();
    setCurveUrl('https://example.test/other.json', deps(null, storage));
    expect(curveUrl(deps(null, storage))).toBe('https://example.test/other.json');
    expect(applyCachedCurve(deps(null, storage))).toBe(false);
    setCurveUrl(null, deps(null, storage));
    storage.setItem(CACHE_KEY, '{not json');
    expect(applyCachedCurve(deps(null, storage))).toBe(false);
    expect(storage.getItem(CACHE_KEY)).toBeNull();
    expect(curveSource()).toBe('bundled');
  });

  it('network errors, HTTP errors, timeouts, bad JSON and version mismatches all keep the current curve', async () => {
    const bad: Reply[] = [
      { throws: 'offline' },
      { status: 404, body: {} },
      { hang: true },
      { body: { v: 1, solver: { noise: 0.25, runs: 40, ciRuns: 200 }, levels: [{ n: 1 }] } },
      { body: { ...tuned(), v: 2 } },
      { body: 'garbage' },
    ];
    for (const r of bad) {
      const d = deps(r);
      expect(await fetchRemoteCurve({ deps: d, timeoutMs: 20 }), JSON.stringify(r)).toBe('failed');
      expect(curveSource()).toBe('bundled');
      expect(curve()).toEqual(bundledCurve());
      expect(d.storage!.getItem(CACHE_KEY)).toBeNull();
      expect(curveStatus(d).lastError).toBeTruthy();
    }
    expect(await fetchRemoteCurve({ deps: deps(null) })).toBe('skipped');
  });

  it('a download identical to the active curve reports unchanged and does not rebuild levels', async () => {
    const before = getLevel(150);
    expect(await fetchRemoteCurve({ deps: deps({ body: bundledCurve() }) })).toBe('unchanged');
    expect(curveSource()).toBe('bundled');
    expect(getLevel(150)).toBe(before);
  });

  it('clearCurveCache drops the download and returns to the bundled curve', async () => {
    const storage = new MemStorage();
    await fetchRemoteCurve({ deps: deps({ body: tuned() }, storage) });
    expect(curveSource()).toBe('remote');
    clearCurveCache(deps(null, storage));
    expect(storage.getItem(CACHE_KEY)).toBeNull();
    expect(curveSource()).toBe('bundled');
    expect(getLevel(150).P.seats).toBe(4);
  });
});
