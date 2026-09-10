/* The coin economy: the shipped numbers meet the targets in the model, the game reads the same numbers the
   model does, and the ledger lists every source and sink. */
import { describe, expect, it } from 'vitest';
import { bundledCurve, curveFor } from '../src/data/curve';
import { COST, dailyReward, ECON, PRODUCTS, streakBonus } from '../src/data/products';
import products from '../src/data/products.json';
import { defaultSave } from '../src/meta/save-schema';
import { checkTargets, ledger, simulate, winReward } from '../tools/economy-model.mjs';

const curve = bundledCurve();

describe('the numbers the game reads', () => {
  it('curve rows carry an integer reward and the game reads it', () => {
    for (const l of curve.levels) expect(Number.isInteger(l.reward) && l.reward > 0).toBe(true);
    expect(curveFor(1).reward).toBe(winReward(curve, 1));
    expect(curveFor(200).reward).toBe(winReward(curve, 200));
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(2)).toBe(ECON.win.streakStep);
    expect(streakBonus(99)).toBe(ECON.win.streakMax);
    expect(dailyReward(1)).toBe(ECON.daily.base);
    expect(dailyReward(ECON.daily.maxDays + 5)).toBe(ECON.daily.base + (ECON.daily.maxDays - 1) * ECON.daily.step);
  });

  it('products.json is what the catalogue, the booster prices and a new save use', () => {
    expect(COST).toEqual(products.boosters);
    expect(PRODUCTS.map((p) => [p.id, p.storeId, p.price])).toEqual(
      products.products.map((p) => [p.id, p.storeId, p.price])
    );
    const s = defaultSave();
    expect(s.coins).toBe(products.start.coins);
    expect(s.inv).toEqual(products.start.inv);
  });

  it('the ledger lists every source and sink', () => {
    const l = ledger(curve, products, 50);
    const names = l.map((x) => x.name);
    for (const n of [
      'Level win',
      'Streak bonus',
      'Daily bonus',
      'Daily puzzle',
      'Rush',
      'Zen',
      'Boss board',
      'Event rewards',
      'Season pass',
      'Decor set complete',
      'VIP seat',
      'Takeout',
      'Send Back',
      'Decor',
    ])
      expect(names).toContain(n);
    expect(l.find((x) => x.name === 'Level win')?.amount).toBe(curveFor(50).reward);
  });
});

describe('targets', () => {
  it('a simulated non-payer meets every target with the shipped numbers', () => {
    const sim = simulate(curve, products, { runs: 200 });
    const checks = checkTargets(sim.summary);
    expect(
      checks.map((c) => `${c.name}: ${c.value} in ${c.band.join('..')} ${c.ok}`).filter((s) => s.endsWith('false'))
    ).toEqual([]);
    expect(sim.summary.levelsPerBooster).toBeGreaterThanOrEqual(2.5);
    expect(sim.summary.levelsPerBooster).toBeLessThanOrEqual(3.5);
    expect(sim.summary.wallsAfter30).toBeGreaterThanOrEqual(8.5);
    expect(sim.summary.wallsAfter30).toBeLessThanOrEqual(14.5);
    expect(sim.summary.minCoins).toBeGreaterThanOrEqual(0);
  });

  it('the old reward formula would not have', () => {
    const legacy = { ...curve, levels: curve.levels.map((l) => ({ ...l, reward: 50 + l.n * 2 })) };
    const s = simulate(legacy, products, { runs: 60 }).summary;
    expect(s.levelsPerBooster).toBeLessThan(1);
    expect(s.wallsAfter30).toBeLessThan(2);
  });
});
