/* Reminder planning, pure. Decides when (and whether) each of the three reminders should fire, from the
   player's habits and state, without touching the platform, the save or the clock. */

export type NotifyType = 'daily' | 'streak' | 'event';

/** Stable notification ids: one slot per type, so a reschedule replaces rather than piles up. */
export const NOTIF_IDS: Record<NotifyType, number> = { daily: 1001, streak: 1002, event: 1003 };

export const DAY_MS = 86400000;
/** Never schedule anything closer than this; a reminder seconds away is noise. */
export const MIN_LEAD_MS = 15 * 60000;
/** The streak reminder's evening slot. */
export const STREAK_HOUR = 20,
  STREAK_MINUTE = 30;
/** Event reminders fire this long before the end. */
export const EVENT_LEAD_MS = 3 * 3600000;

export interface NotifyPrefs {
  asked: boolean;
  enabled: boolean;
  daily: boolean;
  streak: boolean;
  events: boolean;
}

export function defaultPrefs(): NotifyPrefs {
  return { asked: false, enabled: false, daily: false, streak: false, events: false };
}

export interface PlanInput {
  now: number;
  prefs: NotifyPrefs;
  /** Local hour (0-23) the player usually plays at. */
  usualHour: number;
  /** Today's daily bonus already collected. */
  dailyClaimedToday: boolean;
  /** Length of the streak that would break tonight (login or puzzle), 0 when there is none to protect. */
  streakLen: number;
  /** Everything the streak needs today is done. */
  streakDoneToday: boolean;
  /** An active event the player has progress in, or null. */
  event: { id: string; name: string; end: number; progress: number; goal: number } | null;
}

export interface Planned {
  id: number;
  type: NotifyType;
  at: number;
  eventId?: string;
  eventName?: string;
  n?: number;
}

/** The hour the player most often plays at, from timestamps; the fallback until there are enough. */
export function usualHour(stamps: number[], fallback = 19, minSamples = 5): number {
  const recent = stamps.filter((s) => Number.isFinite(s) && s > 0).slice(-60);
  if (recent.length < minSamples) return fallback;
  const count = new Array<number>(24).fill(0);
  for (const s of recent) count[new Date(s).getHours()]++;
  let best = fallback,
    n = -1;
  for (let h = 0; h < 24; h++)
    if (count[h] > n) {
      n = count[h];
      best = h;
    }
  return best;
}

function atLocal(now: number, hour: number, minute: number, dayOffset: number): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.getTime();
}

export function sameLocalDay(a: number, b: number): boolean {
  const x = new Date(a),
    y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Today at hour:minute if it is still at least the lead away, else tomorrow. */
export function nextAt(now: number, hour: number, minute: number, lead = MIN_LEAD_MS): number {
  const today = atLocal(now, hour, minute, 0);
  return today >= now + lead ? today : atLocal(now, hour, minute, 1);
}

/** The reminders that should be scheduled right now. Empty unless the player opted in. */
export function plan(input: PlanInput): Planned[] {
  const { now, prefs } = input;
  const out: Planned[] = [];
  if (!prefs.enabled) return out;
  if (prefs.daily) {
    let at = nextAt(now, Math.max(0, Math.min(23, Math.round(input.usualHour))), 0);
    if (input.dailyClaimedToday && sameLocalDay(at, now)) at += DAY_MS;
    out.push({ id: NOTIF_IDS.daily, type: 'daily', at });
  }
  if (prefs.streak && input.streakLen > 0) {
    let at = nextAt(now, STREAK_HOUR, STREAK_MINUTE);
    if (input.streakDoneToday) {
      if (sameLocalDay(at, now)) at += DAY_MS;
      out.push({ id: NOTIF_IDS.streak, type: 'streak', at, n: input.streakLen });
    } else if (sameLocalDay(at, now)) {
      out.push({ id: NOTIF_IDS.streak, type: 'streak', at, n: input.streakLen });
    }
    // Not done today and the evening slot has passed: too late for a useful nudge, nothing is scheduled.
  }
  if (prefs.events && input.event) {
    const at = input.event.end - EVENT_LEAD_MS;
    if (at >= now + MIN_LEAD_MS && input.event.progress < input.event.goal)
      out.push({ id: NOTIF_IDS.event, type: 'event', at, eventId: input.event.id, eventName: input.event.name });
  }
  return out;
}

/** The opt-in prompt: once, after level 10 is cleared, never in the session that created the save. */
export function shouldPrompt(
  prefs: NotifyPrefs,
  clearedLevel: number,
  firstLaunch: boolean,
  available: boolean
): boolean {
  return available && !prefs.asked && !firstLaunch && clearedLevel >= 10;
}

export function cleanPrefs(x: unknown): NotifyPrefs {
  const d = defaultPrefs();
  if (!x || typeof x !== 'object') return d;
  const p = x as Record<string, unknown>;
  const b = (k: keyof NotifyPrefs) => (typeof p[k] === 'boolean' ? (p[k] as boolean) : d[k]);
  return { asked: b('asked'), enabled: b('enabled'), daily: b('daily'), streak: b('streak'), events: b('events') };
}
