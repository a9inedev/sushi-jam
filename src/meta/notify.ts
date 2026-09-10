/* Reminders at runtime: the opt-in prompt (once, after level 10, never on the first launch), the per-type
   switches, rescheduling from the current state whenever it changes, and the deep link a tapped reminder
   opens. Nothing is ever scheduled unless the player opted in and the system permission is granted. */

import { eventName } from '../data/events-schema';
import { puzzleStreak } from '../engine/modes-core';
import { G, toast } from '../engine/state';
import { todayKey, yesterdayKey } from '../engine/util';
import { locale, t } from '../i18n';
import { onAppActive } from '../platform/native';
import { notifyBackend, webNotify, type NotifyItem, type Permission } from '../platform/notifications';
import { checkDaily } from './daily';
import { eventsNow, eventsView } from './events';
import { NOTIF_IDS, plan, shouldPrompt, usualHour, type NotifyType, type Planned } from './notify-core';
import { loadInfo, S, save } from './save';

export const notify = {
  permission: 'prompt' as Permission,
  /** What the last reschedule handed to the platform. */
  scheduled: [] as Planned[],
  firstLaunch: false,
  lastError: null as string | null,
  busy: false,
};

export function notifyAvailable(): boolean {
  return notifyBackend.kind === 'native' || notifyBackend === webNotify;
}

function planInput() {
  const today = todayKey(),
    yesterday = yesterdayKey();
  const loginStreak = S.lastDaily === today || S.lastDaily === yesterday ? S.dailyStreak || 0 : 0;
  const puzzle = Math.max(puzzleStreak(S.puzzleDays, today), puzzleStreak(S.puzzleDays, yesterday));
  const loginNeeds = loginStreak >= 2,
    puzzleNeeds = puzzle >= 2;
  const streakLen = Math.max(loginNeeds ? loginStreak : 0, puzzleNeeds ? puzzle : 0);
  const streakDoneToday = (!loginNeeds || S.lastDaily === today) && (!puzzleNeeds || S.puzzleDays.includes(today));
  const ev = eventsView().find((v) => v.active && v.def && v.state.progress > 0 && !v.state.done);
  return {
    now: eventsNow(),
    prefs: S.notif,
    usualHour: usualHour(S.stats.map((s) => s.ts)),
    dailyClaimedToday: S.lastDaily === today,
    streakLen,
    streakDoneToday,
    event:
      ev && ev.def
        ? {
            id: ev.id,
            name: eventName(ev.def, locale() || 'en'),
            end: ev.def.end,
            progress: ev.state.progress,
            goal: ev.state.goal,
          }
        : null,
  };
}

function toItem(p: Planned): NotifyItem {
  const title =
    p.type === 'daily'
      ? t('notify.dailyTitle')
      : p.type === 'streak'
        ? t('notify.streakTitle')
        : t('notify.eventTitle', { name: p.eventName || '' });
  const body =
    p.type === 'daily'
      ? t('notify.dailyBody', { n: (S.dailyStreak || 0) + 1 })
      : p.type === 'streak'
        ? t('notify.streakBody', { n: p.n || 0 })
        : t('notify.eventBody');
  return { id: p.id, title, body, at: p.at, extra: { type: p.type, eventId: p.eventId || null } };
}

/** Cancel everything and schedule what the current state calls for. Safe to call often. */
export async function reschedule(): Promise<Planned[]> {
  if (notify.busy) return notify.scheduled;
  notify.busy = true;
  try {
    await notifyBackend.cancelAll();
    if (!S.notif.enabled || notify.permission !== 'granted') {
      notify.scheduled = [];
      return notify.scheduled;
    }
    const items = plan(planInput());
    await notifyBackend.schedule(items.map(toItem));
    notify.scheduled = items;
    notify.lastError = null;
  } catch (e) {
    notify.lastError = String((e as Error)?.message || e);
  } finally {
    notify.busy = false;
  }
  return notify.scheduled;
}

/* ---------- opt-in ---------- */

/** After a level win: queue the prompt if it is time for it. */
export function maybeQueuePrompt(clearedLevel: number): boolean {
  if (!shouldPrompt(S.notif, clearedLevel, notify.firstLaunch, notifyAvailable())) return false;
  G.pending.push(() => {
    G.screen = { type: 'notify', t: 0 };
  });
  return true;
}

export async function optIn(): Promise<boolean> {
  S.notif.asked = true;
  save();
  try {
    notify.permission = await notifyBackend.request();
  } catch (e) {
    notify.permission = 'denied';
    notify.lastError = String((e as Error)?.message || e);
  }
  const ok = notify.permission === 'granted';
  S.notif.enabled = ok;
  S.notif.daily = ok;
  S.notif.streak = ok;
  S.notif.events = ok;
  save();
  toast(ok ? t('notify.enabled') : t('notify.denied'), 2.6);
  await reschedule();
  return ok;
}

export function declinePrompt(): void {
  S.notif.asked = true;
  S.notif.enabled = false;
  save();
}

export async function setEnabled(on: boolean): Promise<void> {
  S.notif.asked = true;
  if (on && notify.permission !== 'granted') {
    await optIn();
    return;
  }
  S.notif.enabled = on;
  if (on && !S.notif.daily && !S.notif.streak && !S.notif.events)
    S.notif.daily = S.notif.streak = S.notif.events = true;
  save();
  await reschedule();
}

export async function setType(type: NotifyType, on: boolean): Promise<void> {
  const key = type === 'event' ? 'events' : type;
  S.notif[key] = on;
  if (on && !S.notif.enabled) {
    await setEnabled(true);
    return;
  }
  save();
  await reschedule();
}

/* ---------- deep links ---------- */

/** Where a tapped reminder lands: the bonus if it is uncollected, else the map's Modes tab; events open Events. */
export function openDeepLink(type: string): string {
  const go = () => {
    G.pending = [];
    if (type === 'event') {
      G.screen = { type: 'events', t: 0, back: null };
      return 'events';
    }
    if (type === 'daily' && S.lastDaily !== todayKey()) {
      G.screen = null;
      checkDaily();
      return 'daily';
    }
    G.screen = { type: 'map', tab: 'modes', t: 0 };
    return 'modes';
  };
  if (!G.L) {
    setTimeout(go, 0);
    return 'deferred';
  }
  return go();
}

export function initNotifications(): void {
  notify.firstLaunch = loadInfo.source === 'none';
  notifyBackend.onTap((extra) => {
    openDeepLink(String(extra.type || ''));
  });
  notifyBackend
    .check()
    .then((p) => {
      notify.permission = p;
      return reschedule();
    })
    .catch((e) => {
      notify.lastError = String((e as Error)?.message || e);
    });
  onAppActive(() => void reschedule());
}

/** Dev/test: pretend the reminder of this type was tapped (web backend only). */
export function simulateTap(type: NotifyType): boolean {
  return webNotify.simulateTap(NOTIF_IDS[type]);
}
