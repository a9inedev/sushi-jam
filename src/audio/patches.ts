/* The authored sound set. Each entry is a Patch for synth.ts plus the spec that docs/audio.md is built from.
   Names match the sfx API used by the game code. */

import type { Layer, Patch } from './synth';

export type SfxName =
  | 'tap'
  | 'click'
  | 'swish'
  | 'thud'
  | 'bell'
  | 'pop'
  | 'chew'
  | 'stamp'
  | 'cash'
  | 'coin'
  | 'tick'
  | 'chime'
  | 'crack'
  | 'spoil'
  | 'locked'
  | 'reveal'
  | 'boost'
  | 'fail'
  | 'win'
  | 'blocked'
  | 'sting';

export type Bus = 'music' | 'sfx' | 'ui';

export interface SoundSpec {
  name: SfxName;
  trigger: string;
  bus: Bus;
  layering: string;
  patch: Patch;
}

const env = (a: number, d: number, s: number, r: number) => ({ a, d, s, r });
const osc = (
  wave: Layer['wave'],
  freq: Layer['freq'],
  gain: number,
  dur: number,
  e: Layer['env'],
  extra: Partial<Layer> = {}
): Layer => ({
  type: 'osc',
  wave,
  freq,
  gain,
  dur,
  env: e,
  ...extra,
});
const noise = (
  gain: number,
  dur: number,
  e: Layer['env'],
  filter: Layer['filter'],
  extra: Partial<Layer> = {}
): Layer => ({
  type: 'noise',
  gain,
  dur,
  env: e,
  filter,
  ...extra,
});

