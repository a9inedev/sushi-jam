/* Events and the season pass as data, driven by a fake clock: validation, what is visible when, how progress
   and claims behave, that expired events disappear and rewards never do, and the season settlement. */
import { describe, expect, it } from 'vitest';
import {
  claimableTiers,
  emptyProgress,
  emptySeason,
  formatCountdown,
  pruneProgress,
  tierOf,
  validateEvents,
  visibleEvents,
  type EventProgress,
  type EventsConfig,
} from '../src/data/events-schema';
import bundled from '../src/data/events.json';
import { defaultSave, migrateV8toV9, normalize, SAVE_VERSION } from '../src/meta/save-schema';

const DAY = 86400000;
const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);

function config(over: Partial<{ events: unknown[]; season: unknown }> = {}): EventsConfig {
  const raw = {
    v: 1,
    events: over.events ?? [
      {
        id: 'streak-a',
        type: 'streak',
        name: 'Hot streak',
        start: new Date(T0 - DAY).toISOString(),
        end: new Date(T0 + DAY).toISOString(),
        goal: 3,
        rewards: { coins: 100, points: 20 },
      },
      {
        id: 'salmon',
        type: 'plates',
        name: 'Salmon rush',
        color: 0,
        start: new Date(T0 - DAY).toISOString(),
        end: new Date(T0 + 2 * DAY).toISOString(),
        goal: 5,
        rewards: { coins: 50 },
      },
      {
        id: 'boss-w',
        type: 'boss',
        name: 'Boss weekend',
        level: 40,
        start: new Date(T0 + DAY).toISOString(),
        end: new Date(T0 + 3 * DAY).toISOString(),
        goal: 1,
        rewards: { vip: 1, points: 50 },
      },
    ],
    season:
      over.season === undefined
        ? {
            id: 's1',
            name: 'Season one',
            start: new Date(T0 - 10 * DAY).toISOString(),
            end: new Date(T0 + 20 * DAY).toISOString(),
            pointsPerTier: 100,
            tiers: Array.from({ length: 30 }, (_, i) => ({
              free: { coins: 50 + i * 10 },
              premium: { coins: 100 + i * 20 },
            })),
          }
        : over.season,
  };
  const v = validateEvents(raw);
  if (!v.config) throw new Error(v.error || 'invalid');
  return v.config;
}

describe('events.json', () => {
  it('the bundled file validates and has a 30-tier season with two tracks', () => {
    const v = validateEvents(bundled);
    expect(v.error).toBeNull();
    expect(v.config?.season?.tiers.length).toBe(30);
    expect(v.config?.events.length).toBeGreaterThanOrEqual(3);
    expect(new Set(v.config?.events.map((e) => e.type))).toEqual(new Set(['streak', 'plates', 'boss']));
  });

  it('rejects broken definitions with a reason', () => {
    const base = config();
    const bad = (mut: (o: Record<string, unknown>) => void, re: RegExp) => {
      const raw = JSON.parse(JSON.stringify({ v: 1, events: base.events, season: base.season })) as Record<
        string,
        unknown
      >;
      mut(raw);
      const r = validateEvents(raw);
      expect(r.config).toBeNull();
      expect(r.error).toMatch(re);
    };
    bad((o) => (o.v = 2), /version/);
    bad((o) => ((o.events as Record<string, unknown>[])[0].end = 'nope'), /start\/end/);
    bad((o) => ((o.events as Record<string, unknown>[])[1].color = 9), /colour/);
    bad((o) => ((o.events as Record<string, unknown>[])[0].rewards = {}), /rewards/);
    bad((o) => ((o.events as Record<string, unknown>[])[1].id = 'streak-a'), /duplicate/);
    bad((o) => ((o.season as Record<string, unknown>).tiers = []), /tiers/);
    bad((o) => ((o.events as Record<string, unknown>[])[2].level = 0), /level/);
  });
});

