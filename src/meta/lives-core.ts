/* The lives model, pure: a stock that loses one per fail and refills one per interval, with a timed
   "unlimited" window events can grant. Import-free so the save schema can use it. */

export interface LivesState {
  n: number;
  max: number;
  /** When the refill clock last advanced (ms). */
  lastAt: number;
  /** Unlimited lives until this time (ms), 0 when none. */
  unlimitedUntil: number;
}

export function defaultLives(max = 5): LivesState {
  return { n: max, max, lastAt: 0, unlimitedUntil: 0 };
}

export function cleanLives(x: unknown, max = 5): LivesState {
  const d = defaultLives(max);
  if (!x || typeof x !== 'object') return d;
  const s = x as Record<string, unknown>;
  const num = (v: unknown, lo: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo ? v : fallback;
  const m = Math.max(1, Math.floor(num(s.max, 1, d.max)));
  return {
    n: Math.min(m, Math.floor(num(s.n, 0, m))),
    max: m,
    lastAt: num(s.lastAt, 0, 0),
    unlimitedUntil: num(s.unlimitedUntil, 0, 0),
  };
}

export function isUnlimited(st: LivesState, now: number): boolean {
  return st.unlimitedUntil > now;
}

/** Advance the refill clock: one life per interval since lastAt, up to max. Full stock parks the clock at now. */
export function refill(st: LivesState, now: number, refillMs: number): LivesState {
  const max = st.max;
  if (st.n >= max) return { ...st, n: max, lastAt: now };
  if (st.lastAt <= 0 || now < st.lastAt) return { ...st, lastAt: now };
  const gained = Math.floor((now - st.lastAt) / refillMs);
  if (gained <= 0) return st;
  const n = Math.min(max, st.n + gained);
  return { ...st, n, lastAt: n >= max ? now : st.lastAt + gained * refillMs };
}

/** A fail. Unlimited windows cost nothing. Losing the first life starts the refill clock. */
export function lose(st: LivesState, now: number, refillMs: number): LivesState {
  const r = refill(st, now, refillMs);
  if (isUnlimited(r, now) || r.n <= 0) return r;
  return { ...r, n: r.n - 1, lastAt: r.n === r.max ? now : r.lastAt };
}

export function canPlay(st: LivesState, now: number, refillMs: number): boolean {
  return isUnlimited(st, now) || refill(st, now, refillMs).n > 0;
}

/** Milliseconds until the next life, 0 when full or unlimited. */
export function nextLifeIn(st: LivesState, now: number, refillMs: number): number {
  if (isUnlimited(st, now)) return 0;
  const r = refill(st, now, refillMs);
  if (r.n >= r.max) return 0;
  return Math.max(0, r.lastAt + refillMs - now);
}

export function addLives(st: LivesState, k: number, now: number, refillMs: number): LivesState {
  const r = refill(st, now, refillMs);
  const n = Math.min(r.max, r.n + k);
  return { ...r, n, lastAt: n >= r.max ? now : r.lastAt };
}

export function grantUnlimited(st: LivesState, minutes: number, now: number): LivesState {
  const from = Math.max(now, st.unlimitedUntil);
  return { ...st, unlimitedUntil: from + minutes * 60000 };
}

/** Change the configured maximum (a flag change), keeping the stock in range. */
export function withMax(st: LivesState, max: number): LivesState {
  const wasFull = st.n >= st.max;
  return { ...st, max, n: wasFull ? max : Math.min(max, st.n) };
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60),
    sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