export const SOUNDS: SoundSpec[] = [
  {
    name: 'tap',
    trigger: 'a diner is tapped and starts walking',
    bus: 'sfx',
    layering: 'short triangle blip 520 to 470 Hz over a 10 ms high-passed click',
    patch: {
      dur: 0.09,
      level: 0.7,
      layers: [
        osc('triangle', { from: 520, to: 470 }, 1, 0.08, env(0.003, 0.05, 0.3, 0.03)),
        noise(0.5, 0.02, env(0.001, 0.015, 0, 0.005), { type: 'hp', freq: 3500 }),
      ],
    },
  },
  {
    name: 'click',
    trigger: 'any UI button, tab or toggle',
    bus: 'ui',
    layering: 'high-passed noise tick with a 1.2 kHz sine body, 30 ms',
    patch: {
      dur: 0.05,
      level: 0.5,
      layers: [
        noise(1, 0.03, env(0.001, 0.02, 0, 0.008), { type: 'hp', freq: 3000 }),
        osc('sine', 1200, 0.5, 0.035, env(0.001, 0.025, 0, 0.01)),
      ],
    },
  },
  {
    name: 'swish',
    trigger: 'blocked bump, first half: the diner lunges',
    bus: 'sfx',
    layering: 'band-passed noise sweeping 1.2 kHz to 300 Hz, 90 ms',
    patch: {
      dur: 0.1,
      level: 0.45,
      layers: [noise(1, 0.09, env(0.01, 0.06, 0.2, 0.02), { type: 'bp', freq: { from: 1200, to: 300 }, q: 1.2 })],
    },
  },
  {
    name: 'thud',
    trigger: 'blocked bump, second half: the diner hits the blocker',
    bus: 'sfx',
    layering: 'sine drop 110 to 55 Hz under low-passed noise, plus a 70 Hz square thump with drive',
    patch: {
      dur: 0.22,
      level: 0.85,
      layers: [
        osc('sine', { from: 110, to: 55 }, 1, 0.18, env(0.002, 0.12, 0.2, 0.05)),
        noise(0.6, 0.08, env(0.001, 0.05, 0, 0.02), { type: 'lp', freq: 400 }),
        osc('square', 70, 0.35, 0.1, env(0.002, 0.06, 0, 0.03), { drive: 0.6 }),
      ],
    },
  },
  {
    name: 'bell',
    trigger: 'a diner lands on a seat',
    bus: 'sfx',
    layering: 'three sines (1320, 2640, 1760 Hz) with fast attacks and a light echo: a counter bell',
    patch: {
      dur: 0.6,
      level: 0.6,
      echo: { time: 0.11, feedback: 0.25, mix: 0.3 },
      layers: [
        osc('sine', 1320, 1, 0.55, env(0.002, 0.35, 0.15, 0.15)),
        osc('sine', 2640, 0.3, 0.3, env(0.002, 0.2, 0.05, 0.08)),
        osc('sine', 1760, 0.35, 0.32, env(0.002, 0.22, 0.05, 0.08), { start: 0.02 }),
      ],
    },
  },
  {
    name: 'pop',
    trigger: 'a plate leaves the belt toward a diner',
    bus: 'sfx',
    layering: 'sine rising 600 to 950 Hz with a high-passed noise tick on the attack',
    patch: {
      dur: 0.11,
      level: 0.65,
      layers: [
        osc('sine', { from: 600, to: 950 }, 1, 0.09, env(0.004, 0.06, 0.2, 0.02)),
        noise(0.35, 0.02, env(0.001, 0.015, 0, 0.005), { type: 'hp', freq: 2500 }),
      ],
    },
  },
  {
    name: 'chew',
    trigger: 'the plate lands and the diner eats',
    bus: 'sfx',
    layering: 'two band-passed noise bites (900 and 700 Hz, 90 ms apart) each with a soft 180 Hz triangle',
    patch: {
      dur: 0.18,
      level: 0.5,
      layers: [
        noise(1, 0.045, env(0.002, 0.03, 0, 0.012), { type: 'bp', freq: 900, q: 1.4 }),
        osc('triangle', 180, 0.5, 0.05, env(0.002, 0.04, 0, 0.01)),
        noise(0.85, 0.045, env(0.002, 0.03, 0, 0.012), { type: 'bp', freq: 700, q: 1.4 }, { start: 0.09, seed: 3 }),
        osc('triangle', 160, 0.45, 0.05, env(0.002, 0.04, 0, 0.01), { start: 0.09 }),
      ],
    },
  },
  {
    name: 'stamp',
    trigger: 'a diner pays: the PAID stamp',
    bus: 'sfx',
    layering: 'square 180 Hz thump with driven low-passed noise, 90 ms',
    patch: {
      dur: 0.12,
      level: 0.7,
      layers: [
        osc('square', 180, 1, 0.09, env(0.002, 0.06, 0.1, 0.03), { drive: 0.4 }),
        noise(0.6, 0.04, env(0.001, 0.03, 0, 0.01), { type: 'lp', freq: 800 }),
      ],
    },
  },
  {
    name: 'cash',
    trigger: '220 ms after the stamp: the register',
    bus: 'sfx',
    layering: 'band-passed noise ka-ching, a 1568 Hz square and a 2093 Hz triangle ring with echo',
    patch: {
      dur: 0.45,
      level: 0.6,
      echo: { time: 0.09, feedback: 0.2, mix: 0.25 },
      layers: [
        noise(1, 0.06, env(0.001, 0.04, 0, 0.02), { type: 'bp', freq: 1800, q: 1.5 }),
        osc('square', 1568, 0.25, 0.14, env(0.002, 0.1, 0.1, 0.04), { start: 0.05 }),
        osc('triangle', 2093, 0.5, 0.32, env(0.003, 0.22, 0.1, 0.1), { start: 0.1 }),
      ],
    },
  },
  {
    name: 'coin',
    trigger: 'each coin reaches the counter',
    bus: 'sfx',
    layering: 'two sines, 1568 then 2093 Hz 30 ms later, 80 ms',
    patch: {
      dur: 0.12,
      level: 0.45,
      layers: [
        osc('sine', 1568, 1, 0.07, env(0.002, 0.05, 0.2, 0.02)),
        osc('sine', 2093, 0.6, 0.08, env(0.002, 0.06, 0.2, 0.02), { start: 0.03 }),
      ],
    },
  },
  {
    name: 'tick',
    trigger: 'each of the last three seconds of a wasabi timer',
    bus: 'sfx',
    layering: 'square 1 kHz, 30 ms',
    patch: { dur: 0.04, level: 0.4, layers: [osc('square', 1000, 1, 0.03, env(0.001, 0.02, 0.2, 0.01))] },
  },
  {
    name: 'chime',
    trigger: 'a chopstick lock opens, or the last ice cracks',
    bus: 'sfx',
    layering: 'three rising sines (880, 1320, 1760 Hz) staggered by 90 ms, with echo',
    patch: {
      dur: 0.6,
      level: 0.55,
      echo: { time: 0.13, feedback: 0.3, mix: 0.3 },
      layers: [
        osc('sine', 880, 1, 0.25, env(0.003, 0.18, 0.2, 0.06)),
        osc('sine', 1320, 0.9, 0.3, env(0.003, 0.22, 0.2, 0.08), { start: 0.09 }),
        osc('sine', 1760, 0.8, 0.34, env(0.003, 0.26, 0.2, 0.08), { start: 0.18 }),
      ],
    },
  },
  {
    name: 'crack',
    trigger: 'a tap on a frozen diner',
    bus: 'sfx',
    layering: 'band-passed noise crack at 1.5 kHz, a 2.4 kHz square splinter and a high-passed shatter 20 ms later',
    patch: {
      dur: 0.12,
      level: 0.7,
      layers: [
        noise(1, 0.06, env(0.001, 0.04, 0, 0.02), { type: 'bp', freq: 1500, q: 1.2 }),
        osc('square', 2400, 0.3, 0.04, env(0.001, 0.03, 0, 0.01)),
        noise(0.6, 0.05, env(0.001, 0.035, 0, 0.015), { type: 'hp', freq: 4000 }, { start: 0.02, seed: 5 }),
      ],
    },
  },
  {
    name: 'spoil',
    trigger: 'a wasabi plate expires',
    bus: 'sfx',
    layering: 'driven saw sliding 420 to 140 Hz over 450 ms with a low-passed noise hiss',
    patch: {
      dur: 0.5,
      level: 0.6,
      layers: [
        osc('saw', { from: 420, to: 140 }, 1, 0.45, env(0.01, 0.2, 0.5, 0.15), { drive: 0.5 }),
        noise(0.3, 0.3, env(0.02, 0.2, 0.2, 0.08), { type: 'lp', freq: 600 }),
      ],
    },
  },
  {
    name: 'locked',
    trigger: 'a tap on a chopstick-locked diner',
    bus: 'sfx',
    layering: 'two squares, 220 then 180 Hz, a falling "uh-uh"',
    patch: {
      dur: 0.2,
      level: 0.5,
      layers: [
        osc('square', 220, 1, 0.08, env(0.002, 0.05, 0.3, 0.02)),
        osc('square', 180, 1, 0.1, env(0.002, 0.06, 0.3, 0.03), { start: 0.08 }),
      ],
    },
  },
  {
    name: 'reveal',
    trigger: 'a covered plate shows its colour',
    bus: 'sfx',
    layering: 'triangle rising 500 to 900 Hz with a breathy high-passed noise',
    patch: {
      dur: 0.16,
      level: 0.5,
      layers: [
        osc('triangle', { from: 500, to: 900 }, 1, 0.12, env(0.005, 0.08, 0.2, 0.03)),
        noise(0.3, 0.06, env(0.005, 0.04, 0, 0.015), { type: 'hp', freq: 3000 }),
      ],
    },
  },
  {
    name: 'boost',
    trigger: 'a booster is used, a rescue lands',
    bus: 'sfx',
    layering: 'three-step square rise 740, 1100, then a 1480 Hz sine, 70 ms apart',
    patch: {
      dur: 0.3,
      level: 0.55,
      layers: [
        osc('square', 740, 1, 0.08, env(0.002, 0.05, 0.3, 0.02)),
        osc('square', 1100, 0.9, 0.1, env(0.002, 0.06, 0.3, 0.03), { start: 0.07 }),
        osc('sine', 1480, 1, 0.14, env(0.002, 0.1, 0.2, 0.04), { start: 0.14 }),
      ],
    },
  },
  {
    name: 'fail',
    trigger: 'kitchen jam: every seat taken and nothing matches',
    bus: 'sfx',
    layering: 'two driven saws (300 Hz, then 200 Hz at 220 ms) over a low-passed rumble',
    patch: {
      dur: 0.7,
      level: 0.7,
      layers: [
        osc('saw', 300, 1, 0.28, env(0.01, 0.15, 0.5, 0.08), { drive: 0.5 }),
        osc('saw', 200, 1, 0.42, env(0.01, 0.2, 0.5, 0.12), { start: 0.22, drive: 0.5 }),
        noise(0.4, 0.55, env(0.02, 0.3, 0.3, 0.15), { type: 'lp', freq: 300 }),
      ],
    },
  },
  {
    name: 'win',
    trigger: 'level cleared (sound effect; the music sting plays on top)',
    bus: 'sfx',
    layering: 'five triangle notes C5 E5 G5 C6 E6 stepping every 90 ms, a 2093 Hz sine shimmer, echo',
    patch: {
      dur: 0.9,
      level: 0.6,
      echo: { time: 0.14, feedback: 0.25, mix: 0.3 },
      layers: [523, 659, 784, 1046, 1318]
        .map((f, i) => osc('triangle', f, 1, 0.22, env(0.003, 0.15, 0.3, 0.06), { start: i * 0.09 }))
        .concat([osc('sine', 2093, 0.5, 0.4, env(0.005, 0.3, 0.1, 0.1), { start: 0.45 })]),
    },
  },
  {
    name: 'blocked',
    trigger: 'a tap when no seat is free',
    bus: 'sfx',
    layering: 'square 140 Hz buzz with low-passed noise, 130 ms',
    patch: {
      dur: 0.16,
      level: 0.5,
      layers: [
        osc('square', 140, 1, 0.13, env(0.002, 0.08, 0.4, 0.04)),
        noise(0.4, 0.1, env(0.002, 0.06, 0.2, 0.03), { type: 'lp', freq: 300 }),
      ],
    },
  },
  {
    name: 'sting',
    trigger: 'level cleared: the music sting on the music bus',
    bus: 'music',
    layering: 'koto pluck arpeggio D5 F#5 A5 D6 every 110 ms with a bell on the last note and long echo',
    patch: {
      dur: 1.6,
      level: 0.7,
      echo: { time: 0.18, feedback: 0.35, mix: 0.4 },
      layers: [587.33, 739.99, 880, 1174.66]
        .map((f, i) =>
          osc('triangle', f, 1, 0.5, env(0.002, 0.3, 0.2, 0.15), {
            start: i * 0.11,
            filter: { type: 'lp', freq: { from: 5000, to: 1500 } },
          })
        )
        .concat([
          osc('sine', 2349.32, 0.5, 0.9, env(0.003, 0.5, 0.2, 0.3), { start: 0.33 }),
          osc('sine', 1174.66, 0.35, 0.9, env(0.003, 0.5, 0.2, 0.3), { start: 0.33 }),
        ]),
    },
  },
];

