/* Reminder planning with a fixed clock: nothing without opt-in, the usual play hour, the evening streak nudge,
   the event lead, the prompt rule, and the v11 save field. */
import { describe, expect, it } from 'vitest';
import {
  cleanPrefs,
  defaultPrefs,
  DAY_MS,
  EVENT_LEAD_MS,
  NOTIF_IDS,
  nextAt,
  plan,
  sameLocalDay,
  shouldPrompt,
  usualHour,
  type PlanInput,
} from '../src/meta/notify-core';
import { defaultSave, migrateV10toV11, normalize, SAVE_VERSION } from '../src/meta/save-schema';

// A Thursday at 14:00 local time.
const NOW = new Date(2026, 8, 10, 14, 0, 0).getTime();
const allOn = { asked: true, enabled: true, daily: true, streak: true, events: true };

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    now: NOW,
    prefs: allOn,
    usualHour: 19,
    dailyClaimedToday: false,
    streakLen: 0,
    streakDoneToday: false,
    event: null,
    ...over,
  };
}

function hourOf(ms: number): number {
  return new Date(ms).getHours();
}

describe('usual hour', () => {
  it('falls back until there are enough samples, then picks the most common local hour', () => {
    expect(usualHour([], 19)).toBe(19);
    const at = (h: number, d = 1) => new Date(2026, 8, d, h, 5).getTime();
    expect(usualHour([at(8), at(8), at(21), at(21), at(21)], 19)).toBe(21);
    expect(usualHour([at(8), at(8), at(21)], 19)).toBe(19);
  });

  it('nextAt picks today when the slot is still ahead, else tomorrow', () => {
    const later = nextAt(NOW, 19, 0);
    expect(sameLocalDay(later, NOW)).toBe(true);
    expect(hourOf(later)).toBe(19);
    const passed = nextAt(NOW, 9, 0);
    expect(sameLocalDay(passed, NOW + DAY_MS)).toBe(true);
    const tooClose = nextAt(NOW, 14, 5);
    expect(sameLocalDay(tooClose, NOW + DAY_MS)).toBe(true);
  });
});

describe('plan', () => {
  it('schedules nothing unless the player opted in', () => {
    expect(plan(input({ prefs: defaultPrefs(), streakLen: 3 }))).toEqual([]);
    expect(plan(input({ prefs: { ...allOn, enabled: false }, streakLen: 3 }))).toEqual([]);
  });

  it('daily: at the usual hour today, or tomorrow once today is collected', () => {
    const today = plan(input({ prefs: { ...allOn, streak: false, events: false } }));
    expect(today.map((p) => p.type)).toEqual(['daily']);
    expect(sameLocalDay(today[0].at, NOW)).toBe(true);
    expect(hourOf(today[0].at)).toBe(19);
    const claimed = plan(input({ prefs: { ...allOn, streak: false, events: false }, dailyClaimedToday: true }));
    expect(sameLocalDay(claimed[0].at, NOW + DAY_MS)).toBe(true);
    expect(plan(input({ prefs: { ...allOn, daily: false, streak: false, events: false } }))).toEqual([]);
  });

  it('streak: this evening while something is still due, tomorrow evening when today is done, never for no streak', () => {
    const due = plan(input({ prefs: { ...allOn, daily: false, events: false }, streakLen: 4 }));
    expect(due.map((p) => [p.type, p.n])).toEqual([['streak', 4]]);
    expect(sameLocalDay(due[0].at, NOW)).toBe(true);
    expect(hourOf(due[0].at)).toBe(20);
    const done = plan(input({ prefs: { ...allOn, daily: false, events: false }, streakLen: 4, streakDoneToday: true }));
    expect(sameLocalDay(done[0].at, NOW + DAY_MS)).toBe(true);
    expect(plan(input({ prefs: { ...allOn, daily: false, events: false }, streakLen: 0 }))).toEqual([]);
    // Evening already passed and today not done: nothing useful to say.
    const late = new Date(2026, 8, 10, 22, 0).getTime();
    expect(plan(input({ now: late, prefs: { ...allOn, daily: false, events: false }, streakLen: 4 }))).toEqual([]);
  });

  it('event: three hours before the end, only with room left and enough lead', () => {
    const prefs = { ...allOn, daily: false, streak: false };
    const ev = { id: 'e', name: 'Salmon rush', end: NOW + 2 * DAY_MS, progress: 3, goal: 10 };
    const p = plan(input({ prefs, event: ev }));
    expect(p).toEqual([
      { id: NOTIF_IDS.event, type: 'event', at: ev.end - EVENT_LEAD_MS, eventId: 'e', eventName: 'Salmon rush' },
    ]);
    expect(plan(input({ prefs, event: { ...ev, end: NOW + 3600000 } }))).toEqual([]);
    expect(plan(input({ prefs, event: { ...ev, progress: 10 } }))).toEqual([]);
    expect(plan(input({ prefs: { ...prefs, events: false }, event: ev }))).toEqual([]);
  });

  it('uses one stable id per type', () => {
    const all = plan(input({ streakLen: 2, event: { id: 'e', name: 'x', end: NOW + DAY_MS, progress: 1, goal: 5 } }));
    expect(all.map((p) => p.id)).toEqual([NOTIF_IDS.daily, NOTIF_IDS.streak, NOTIF_IDS.event]);
    expect(all.every((p) => p.at > NOW)).toBe(true);
  });
});

describe('prompt rule', () => {
  it('asks once, after level 10, never on the first launch, only where reminders exist', () => {
    const fresh = defaultPrefs();
    expect(shouldPrompt(fresh, 9, false, true)).toBe(false);
    expect(shouldPrompt(fresh, 10, false, true)).toBe(true);
    expect(shouldPrompt(fresh, 10, true, true)).toBe(false);
    expect(shouldPrompt(fresh, 10, false, false)).toBe(false);
    expect(shouldPrompt({ ...fresh, asked: true }, 30, false, true)).toBe(false);
  });
});

describe('save v11', () => {
  it('adds the reminder preferences, all off, and cleans them', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(11);
    const v10 = { ...(defaultSave() as unknown as Record<string, unknown>) };
    delete v10.notif;
    const v11 = migrateV10toV11(v10);
    expect(v11.notif).toEqual(defaultPrefs());
    const s = normalize({ ...v11, notif: { asked: true, enabled: 'yes', daily: true } });
    expect(s.notif).toEqual({ asked: true, enabled: false, daily: true, streak: false, events: false });
    expect(cleanPrefs('junk')).toEqual(defaultPrefs());
  });
});
