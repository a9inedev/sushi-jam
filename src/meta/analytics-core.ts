/* Analytics, pure: per-arm counters, the session rule, the three comparison metrics and the decision rule
   the experiment was registered with. Import-free so the save schema and the offline report tool can use it. */

export type Arm = 'A' | 'B';

export interface ArmMetrics {
  sessions: number;
  sessionSeconds: number;
  levels: number;
  wins: number;
  fails: number;
  retries: number;
  ads: number;
  rewardedAds: number;
  purchases: number;
  livesOut: number;
  firstDay: string;
  lastDay: string;
}

export interface MetricEvent {
  t: number;
  name: string;
  v: Arm;
  p?: Record<string, string | number>;
}

export interface OpenSession {
  startedAt: number;
  lastActiveAt: number;
  v: Arm;
}

export interface Metrics {
  A: ArmMetrics;
  B: ArmMetrics;
  events: MetricEvent[];
  /** The session in progress, kept in the save so a kill still ends it at the next boot. */
  open: OpenSession | null;
}

export const EVENT_KEEP = 300;
/** A gap longer than this between activity ends a session. */
export const SESSION_GAP_MS = 5 * 60000;

export function emptyArm(): ArmMetrics {
  return {
    sessions: 0,
    sessionSeconds: 0,
    levels: 0,
    wins: 0,
    fails: 0,
    retries: 0,
    ads: 0,
    rewardedAds: 0,
    purchases: 0,
    livesOut: 0,
    firstDay: '',
    lastDay: '',
  };
}

export function emptyMetrics(): Metrics {
  return { A: emptyArm(), B: emptyArm(), events: [], open: null };
}

export function cleanMetrics(x: unknown): Metrics {
  const d = emptyMetrics();
  if (!x || typeof x !== 'object') return d;
  const o = x as Record<string, unknown>;
  const arm = (v: unknown): ArmMetrics => {
    const a = emptyArm();
    if (!v || typeof v !== 'object') return a;
    const r = v as Record<string, unknown>;
    for (const k of Object.keys(a) as (keyof ArmMetrics)[]) {
      if (k === 'firstDay' || k === 'lastDay') {
        if (typeof r[k] === 'string') a[k] = r[k] as string;
      } else if (typeof r[k] === 'number' && Number.isFinite(r[k]) && (r[k] as number) >= 0) a[k] = r[k] as number;
    }
    return a;
  };
  const events: MetricEvent[] = [];
  if (Array.isArray(o.events))
    for (const e of o.events) {
      if (!e || typeof e !== 'object') continue;
      const r = e as Record<string, unknown>;
      if (typeof r.t !== 'number' || typeof r.name !== 'string' || (r.v !== 'A' && r.v !== 'B')) continue;
      const ev: MetricEvent = { t: r.t, name: r.name, v: r.v };
      if (r.p && typeof r.p === 'object') ev.p = r.p as Record<string, string | number>;
      events.push(ev);
    }
  let open: OpenSession | null = null;
  if (o.open && typeof o.open === 'object') {
    const s = o.open as Record<string, unknown>;
    if (typeof s.startedAt === 'number' && typeof s.lastActiveAt === 'number' && (s.v === 'A' || s.v === 'B'))
      open = { startedAt: s.startedAt, lastActiveAt: s.lastActiveAt, v: s.v };
  }
  return { A: arm(o.A), B: arm(o.B), events: events.slice(-EVENT_KEEP), open };
}

/** Apply one event to the arm's counters. Unknown names are logged but not counted. */
export function count(m: Metrics, ev: MetricEvent, day: string): void {
  const a = m[ev.v];
  if (!a.firstDay) a.firstDay = day;
  a.lastDay = day;
  switch (ev.name) {
    case 'session_end':
      a.sessions++;
      a.sessionSeconds += Number(ev.p?.seconds || 0);
      break;
    case 'level_start':
      a.levels++;
      break;
    case 'win':
      a.wins++;
      break;
    case 'fail':
      a.fails++;
      break;
    case 'retry':
      a.retries++;
      break;
    case 'ad':
      a.ads++;
      if (ev.p?.kind === 'reward') a.rewardedAds++;
      break;
    case 'purchase':
      a.purchases++;
      break;
    case 'lives_out':
      a.livesOut++;
      break;
  }
  m.events.push(ev);
  if (m.events.length > EVENT_KEEP) m.events.splice(0, m.events.length - EVENT_KEEP);
}