export const PATCHES: Record<SfxName, Patch> = Object.fromEntries(SOUNDS.map((s) => [s.name, s.patch])) as Record<
  SfxName,
  Patch
>;

export const BUS_OF: Record<SfxName, Bus> = Object.fromEntries(SOUNDS.map((s) => [s.name, s.bus])) as Record<
  SfxName,
  Bus
>;

/* ---------- music instruments, rendered once at their base pitch and repitched by playback rate ---------- */

export type InstrumentName = 'pluck' | 'pad' | 'bass' | 'taiko' | 'shaker' | 'drone';

export interface InstrumentSpec {
  name: InstrumentName;
  /** MIDI note the sample was rendered at (percussion: 60). */
  baseMidi: number;
  description: string;
  patch: Patch;
}

export const INSTRUMENTS: InstrumentSpec[] = [
  {
    name: 'pluck',
    baseMidi: 60,
    description: 'koto-like pluck: triangle + sine octave, low-pass closing from 5 kHz to 1.2 kHz, noise attack',
    patch: {
      dur: 0.9,
      level: 0.8,
      layers: [
        osc('triangle', 261.63, 1, 0.9, env(0.002, 0.4, 0.15, 0.25), {
          filter: { type: 'lp', freq: { from: 5000, to: 1200 } },
        }),
        osc('sine', 523.25, 0.35, 0.5, env(0.002, 0.25, 0.1, 0.1)),
        noise(0.25, 0.015, env(0.001, 0.01, 0, 0.004), { type: 'hp', freq: 3000 }),
      ],
    },
  },
  {
    name: 'pad',
    baseMidi: 60,
    description: 'soft pad: two slightly detuned sines and a sub triangle, slow attack, low-passed',
    patch: {
      dur: 2.6,
      level: 0.6,
      layers: [
        osc('sine', 261.63, 1, 2.6, env(0.35, 0.3, 0.8, 0.7), { vibrato: { rate: 4.5, depth: 1.2 } }),
        osc('sine', 262.9, 0.8, 2.6, env(0.4, 0.3, 0.8, 0.7)),
        osc('triangle', 130.81, 0.45, 2.6, env(0.35, 0.3, 0.8, 0.7), { filter: { type: 'lp', freq: 900 } }),
      ],
    },
  },
  {
    name: 'bass',
    baseMidi: 36,
    description: 'round bass: sine + triangle at C2, low-passed at 500 Hz',
    patch: {
      dur: 0.9,
      level: 0.8,
      layers: [
        osc('sine', 65.41, 1, 0.9, env(0.005, 0.3, 0.5, 0.25)),
        osc('triangle', 65.41, 0.4, 0.9, env(0.005, 0.3, 0.5, 0.25), { filter: { type: 'lp', freq: 500 } }),
      ],
    },
  },
  {
    name: 'taiko',
    baseMidi: 60,
    description: 'taiko drum: sine dropping 95 to 48 Hz with drive and a low-passed noise slap',
    patch: {
      dur: 0.45,
      level: 0.9,
      layers: [
        osc('sine', { from: 95, to: 48 }, 1, 0.42, env(0.002, 0.25, 0.2, 0.12), { drive: 0.4 }),
        noise(0.5, 0.05, env(0.001, 0.035, 0, 0.012), { type: 'lp', freq: 350 }),
      ],
    },
  },
  {
    name: 'shaker',
    baseMidi: 60,
    description: 'shaker: high-passed noise, 50 ms',
    patch: {
      dur: 0.08,
      level: 0.5,
      layers: [noise(1, 0.06, env(0.004, 0.04, 0.1, 0.015), { type: 'hp', freq: 6500 })],
    },
  },
  {
    name: 'drone',
    baseMidi: 36,
    description: 'tension drone: detuned saws an octave apart, low-passed and slow',
    patch: {
      dur: 3,
      level: 0.55,
      layers: [
        osc('saw', 65.41, 1, 3, env(0.5, 0.5, 0.8, 0.8), { filter: { type: 'lp', freq: 320 } }),
        osc('saw', 65.9, 0.8, 3, env(0.5, 0.5, 0.8, 0.8), { filter: { type: 'lp', freq: 320 } }),
        osc('sine', 32.7, 0.6, 3, env(0.5, 0.5, 0.8, 0.8)),
      ],
    },
  },
];

export const INSTRUMENT_PATCH: Record<InstrumentName, InstrumentSpec> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.name, i])
) as Record<InstrumentName, InstrumentSpec>;
