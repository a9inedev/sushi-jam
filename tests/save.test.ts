import { describe, expect, it } from 'vitest';
import { applySaved, defaultSave } from '../src/meta/save';

describe('save migration', () => {
  it('v1 blob carries level, coins and sound across', () => {
    const s = defaultSave();
    applySaved(s, null, { level: 17, coins: 940, sound: false });
    expect(s.level).toBe(17);
    expect(s.coins).toBe(940);
    expect(s.sound).toBe(false);
    expect(s.inv).toEqual({ vip: 0, takeout: 0, sendback: 0 });
  });

  it('v2 blob is applied on top of defaults and fills missing inventory keys', () => {
    const s = defaultSave();
    applySaved(s, { level: 33, coins: 12, decor: ['noren'], inv: { vip: 2 }, stats: [{ n: 1 }] }, null);
    expect(s.level).toBe(33);
    expect(s.coins).toBe(12);
    expect(s.decor).toEqual(['noren']);
    expect(s.inv).toEqual({ vip: 2, takeout: 0, sendback: 0 });
    expect(s.stats.length).toBe(1);
    expect(s.demoAds).toBe(true);
  });

  it('v2 wins over v1 when both exist', () => {
    const s = defaultSave();
    applySaved(s, { level: 5 }, { level: 50 });
    expect(s.level).toBe(5);
  });

  it('garbage input leaves defaults intact', () => {
    const s = defaultSave();
    applySaved(s, 'nope', 42);
    expect(s).toEqual(defaultSave());
  });
});
