/* The lives experiment: the flag file and arm assignment, the lives model with a fixed clock, the analytics
   counters and the registered decision rule, and the v13 save fields. */
import { describe, expect, it } from 'vitest';
import bundledFlags from '../src/data/flags.json';
import { defaultFlags, validateFlags, variantFor } from '../src/data/flags-schema';
import {
  armReport,
  cleanMetrics,
  count,
  decide,
  emptyArm,
  emptyMetrics,
  merge,
  report,
  type ArmReport,
} from '../src/meta/analytics-core';
import {
  addLives,
  canPlay,
  defaultLives,
  formatCountdown,
  grantUnlimited,
  lose,
  nextLifeIn,
  refill,
  withMax,
} from '../src/meta/lives-core';
import { defaultSave, migrateV12toV13, normalize, SAVE_VERSION } from '../src/meta/save-schema';

const MIN = 60000;
const REFILL = 30 * MIN;
const T0 = Date.UTC(2026, 8, 11, 12, 0, 0);

describe('flags', () => {
  it('the bundled file validates and a split assigns arms stably by install id', () => {
    const v = validateFlags(bundledFlags);
    expect(v.error).toBeNull();
    const f = { ...v.flags!, lives: { ...v.flags!.lives, variant: 'split' as const, split: 50 } };
    const ids = Array.from({ length: 400 }, (_, i) => 'install-' + i);
    const arms = ids.map((id) => variantFor(f, id));
    const b = arms.filter((a) => a === 'B').length;
    expect(b).toBeGreaterThan(140);
    expect(b).toBeLessThan(260);
    expect(ids.map((id) => variantFor(f, id))).toEqual(arms);
    expect(variantFor({ ...f, lives: { ...f.lives, variant: 'A' } }, 'x')).toBe('A');
    expect(variantFor({ ...f, lives: { ...f.lives, variant: 'B' } }, 'x')).toBe('B');
    expect(variantFor({ ...f, lives: { ...f.lives, split: 0 } }, 'x')).toBe('A');
    expect(variantFor({ ...f, lives: { ...f.lives, split: 100 } }, 'x')).toBe('B');
  });

  it('rejects broken flags with a reason', () => {
    expect(validateFlags({ v: 2 }).error).toMatch(/version/);
    expect(
      validateFlags({
        v: 1,
        lives: { variant: 'C', split: 0, max: 5, refillMinutes: 30 },
        analytics: { enabled: true },
      }).error
    ).toMatch(/variant/);
    expect(
      validateFlags({
        v: 1,
        lives: { variant: 'B', split: 0, max: 0, refillMinutes: 30 },
        analytics: { enabled: true },
      }).error
    ).toMatch(/max/);
    expect(
      validateFlags({ v: 1, lives: { variant: 'B', split: 0, max: 5, refillMinutes: 30 }, analytics: {} }).error
    ).toMatch(/analytics/);
    expect(defaultFlags().lives.variant).toBe('A');
  });
});

describe('lives', () => {
  it('loses one per fail, refills one per interval, parks the clock when full', () => {
    let st = defaultLives(5);
    expect(canPlay(st, T0, REFILL)).toBe(true);
    st = lose(st, T0, REFILL);
    expect(st.n).toBe(4);
    expect(st.lastAt).toBe(T0);
    for (let i = 0; i < 4; i++) st = lose(st, T0 + i, REFILL);
    expect(st.n).toBe(0);
    expect(canPlay(st, T0 + 5, REFILL)).toBe(false);
    expect(nextLifeIn(st, T0 + 5 * MIN, REFILL)).toBe(25 * MIN);
    expect(formatCountdown(25 * MIN)).toBe('25:00');
    const later = refill(st, T0 + 61 * MIN, REFILL);
    expect(later.n).toBe(2);
    expect(later.lastAt).toBe(T0 + 60 * MIN);
    expect(canPlay(st, T0 + 31 * MIN, REFILL)).toBe(true);
    const full = refill(st, T0 + 10 * 3600000, REFILL);
    expect(full.n).toBe(5);
    expect(full.lastAt).toBe(T0 + 10 * 3600000);
    expect(nextLifeIn(full, T0 + 10 * 3600000, REFILL)).toBe(0);
  });

  it('unlimited windows cost nothing and stack; extra lives cap at max; a new max keeps the stock sane', () => {
    let st = lose(defaultLives(5), T0, REFILL);
    st = grantUnlimited(st, 30, T0);
    expect(st.unlimitedUntil).toBe(T0 + 30 * MIN);
    st = grantUnlimited(st, 30, T0 + MIN);
    expect(st.unlimitedUntil).toBe(T0 + 60 * MIN);
    expect(lose(st, T0 + 2 * MIN, REFILL).n).toBe(4);
    expect(canPlay({ ...st, n: 0 }, T0 + 59 * MIN, REFILL)).toBe(true);
    expect(canPlay({ ...st, n: 0, lastAt: T0 + 60 * MIN }, T0 + 61 * MIN, REFILL)).toBe(false);
    expect(addLives({ ...defaultLives(5), n: 4, lastAt: T0 }, 3, T0, REFILL).n).toBe(5);
    expect(withMax({ ...defaultLives(5), n: 5 }, 3).n).toBe(3);
    expect(withMax({ ...defaultLives(5), n: 2 }, 8)).toMatchObject({ n: 2, max: 8 });
    expect(withMax({ ...defaultLives(5), n: 5 }, 8).n).toBe(8);
  });
});

