/* Pooled particles. A fixed pool of slots is reused; emitting when the pool is full drops the request.
   Simulation is pure (unit-tested); drawing takes a context so the module stays DOM-free. */

import { COIN_POS, GOLD, H, W } from '../data/constants';
import { easeIn, easeInOut, easeOut } from '../engine/util';

export type ParticleKind = 'crumb' | 'shard' | 'steam' | 'coin' | 'confetti' | 'bonk' | 'puff' | 'spark';

export interface Particle {
  alive: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  t: number;
  life: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  /** Coins fly to a target and hand a value to onArrive. */
  tx: number;
  ty: number;
  value: number;
  onArrive: ((value: number) => void) | null;
}

export const MAX_PARTICLES = 400;

function blank(): Particle {
  return {
    alive: false,
    kind: 'crumb',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    g: 0,
    t: 0,
    life: 1,
    size: 2,
    color: '#fff',
    rot: 0,
    vr: 0,
    tx: 0,
    ty: 0,
    value: 0,
    onArrive: null,
  };
}

export interface EmitOpts {
  color?: string;
  size?: number;
  spread?: number;
  speed?: number;
  life?: number;
  gravity?: number;
}

export class ParticleSystem {
  private pool: Particle[];
  private live = 0;
  /** When true, emitters spawn a third of the usual count and steam is skipped. */
  reduced = false;
  dropped = 0;

  constructor(readonly max = MAX_PARTICLES) {
    this.pool = Array.from({ length: max }, blank);
  }

  count(): number {
    return this.live;
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
    this.live = 0;
  }

  private take(): Particle | null {
    for (const p of this.pool)
      if (!p.alive) {
        p.alive = true;
        p.onArrive = null;
        p.t = 0;
        p.rot = 0;
        p.vr = 0;
        p.g = 0;
        this.live++;
        return p;
      }
    this.dropped++;
    return null;
  }

  private release(p: Particle): void {
    if (!p.alive) return;
    p.alive = false;
    this.live--;
  }

