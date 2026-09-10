/* Analytics at runtime: a handful of named events counted per experiment arm in the save, session tracking
   from foreground/background changes, an export for the offline report, and an optional endpoint. Nothing
   leaves the device unless VITE_ANALYTICS_URL is set at build time; the payload carries an anonymous install id
   and counters, never a name.

   Sessions never trigger a save of their own: the open session lives in the save and is written whenever the
   game saves for any other reason, and a session left open by a kill is closed at the next boot with its last
   known activity. Saving on page hide would overwrite a reset or a deliberately corrupted save. */

import { todayKey } from '../engine/util';
import { onAppActive } from '../platform/native';
import { count, SESSION_GAP_MS, report, type Arm, type MetricEvent } from './analytics-core';
import { flags, livesVariant } from './flags';
import { S } from './save';

export const ANALYTICS_URL: string =
  (import.meta.env && (import.meta.env.VITE_ANALYTICS_URL as string | undefined)) || '';

export const analytics = {
  sent: 0,
  lastError: null as string | null,
};

let clock: () => number = Date.now;

export function setAnalyticsClock(fn: () => number): void {
  clock = fn;
}

function enabled(): boolean {
  return flags().analytics.enabled;
}

export function arm(): Arm {
  return livesVariant();
}

/** Record an event against the current arm. */
export function track(name: string, p?: Record<string, string | number>): void {
  if (!enabled()) return;
  const ev: MetricEvent = { t: clock(), name, v: arm() };
  if (p) ev.p = p;
  count(S.metrics, ev, todayKey(new Date(ev.t)));
  if (S.metrics.open) S.metrics.open.lastActiveAt = ev.t;
}

/* ---------- sessions ---------- */

export function startSession(): void {
  const now = clock();
  S.metrics.open = { startedAt: now, lastActiveAt: now, v: arm() };
  track('session_start');
}

/** Close the open session (if any) with its length, against the arm it was played in. */
export function endSession(): void {
  const s = S.metrics.open;
  if (!s) return;
  const seconds = Math.max(0, Math.round((s.lastActiveAt - s.startedAt) / 1000));
  S.metrics.open = null;
  if (enabled())
    count(S.metrics, { t: clock(), name: 'session_end', v: s.v, p: { seconds } }, todayKey(new Date(clock())));
  void flushRemote();
}

/** Called on every activity tick; a long gap since the last activity means a new session. */
export function heartbeat(): void {
  const now = clock();
  const s = S.metrics.open;
  if (!s) {
    startSession();
    return;
  }
  if (now - s.lastActiveAt > SESSION_GAP_MS) {
    endSession();
    startSession();
    return;
  }
  s.lastActiveAt = now;
}

export function initAnalytics(): void {
  // A session left open by a kill or a closed tab ends now, with its last known activity.
  if (S.metrics.open) endSession();
  startSession();
  onAppActive((active) => {
    if (active) heartbeat();
    else endSession();
  });
}

/* ---------- export ---------- */

export function exportAnalytics(): string {
  return JSON.stringify(
    {
      installId: S.installId,
      arm: arm(),
      exportedAt: new Date(clock()).toISOString(),
      metrics: S.metrics,
      report: report(S.metrics),
    },
    null,
    2
  );
}

export function analyticsReport() {
  return report(S.metrics);
}

/** Optional endpoint: the whole export, one POST per session end. */
export async function flushRemote(): Promise<boolean> {
  if (!ANALYTICS_URL || !enabled()) return false;
  try {
    const body = exportAnalytics();
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(ANALYTICS_URL, new Blob([body], { type: 'application/json' }));
      if (ok) analytics.sent++;
      return ok;
    }
    const res = await fetch(ANALYTICS_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (res.ok) analytics.sent++;
    return res.ok;
  } catch (e) {
    analytics.lastError = String((e as Error)?.message || e);
    return false;
  }
}

/** Dev/test: wipe the counters and start a fresh session. */
export function resetAnalytics(): void {
  const open = S.metrics.open;
  S.metrics = { A: { ...S.metrics.A }, B: { ...S.metrics.B }, events: [], open: null };
  for (const armKey of ['A', 'B'] as Arm[]) {
    const a = S.metrics[armKey];
    a.sessions =
      a.sessionSeconds =
      a.levels =
      a.wins =
      a.fails =
      a.retries =
      a.ads =
      a.rewardedAds =
      a.purchases =
      a.livesOut =
        0;
    a.firstDay = a.lastDay = '';
  }
  if (open) startSession();
}