describe('visibility over time', () => {
  it('shows active events, hides future and expired ones, keeps finished-unclaimed ones claimable forever', () => {
    const cfg = config();
    const none: Record<string, EventProgress> = {};
    expect(visibleEvents(cfg, none, T0).map((v) => v.id)).toEqual(['streak-a', 'salmon']);
    expect(visibleEvents(cfg, none, T0 + 1.5 * DAY).map((v) => v.id)).toEqual(['salmon', 'boss-w']);
    expect(visibleEvents(cfg, none, T0 + 5 * DAY)).toEqual([]);
    // Finished but unclaimed: still there after the end, listed first.
    const done: Record<string, EventProgress> = {
      'streak-a': {
        progress: 3,
        goal: 3,
        claimed: false,
        done: true,
        name: 'Hot streak',
        reward: { coins: 100, points: 20 },
      },
    };
    const late = visibleEvents(cfg, done, T0 + 5 * DAY);
    expect(late.map((v) => [v.id, v.claimable, v.active])).toEqual([['streak-a', true, false]]);
    // Even when the definition is gone from the JSON.
    const gone = visibleEvents(config({ events: [] }), done, T0 + 5 * DAY);
    expect(gone[0].def).toBeNull();
    expect(gone[0].state.reward).toEqual({ coins: 100, points: 20 });
  });

  it('prunes expired unfinished and claimed progress, never finished-unclaimed', () => {
    const cfg = config();
    const progress: Record<string, EventProgress> = {
      'streak-a': { progress: 2, goal: 3, claimed: false, done: false },
      salmon: { progress: 5, goal: 5, claimed: false, done: true, name: 'Salmon rush', reward: { coins: 50 } },
      'boss-w': { progress: 1, goal: 1, claimed: true, done: true },
      ghost: { progress: 1, goal: 3, claimed: false, done: false },
    };
    const now = T0 + 10 * DAY;
    expect(Object.keys(pruneProgress(cfg, progress, now)).sort()).toEqual(['salmon']);
    // Nothing is pruned while the event still runs.
    expect(Object.keys(pruneProgress(cfg, progress, T0)).sort()).toEqual(['salmon', 'streak-a']);
  });

  it('formats countdowns', () => {
    expect(formatCountdown(2 * DAY + 3 * 3600000)).toBe('2d 3h');
    expect(formatCountdown(3 * 3600000 + 12 * 60000)).toBe('3h 12m');
    expect(formatCountdown(12 * 60000 + 5000)).toBe('12m 05s');
    expect(formatCountdown(9000)).toBe('0:09');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});

describe('season pass', () => {
  it('tiers follow points and claims are tracked per track', () => {
    const cfg = config();
    const season = cfg.season!;
    expect(tierOf(0, 100, 30)).toBe(0);
    expect(tierOf(250, 100, 30)).toBe(2);
    expect(tierOf(99999, 100, 30)).toBe(30);
    const st = { ...emptySeason('s1'), points: 250 };
    expect(claimableTiers(season, st, 'free')).toEqual([1, 2]);
    expect(claimableTiers(season, st, 'premium')).toEqual([]);
    st.premium = true;
    st.claimedFree.push(1);
    expect(claimableTiers(season, st, 'free')).toEqual([2]);
    expect(claimableTiers(season, st, 'premium')).toEqual([1, 2]);
    // A different season id claims nothing until the state is reset for it.
    expect(claimableTiers(season, { ...st, id: 's0' }, 'free')).toEqual([]);
  });
});

describe('save v9', () => {
  it('adds events progress and the season with defaults and keeps them through normalize', () => {
    expect(SAVE_VERSION).toBe(9);
    const v8 = { ...(defaultSave() as unknown as Record<string, unknown>) };
    delete v8.events;
    delete v8.season;
    const v9 = migrateV8toV9(v8);
    expect(v9.events).toEqual({});
    expect((v9.season as { points: number }).points).toBe(0);
    const s = normalize({
      ...v9,
      events: {
        ok: emptyProgress({ id: 'ok', type: 'streak', name: 'x', start: 0, end: 1, goal: 3, rewards: { coins: 1 } }),
        bad: 'nope',
        worse: { progress: 'x' },
      },
      season: { id: 's1', points: 12.5, premium: 'yes', claimedFree: [1, 'a', 2], claimedPremium: null },
    });
    expect(Object.keys(s.events)).toEqual(['ok']);
    expect(s.season).toEqual({ id: 's1', points: 12, premium: false, claimedFree: [1, 2], claimedPremium: [] });
  });
});