  /** Emit n particles of a kind around (x,y). Returns how many were actually spawned. */
  emit(kind: ParticleKind, x: number, y: number, n: number, opts: EmitOpts = {}): number {
    if (this.reduced) {
      if (kind === 'steam' || kind === 'confetti') return 0;
      n = Math.max(1, Math.round(n / 3));
    }
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      const p = this.take();
      if (!p) {
        this.dropped += n - i - 1; // take() counted this one; the rest of the burst is dropped too
        break;
      }
      spawned++;
      p.kind = kind;
      const spread = opts.spread ?? 1;
      p.x = x + (Math.random() - 0.5) * 14 * spread;
      p.y = y + (Math.random() - 0.5) * 8 * spread;
      p.color = opts.color || '#fff';
      switch (kind) {
        case 'crumb':
          p.vx = (Math.random() - 0.5) * 80 * (opts.speed ?? 1);
          p.vy = -40 - Math.random() * 60;
          p.g = opts.gravity ?? 300;
          p.life = opts.life ?? 0.45;
          p.size = opts.size ?? 2.5;
          break;
        case 'shard':
          p.vx = (Math.random() - 0.5) * 220;
          p.vy = -80 - Math.random() * 160;
          p.g = 300;
          p.life = 0.6;
          p.size = 5;
          p.color = '#BFE6FF';
          break;
        case 'steam':
          p.vx = (Math.random() - 0.5) * 10;
          p.vy = -18 - Math.random() * 14;
          p.g = -8;
          p.life = opts.life ?? 1.1;
          p.size = opts.size ?? 4;
          p.color = 'rgba(255,255,255,.5)';
          break;
        case 'confetti':
          p.x = Math.random() * W;
          p.y = -20 - Math.random() * 300;
          p.vx = (Math.random() - 0.5) * 60;
          p.vy = 160 + Math.random() * 160;
          p.rot = Math.random() * 6;
          p.vr = (Math.random() - 0.5) * 8;
          p.color = ['#FFB7C5', '#FF8FA3', '#FFF8EA', '#E9B949', '#C8323B'][i % 5];
          p.size = 8 + Math.random() * 6;
          p.life = 6;
          break;
        case 'bonk':
          p.x = x;
          p.y = y;
          p.vx = p.vy = 0;
          p.life = 0.5;
          p.size = 1;
          break;
        case 'puff':
          p.x = x;
          p.y = y;
          p.vx = p.vy = 0;
          p.life = 0.4;
          p.size = 6;
          break;
        case 'spark':
          p.x = x;
          p.y = y;
          p.vx = p.vy = 0;
          p.life = 0.7;
          p.size = 3;
          p.color = GOLD;
          break;
        default:
          break;
      }
    }
    return spawned;
  }

  /** Coin burst: up to 8 coins that fly to the counter, each delivering part of the value on arrival. */
  coins(n: number, x: number, y: number, onArrive: (value: number) => void, tx = COIN_POS.x, ty = COIN_POS.y): number {
    const k = Math.min(n, this.reduced ? 1 : 8),
      per = Math.floor(n / k);
    let rem = n - per * k,
      spawned = 0;
    for (let i = 0; i < k; i++) {
      const value = per + (rem-- > 0 ? 1 : 0);
      const p = this.take();
      if (!p) {
        onArrive(value); // never lose coins because the pool is full
        continue;
      }
      spawned++;
      p.kind = 'coin';
      p.x = x + (Math.random() - 0.5) * 30;
      p.y = y + (Math.random() - 0.5) * 20;
      p.tx = tx;
      p.ty = ty;
      p.life = 0.55 + i * 0.06;
      p.value = value;
      p.onArrive = onArrive;
      p.size = 8;
    }
    return spawned;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.t += dt;
      if (p.kind === 'coin') {
        if (p.t >= p.life) {
          const cb = p.onArrive,
            v = p.value;
          this.release(p);
          if (cb) cb(v);
        }
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.t >= p.life || p.y > H + 30) this.release(p);
    }
  }

  /** Debug/test helper: how many of a kind are alive. */
  countOf(kind: ParticleKind): number {
    let n = 0;
    for (const p of this.pool) if (p.alive && p.kind === kind) n++;
    return n;
  }

  /** Draw live particles. `skip` leaves one kind out; `only` draws just that kind. */
  draw(
    ctx: CanvasRenderingContext2D,
    coinIcon: (x: number, y: number, r: number) => void,
    skip: ParticleKind | null = null,
    only: ParticleKind | null = null
  ): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      if (skip && p.kind === skip) continue;
      if (only && p.kind !== only) continue;
      const u = Math.min(1, p.t / p.life);
      switch (p.kind) {
        case 'crumb':
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, 7);
          ctx.fill();
          break;
        case 'shard':
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size * 0.8, p.y + p.size * 0.6);
          ctx.lineTo(p.x - p.size * 0.8, p.y + p.size * 0.6);
          ctx.closePath();
          ctx.fill();
          break;
        case 'steam':
          ctx.globalAlpha = 0.28 * (1 - easeIn(u));
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + u * p.size * 2.2, 0, 7);
          ctx.fill();
          break;
        case 'coin': {
          const e = easeInOut(u);
          const x = p.x + (p.tx - p.x) * e,
            y = p.y + (p.ty - p.y) * e - Math.sin(u * Math.PI) * 40;
          ctx.globalAlpha = 1;
          coinIcon(x, y, p.size);
          break;
        }
        case 'confetti':
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          if (p.color === '#E9B949') coinIcon(0, 0, p.size * 0.45);
          else {
            // A petal: a teardrop with a notch at the tip.
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 0.5);
            ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.2, p.size * 0.5, p.size * 0.5, 0, p.size * 0.35);
            ctx.bezierCurveTo(-p.size * 0.5, p.size * 0.5, -p.size * 0.6, -p.size * 0.2, 0, -p.size * 0.5);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.35)';
            ctx.beginPath();
            ctx.ellipse(-p.size * 0.15, -p.size * 0.1, p.size * 0.18, p.size * 0.1, -0.6, 0, 7);
            ctx.fill();
          }
          ctx.restore();
          break;
        case 'bonk': {
          const grow = easeOut(Math.min(1, u * 1.6));
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = 1 - easeIn(u);
          ctx.lineCap = 'round';
          for (const [col, lw] of [
            ['#2A2320', 5],
            [GOLD, 2.5],
          ] as [string, number][]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            for (let i = 0; i < 8; i++) {
              const a = (i * Math.PI) / 4 + 0.3,
                r0 = 6 + grow * 6,
                r1 = 10 + grow * (i % 2 ? 14 : 20);
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
              ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
              ctx.stroke();
            }
          }
          ctx.fillStyle = '#FFF7E8';
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, 7);
          ctx.fill();
          ctx.strokeStyle = '#2A2320';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#E5484D';
          ctx.font = '800 16px "Baloo 2","Trebuchet MS",sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', 0, 1);
          ctx.restore();
          break;
        }
        case 'puff':
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = '#EDF0F5';
          for (let i = 0; i < 5; i++) {
            const a = i * 1.26,
              r = 6 + u * 22;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5, 6 - u * 4, 0, 7);
            ctx.fill();
          }
          break;
        case 'spark':
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = p.color;
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + u * 2;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * (8 + u * 18), p.y - u * 30 + Math.sin(a) * (8 + u * 18), p.size, 0, 7);
            ctx.fill();
          }
          break;
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}

export const particles = new ParticleSystem();