describe('analytics', () => {
  it('counts events per arm and reports the three comparison metrics', () => {
    const m = emptyMetrics();
    const day = '2026-09-11';
    count(m, { t: 1, name: 'session_end', v: 'B', p: { seconds: 600 } }, day);
    count(m, { t: 2, name: 'session_end', v: 'B', p: { seconds: 300 } }, day);
    count(m, { t: 3, name: 'fail', v: 'B' }, day);
    count(m, { t: 4, name: 'retry', v: 'B' }, day);
    count(m, { t: 5, name: 'fail', v: 'B' }, day);
    count(m, { t: 6, name: 'ad', v: 'B', p: { kind: 'reward' } }, day);
    count(m, { t: 7, name: 'ad', v: 'A', p: { kind: 'inter' } }, '2026-09-12');
    const r = report(m);
    expect(r.B).toMatchObject({ sessions: 2, avgSessionMin: 7.5, retriesPerFail: 0.5, adsPerSession: 0.5, days: 1 });
    expect(r.A.sessions).toBe(0);
    expect(m.B.rewardedAds).toBe(1);
    expect(m.events.length).toBe(7);
    const merged = merge([m, m]);
    expect(merged.B.sessions).toBe(4);
    expect(merged.A.firstDay).toBe('2026-09-12');
    expect(
      cleanMetrics({ A: { sessions: -1 }, B: 'x', events: [{ t: 1, name: 'win', v: 'A' }, 'junk'] })
    ).toMatchObject({
      A: emptyArm(),
      B: emptyArm(),
      events: [{ t: 1, name: 'win', v: 'A' }],
    });
  });

  it('the decision rule extends on thin data, ships B only when it holds sessions and retries and adds ads', () => {
    const base = (over: Partial<ArmReport>): ArmReport => ({
      ...armReport('A', emptyArm()),
      sessions: 300,
      days: 8,
      avgSessionMin: 10,
      retriesPerFail: 1.0,
      adsPerSession: 1.0,
      ...over,
    });
    expect(decide({ A: base({ sessions: 50 }), B: base({}) }).choice).toBe('extend');
    expect(decide({ A: base({ days: 3 }), B: base({ days: 3 }) }).choice).toBe('extend');
    expect(
      decide({ A: base({}), B: base({ avgSessionMin: 9.5, retriesPerFail: 0.95, adsPerSession: 1.3 }) }).choice
    ).toBe('B');
    expect(
      decide({ A: base({}), B: base({ avgSessionMin: 8, retriesPerFail: 0.95, adsPerSession: 1.3 }) }).choice
    ).toBe('A');
    expect(decide({ A: base({}), B: base({ avgSessionMin: 10, retriesPerFail: 1, adsPerSession: 1.1 }) }).choice).toBe(
      'A'
    );
  });
});

describe('save v13', () => {
  it('adds the install id, the lives stock and the metrics', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    const v12: Record<string, unknown> = { ...(defaultSave() as unknown as Record<string, unknown>) };
    delete v12.installId;
    delete v12.lives;
    delete v12.metrics;
    const v13 = migrateV12toV13(v12);
    expect(typeof v13.installId).toBe('string');
    expect((v13.installId as string).length).toBeGreaterThanOrEqual(16);
    expect(v13.lives).toEqual(defaultLives(5));
    expect(v13.metrics).toEqual(emptyMetrics());
    const s = normalize({ ...v13, installId: '', lives: { n: 9, max: 5 }, metrics: null });
    expect(s.installId.length).toBeGreaterThanOrEqual(16);
    expect(s.lives).toEqual({ n: 5, max: 5, lastAt: 0, unlimitedUntil: 0 });
    expect(s.metrics).toEqual(emptyMetrics());
  });
});
