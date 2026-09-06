import { describe, expect, it } from 'vitest';
import { ParticleSystem } from '../src/anim/particles';

describe('ParticleSystem', () => {
  it('emits into the pool and frees slots when particles die', () => {
    const ps = new ParticleSystem(50);
    expect(ps.emit('crumb', 10, 10, 8)).toBe(8);
    expect(ps.count()).toBe(8);
    ps.update(0.2);
    expect(ps.count()).toBe(8);
    ps.update(0.5);
    expect(ps.count()).toBe(0);
    // slots are reused
    expect(ps.emit('shard', 0, 0, 50)).toBe(50);
    expect(ps.count()).toBe(50);
  });

  it('never grows past the pool and counts drops', () => {
    const ps = new ParticleSystem(20);
    expect(ps.emit('crumb', 0, 0, 30)).toBe(20);
    expect(ps.count()).toBe(20);
    expect(ps.dropped).toBe(10);
    expect(ps.emit('spark', 0, 0, 1)).toBe(0);
  });

  it('coins deliver their value on arrival, and never lose value when the pool is full', () => {
    const ps = new ParticleSystem(4);
    let got = 0;
    ps.coins(7, 0, 0, (v) => (got += v));
    expect(ps.countOf('coin')).toBe(4); // 7 coins requested, 4 slots: the other 3 paid out at once
    expect(got).toBe(3);
    ps.update(0.5);
    expect(got).toBe(3);
    ps.update(0.6);
    expect(got).toBe(7);
    expect(ps.count()).toBe(0);
  });

  it('reduced mode thins bursts and skips steam and confetti', () => {
    const ps = new ParticleSystem(100);
    ps.reduced = true;
    expect(ps.emit('crumb', 0, 0, 9)).toBe(3);
    expect(ps.emit('steam', 0, 0, 5)).toBe(0);
    expect(ps.emit('confetti', 0, 0, 70)).toBe(0);
    let got = 0;
    ps.coins(12, 0, 0, (v) => (got += v));
    expect(ps.countOf('coin')).toBe(1);
    ps.update(1);
    expect(got).toBe(12);
  });

  it('confetti spreads across the width and falls', () => {
    const ps = new ParticleSystem(100);
    ps.emit('confetti', 0, 0, 40);
    expect(ps.countOf('confetti')).toBe(40);
    ps.update(0.5);
    expect(ps.count()).toBe(40);
    for (let i = 0; i < 20; i++) ps.update(0.5);
    expect(ps.count()).toBe(0); // all off the bottom or expired
  });

  it('clear empties the pool', () => {
    const ps = new ParticleSystem(10);
    ps.emit('puff', 0, 0, 5);
    ps.clear();
    expect(ps.count()).toBe(0);
  });
});
