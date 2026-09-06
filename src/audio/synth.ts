/* A tiny deterministic synth that renders a Patch (layers of oscillators and noise with envelopes, filters,
   vibrato, drive and echo) into a Float32Array. Pure: runs in the browser to fill AudioBuffers and in Node to
   write the reference WAVs. Every sound in the game is authored as a Patch in patches.ts. */

export type Wave = 'sine' | 'square' | 'saw' | 'triangle';

export interface Sweep {
  from: number;
  to: number;
  /** exp (default) for pitch and filter sweeps, lin for gentle drifts. */
  curve?: 'exp' | 'lin';
}

/** ADSR in seconds; s is the sustain level 0..1. The gate closes at dur - r. */
export interface Env {
  a: number;
  d: number;
  s: number;
  r: number;
}

export interface Layer {
  type: 'osc' | 'noise';
  wave?: Wave;
  freq?: number | Sweep;
  gain: number;
  env: Env;
  /** Offset from the patch start, seconds. */
  start?: number;
  /** Total layer length including release, seconds. */
  dur: number;
  filter?: { type: 'lp' | 'hp' | 'bp'; freq: number | Sweep; q?: number };
  vibrato?: { rate: number; depth: number };
  /** Soft clip amount, 0 = clean. */
  drive?: number;
  /** Deterministic noise seed. */
  seed?: number;
}

export interface Patch {
  dur: number;
  /** Peak level after normalisation, 0..1. */
  level: number;
  layers: Layer[];
  echo?: { time: number; feedback: number; mix: number };
}

export interface Rendered {
  samples: Float32Array;
  sampleRate: number;
  peak: number;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function valueAt(v: number | Sweep, u: number): number {
  if (typeof v === 'number') return v;
  if (v.curve === 'lin') return v.from + (v.to - v.from) * u;
  return v.from * Math.pow(v.to / v.from, u);
}

function envAt(e: Env, t: number, gate: number): number {
  if (t < 0) return 0;
  if (t < e.a) return e.a > 0 ? t / e.a : 1;
  if (t < e.a + e.d) return 1 - (1 - e.s) * ((t - e.a) / Math.max(1e-6, e.d));
  if (t < gate) return e.s;
  const rel = e.r > 0 ? 1 - (t - gate) / e.r : 0;
  return Math.max(0, rel) * (gate <= e.a + e.d ? envAt(e, gate, Infinity) : e.s);
}

function wave(kind: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (kind) {
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    default:
      return Math.sin(p * Math.PI * 2);
  }
}

/** RBJ biquad, coefficients refreshed every 32 samples when the cutoff sweeps. */
class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;
  set(type: 'lp' | 'hp' | 'bp', freq: number, q: number, sr: number): void {
    const f = Math.max(20, Math.min(sr * 0.45, freq));
    const w = (2 * Math.PI * f) / sr,
      cs = Math.cos(w),
      sn = Math.sin(w),
      al = sn / (2 * Math.max(0.1, q));
    let b0: number, b1: number, b2: number;
    if (type === 'lp') {
      b0 = (1 - cs) / 2;
      b1 = 1 - cs;
      b2 = (1 - cs) / 2;
    } else if (type === 'hp') {
      b0 = (1 + cs) / 2;
      b1 = -(1 + cs);
      b2 = (1 + cs) / 2;
    } else {
      b0 = al;
      b1 = 0;
      b2 = -al;
    }
    const a0 = 1 + al;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - al) / a0;
  }
  run(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

function softClip(x: number, drive: number): number {
  if (drive <= 0) return x;
  const k = 1 + drive * 6;
  return Math.tanh(x * k) / Math.tanh(k);
}

export function renderPatch(p: Patch, sampleRate = 44100): Rendered {
  const n = Math.max(1, Math.round(p.dur * sampleRate));
  const out = new Float32Array(n);
  p.layers.forEach((L, li) => {
    const start = Math.round((L.start || 0) * sampleRate);
    const len = Math.round(L.dur * sampleRate);
    const gate = L.dur - L.env.r;
    const rnd = lcg((L.seed ?? 7) * 7919 + li * 104729 + 17);
    const filt = L.filter ? new Biquad() : null;
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= n) break;
      const t = i / sampleRate,
        u = i / Math.max(1, len - 1);
      let v: number;
      if (L.type === 'noise') v = rnd() * 2 - 1;
      else {
        let f = valueAt(L.freq ?? 440, u);
        if (L.vibrato) f += Math.sin(t * L.vibrato.rate * Math.PI * 2) * L.vibrato.depth;
        phase += f / sampleRate;
        v = wave(L.wave || 'sine', phase);
      }
      if (filt) {
        if (i % 32 === 0) filt.set(L.filter!.type, valueAt(L.filter!.freq, u), L.filter!.q ?? 0.9, sampleRate);
        v = filt.run(v);
      }
      v = softClip(v, L.drive || 0) * envAt(L.env, t, gate) * L.gain;
      out[idx] += v;
    }
  });
  if (p.echo && p.echo.time > 0) {
    const d = Math.round(p.echo.time * sampleRate);
    for (let i = d; i < n; i++) out[i] += out[i - d] * p.echo.feedback;
    // The dry/wet mix is folded in by scaling the tail contribution.
    if (p.echo.mix < 1) for (let i = d; i < n; i++) out[i] = out[i] * (1 - p.echo.mix * 0.5);
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const g = p.level / peak;
    for (let i = 0; i < n; i++) out[i] *= g;
  }
  // Short fade at the tail so nothing clicks when a buffer ends.
  const fade = Math.min(n, Math.round(0.004 * sampleRate));
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return { samples: out, sampleRate, peak: peak > 0 ? p.level : 0 };
}

/** 16-bit PCM WAV bytes for a rendered buffer (used by the reference export and tests). */
export function toWav(r: Rendered): Uint8Array {
  const n = r.samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, r.sampleRate, true);
  v.setUint32(28, r.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, r.samples[i])) * 32767, true);
  return new Uint8Array(buf);
}