export interface ArmReport {
  arm: Arm;
  sessions: number;
  avgSessionMin: number;
  retriesPerFail: number;
  adsPerSession: number;
  failsPerLevel: number;
  livesOut: number;
  days: number;
}

function days(a: ArmMetrics): number {
  if (!a.firstDay || !a.lastDay) return 0;
  return Math.round((Date.parse(a.lastDay) - Date.parse(a.firstDay)) / 86400000) + 1;
}

export function armReport(arm: Arm, a: ArmMetrics): ArmReport {
  const r = (x: number, y: number) => (y > 0 ? +(x / y).toFixed(3) : 0);
  return {
    arm,
    sessions: a.sessions,
    avgSessionMin: r(a.sessionSeconds / 60, a.sessions),
    retriesPerFail: r(a.retries, a.fails),
    adsPerSession: r(a.ads, a.sessions),
    failsPerLevel: r(a.fails, a.levels),
    livesOut: a.livesOut,
    days: days(a),
  };
}

export function report(m: Metrics): { A: ArmReport; B: ArmReport } {
  return { A: armReport('A', m.A), B: armReport('B', m.B) };
}

/** Merge several exports (one per device) into one. */
export function merge(list: Metrics[]): Metrics {
  const out = emptyMetrics();
  for (const m of list)
    for (const arm of ['A', 'B'] as Arm[]) {
      const s = out[arm],
        a = m[arm];
      for (const k of Object.keys(s) as (keyof ArmMetrics)[]) {
        if (k === 'firstDay') s[k] = !s[k] || (a[k] && a[k] < s[k]) ? a[k] : s[k];
        else if (k === 'lastDay') s[k] = a[k] > s[k] ? a[k] : s[k];
        else s[k] += a[k];
      }
    }
  return out;
}

/** The decision rule, registered before any data: B wins only if it keeps players playing and retrying at
    least as long and as often (within 10%) and shows meaningfully more ads; otherwise A; not enough data
    extends the test. */
export const DECISION = {
  minSessionsPerArm: 200,
  minDays: 7,
  sessionRatioMin: 0.9,
  retryRatioMin: 0.9,
  adsRatioMin: 1.2,
};

export interface Decision {
  choice: 'A' | 'B' | 'extend';
  reasons: string[];
  ratios: { session: number; retries: number; ads: number };
}

export function decide(r: { A: ArmReport; B: ArmReport }, rule = DECISION): Decision {
  const ratio = (b: number, a: number) => (a > 0 ? +(b / a).toFixed(3) : 0);
  const ratios = {
    session: ratio(r.B.avgSessionMin, r.A.avgSessionMin),
    retries: ratio(r.B.retriesPerFail, r.A.retriesPerFail),
    ads: ratio(r.B.adsPerSession, r.A.adsPerSession),
  };
  const reasons: string[] = [];
  if (r.A.sessions < rule.minSessionsPerArm || r.B.sessions < rule.minSessionsPerArm)
    reasons.push(`fewer than ${rule.minSessionsPerArm} sessions in an arm (A ${r.A.sessions}, B ${r.B.sessions})`);
  if (Math.max(r.A.days, r.B.days) < rule.minDays)
    reasons.push(`fewer than ${rule.minDays} days of data (${Math.max(r.A.days, r.B.days)})`);
  if (reasons.length) return { choice: 'extend', reasons, ratios };
  const keepsSessions = ratios.session >= rule.sessionRatioMin;
  const keepsRetries = ratios.retries >= rule.retryRatioMin;
  const moreAds = ratios.ads >= rule.adsRatioMin;
  reasons.push(`session length B/A ${ratios.session} (${keepsSessions ? 'holds' : 'drops'})`);
  reasons.push(`retries per fail B/A ${ratios.retries} (${keepsRetries ? 'holds' : 'drops'})`);
  reasons.push(`ads per session B/A ${ratios.ads} (${moreAds ? 'up enough' : 'not up enough'})`);
  return { choice: keepsSessions && keepsRetries && moreAds ? 'B' : 'A', reasons, ratios };
}
