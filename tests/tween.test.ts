import { describe, expect, it } from 'vitest';
import { TweenManager } from '../src/anim/tween';
import { easeIn } from '../src/engine/util';

describe('TweenManager', () => {
  it('interpolates toward the target and calls onDone once', () => {
    const m = new TweenManager();
    const o = { x: 0 };
    let done = 0;
    m.to(o, { x: 10 }, 1, { ease: (u) => u, onDone: () => done++ });
    m.update(0.25);
    expect(o.x).toBeCloseTo(2.5);
    m.update(0.5);
    expect(o.x).toBeCloseTo(7.5);
    m.update(0.5);
    expect(o.x).toBe(10);
    expect(done).toBe(1);
    expect(m.size).toBe(0);
    m.update(1);
    expect(done).toBe(1);
  });

  it('honours delay and captures the start value when the delay ends', () => {
    const m = new TweenManager();
    const o = { x: 0 };
    m.to(o, { x: 10 }, 1, { delay: 0.5, ease: (u) => u });
    m.update(0.25);
    expect(o.x).toBe(0);
    o.x = 4; // something else moved it during the delay
    m.update(0.25);
    expect(o.x).toBe(4);
    m.update(0.5);
    expect(o.x).toBeCloseTo(7);
  });

  it('applies easing', () => {
    const m = new TweenManager();
    const o = { x: 0 };
    m.to(o, { x: 1 }, 1, { ease: easeIn });
    m.update(0.5);
    expect(o.x).toBeCloseTo(0.25);
  });

  it('runs sequences back to back and reports done', () => {
    const m = new TweenManager();
    const o = { x: 0, y: 0 };
    const order: string[] = [];
    const h = m.sequence(
      o,
      [
        { to: { x: 1 }, dur: 0.5, ease: (u) => u },
        { to: { y: 1 }, dur: 0.5, ease: (u) => u },
      ],
      { onDone: () => order.push('done') }
    );
    m.update(0.5);
    expect(o.x).toBe(1);
    expect(o.y).toBe(0);
    expect(h.done).toBe(false);
    m.update(0.5);
    expect(o.y).toBe(1);
    expect(h.done).toBe(true);
    expect(order).toEqual(['done']);
  });

  it('cancels per object and per tag without firing onDone', () => {
    const m = new TweenManager();
    const a = { x: 0 },
      b = { x: 0 };
    let fired = 0;
    m.to(a, { x: 1 }, 1, { tag: 'walk', onDone: () => fired++ });
    m.to(a, { x: 2 }, 1, { tag: 'bump', onDone: () => fired++ });
    m.to(b, { x: 1 }, 1, { onDone: () => fired++ });
    expect(m.cancel(a, 'walk')).toBe(1);
    m.update(2);
    expect(a.x).toBe(2);
    expect(b.x).toBe(1);
    expect(fired).toBe(2);
    expect(m.size).toBe(0);
  });

  it('cancelling a sequence stops the remaining steps', () => {
    const m = new TweenManager();
    const o = { x: 0, y: 0 };
    const h = m.sequence(o, [
      { to: { x: 1 }, dur: 0.5 },
      { to: { y: 1 }, dur: 0.5 },
    ]);
    m.update(0.25);
    h.cancel();
    m.update(2);
    expect(o.y).toBe(0);
    expect(h.cancelled).toBe(true);
  });

  it('finish jumps to the end values silently', () => {
    const m = new TweenManager();
    const o = { x: 0 };
    let fired = 0;
    m.to(o, { x: 5 }, 1, { onDone: () => fired++ });
    m.finish(o);
    m.update(0.1);
    expect(o.x).toBe(5);
    expect(fired).toBe(0);
  });

  it('time scale speeds everything up (reduce motion)', () => {
    const m = new TweenManager();
    const o = { x: 0 };
    m.setTimeScale(2);
    m.to(o, { x: 1 }, 1, { ease: (u) => u });
    m.update(0.5);
    expect(o.x).toBe(1);
  });

  it('delay() fires a callback and clear() drops everything', () => {
    const m = new TweenManager();
    let fired = 0;
    m.delay(0.3, () => fired++);
    m.update(0.2);
    expect(fired).toBe(0);
    m.update(0.2);
    expect(fired).toBe(1);
    m.delay(1, () => fired++);
    m.clear();
    m.update(2);
    expect(fired).toBe(1);
  });

  it('tweens scheduled from onDone run on later frames', () => {
    const m = new TweenManager();
    const o = { x: 0, y: 0 };
    m.to(o, { x: 1 }, 0.1, { onDone: () => m.to(o, { y: 1 }, 0.1) });
    m.update(0.1);
    expect(o.x).toBe(1);
    expect(m.size).toBe(1);
    m.update(0.1);
    expect(o.y).toBe(1);
  });
});
