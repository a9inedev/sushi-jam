/* A small tween manager: numeric property tweens with easing, delays, sequences, per-object cancellation
   and a global time scale (reduce motion runs everything faster). Pure: no DOM, unit-tested. */

import { easeInOut, type Ease } from '../engine/util';

export interface TweenOpts {
  delay?: number;
  ease?: Ease;
  onDone?: () => void;
  /** Optional label so cancel(obj, tag) can target one kind of motion on an object. */
  tag?: string;
}

export interface TweenHandle {
  cancel(): void;
  readonly done: boolean;
  readonly cancelled: boolean;
}

export interface SequenceStep {
  to: Record<string, number>;
  dur: number;
  ease?: Ease;
  delay?: number;
}

type Target = Record<string, number>;

interface Tw {
  obj: Target;
  to: Record<string, number>;
  from: Record<string, number> | null;
  t: number;
  dur: number;
  delay: number;
  ease: Ease;
  onDone?: () => void;
  tag?: string;
  done: boolean;
  cancelled: boolean;
}

export class TweenManager {
  private list: Tw[] = [];
  private scale = 1;

  /** 1 is real time; larger runs every tween faster (reduce motion uses 1.6). */
  setTimeScale(s: number): void {
    this.scale = Math.max(0.05, s);
  }

  get timeScale(): number {
    return this.scale;
  }

  get size(): number {
    return this.list.length;
  }

  /** Tween numeric properties of obj toward `to` over dur seconds. Start values are captured when the delay ends. */
  to(obj: object, to: Record<string, number>, dur: number, opts: TweenOpts = {}): TweenHandle {
    const tw: Tw = {
      obj: obj as Target,
      to,
      from: null,
      t: 0,
      dur: Math.max(0, dur),
      delay: Math.max(0, opts.delay || 0),
      ease: opts.ease || easeInOut,
      onDone: opts.onDone,
      tag: opts.tag,
      done: false,
      cancelled: false,
    };
    this.list.push(tw);
    return {
      cancel: () => {
        tw.cancelled = true;
      },
      get done() {
        return tw.done;
      },
      get cancelled() {
        return tw.cancelled;
      },
    };
  }

  /** Call fn after dur seconds. */
  delay(dur: number, fn: () => void, tag?: string): TweenHandle {
    return this.to({}, {}, dur, { onDone: fn, tag });
  }

  /** Run steps back to back on one object. Cancelling the handle stops the current step and skips the rest. */
  sequence(obj: object, steps: SequenceStep[], opts: { onDone?: () => void; tag?: string } = {}): TweenHandle {
    let current: TweenHandle | null = null;
    let cancelled = false;
    let done = false;
    const run = (i: number) => {
      if (cancelled) return;
      if (i >= steps.length) {
        done = true;
        if (opts.onDone) opts.onDone();
        return;
      }
      const s = steps[i];
      current = this.to(obj, s.to, s.dur, { ease: s.ease, delay: s.delay, tag: opts.tag, onDone: () => run(i + 1) });
    };
    run(0);
    return {
      cancel: () => {
        cancelled = true;
        if (current) current.cancel();
      },
      get done() {
        return done;
      },
      get cancelled() {
        return cancelled;
      },
    };
  }

  /** Cancel every tween on obj (optionally only those with a tag). Their onDone never fires. */
  cancel(obj: object, tag?: string): number {
    let n = 0;
    for (const tw of this.list)
      if (tw.obj === obj && !tw.cancelled && (tag === undefined || tw.tag === tag)) {
        tw.cancelled = true;
        n++;
      }
    return n;
  }

  /** Jump every active tween on obj to its end value without calling onDone. */
  finish(obj: object): void {
    for (const tw of this.list)
      if (tw.obj === obj && !tw.cancelled) {
        for (const k in tw.to) tw.obj[k] = tw.to[k];
        tw.cancelled = true;
      }
  }

  clear(): void {
    this.list.length = 0;
  }

  update(dt: number): void {
    const step = dt * this.scale;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.cancelled) {
        this.list.splice(i, 1);
        continue;
      }
      let use = step;
      if (tw.delay > 0) {
        const left = tw.delay;
        tw.delay -= step;
        if (tw.delay > 0) continue;
        use = step - left; // only the part of this step that falls after the delay
      }
      if (!tw.from) {
        tw.from = {};
        for (const k in tw.to) tw.from[k] = typeof tw.obj[k] === 'number' ? tw.obj[k] : tw.to[k];
      }
      tw.t += use;
      const u = tw.dur > 0 ? Math.min(1, tw.t / tw.dur) : 1;
      const e = tw.ease(u);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (u >= 1) {
        this.list.splice(i, 1);
        tw.done = true;
        if (tw.onDone) tw.onDone();
      }
    }
  }
}

/** The game's shared manager. Updated once per frame by main; cleared on every new level. */
export const tweens = new TweenManager();
