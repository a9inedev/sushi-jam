/* Synthesised sound set on Web Audio. Nothing is loaded from the network. */

import { S } from '../meta/save';

let AC: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let rumble: { v: GainNode } | null = null;

type AudioContextCtor = typeof AudioContext;

/** The shared context, created and resumed on demand. Null when sound is off or unavailable. */
export function audio(): AudioContext | null {
  if (!S.sound) return null;
  try {
    if (!AC) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      AC = new Ctor();
    }
    if (AC.state === 'suspended') void AC.resume();
    return AC;
  } catch {
    return null;
  }
}

export function audioContext(): AudioContext | null {
  return AC;
}

function noise(a: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(f: number, d?: number, type?: OscillatorType, g?: number, delay?: number): void {
  const a = audio();
  if (!a) return;
  d = d || 0.08;
  type = type || 'sine';
  g = g || 0.12;
  delay = delay || 0;
  try {
    const o = a.createOscillator(),
      v = a.createGain();
    o.type = type;
    o.frequency.value = f;
    const t0 = a.currentTime + delay;
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(v).connect(a.destination);
    o.start(t0);
    o.stop(t0 + d + 0.03);
  } catch {
    /* audio graph errors are non-fatal */
  }
}

function sweep(f0: number, f1: number, d: number, type?: OscillatorType, g?: number, delay?: number): void {
  const a = audio();
  if (!a) return;
  delay = delay || 0;
  try {
    const o = a.createOscillator(),
      v = a.createGain();
    o.type = type || 'sine';
    const t0 = a.currentTime + delay;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(g || 0.1, t0 + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(v).connect(a.destination);
    o.start(t0);
    o.stop(t0 + d + 0.03);
  } catch {
    /* non-fatal */
  }
}

function burst(d: number, g: number, ftype: BiquadFilterType, freq: number, delay?: number): void {
  const a = audio();
  if (!a) return;
  delay = delay || 0;
  try {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = ftype;
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const v = a.createGain();
    const t0 = a.currentTime + delay;
    v.gain.setValueAtTime(g, t0);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f).connect(v).connect(a.destination);
    src.start(t0);
    src.stop(t0 + d + 0.02);
  } catch {
    /* non-fatal */
  }
}

/** Low belt rumble whose level follows belt tension. */
export function setRumble(level: number): void {
  if (!AC || !S.sound) {
    if (rumble) {
      try {
        rumble.v.gain.value = 0;
      } catch {
        /* ignore */
      }
    }
    return;
  }
  try {
    if (!rumble) {
      const src = AC.createBufferSource();
      src.buffer = noise(AC);
      src.loop = true;
      const f = AC.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 110;
      const v = AC.createGain();
      v.gain.value = 0;
      src.connect(f).connect(v).connect(AC.destination);
      src.start();
      rumble = { v };
    }
    rumble.v.gain.setTargetAtTime(0.16 * level, AC.currentTime, 0.12);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  tap: () => tone(520, 0.06, 'triangle', 0.1),
  click: () => burst(0.03, 0.25, 'highpass', 3000),
  swish: () => sweep(320, 180, 0.07, 'triangle', 0.05),
  thud: () => {
    tone(105, 0.15, 'square', 0.1);
    tone(65, 0.2, 'triangle', 0.12, 0.005);
    tone(440, 0.07, 'sawtooth', 0.045, 0.05);
    tone(330, 0.11, 'sawtooth', 0.045, 0.12);
  },
  bell: () => {
    tone(1320, 0.5, 'sine', 0.07);
    tone(2640, 0.3, 'sine', 0.025);
    tone(1760, 0.3, 'sine', 0.025, 0.02);
  },
  pop: () => {
    sweep(600, 950, 0.09, 'sine', 0.12);
    burst(0.02, 0.18, 'highpass', 2500);
  },
  chew: () => {
    burst(0.04, 0.12, 'bandpass', 900);
    burst(0.04, 0.1, 'bandpass', 700, 0.09);
  },
  cash: () => {
    burst(0.06, 0.22, 'bandpass', 1800);
    tone(1568, 0.12, 'square', 0.05, 0.05);
    tone(2093, 0.28, 'triangle', 0.09, 0.1);
  },
  stamp: () => {
    tone(180, 0.09, 'square', 0.1);
    burst(0.03, 0.22, 'lowpass', 800);
  },
  coin: () => tone(1568, 0.05, 'sine', 0.06),
  tick: () => tone(1000, 0.03, 'square', 0.05),
  chime: () => {
    tone(880, 0.15, 'sine', 0.08);
    tone(1320, 0.28, 'sine', 0.08, 0.1);
  },
  crack: () => {
    burst(0.06, 0.3, 'bandpass', 1500);
    tone(2400, 0.04, 'square', 0.03);
  },
  spoil: () => sweep(420, 140, 0.45, 'sawtooth', 0.07),
  locked: () => {
    tone(220, 0.08, 'square', 0.06);
    tone(180, 0.1, 'square', 0.06, 0.08);
  },
  reveal: () => sweep(500, 900, 0.12, 'triangle', 0.06),
  boost: () => {
    tone(740, 0.08, 'square', 0.06);
    tone(1100, 0.1, 'square', 0.06, 0.07);
  },
  fail: () => {
    tone(300, 0.25, 'sawtooth', 0.07);
    tone(200, 0.4, 'sawtooth', 0.07, 0.22);
  },
  win: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.09));
  },
  blocked: () => tone(140, 0.13, 'square', 0.07),
};
