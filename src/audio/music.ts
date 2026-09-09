/* The music as data: an 8-bar calm loop in D major pentatonic at 84 bpm and a tension layer that the
   engine fades in with belt fill. Pure: the engine schedules these events; tests and the WAV export read them. */

import type { InstrumentName } from './patches';

import { THEMES, type MusicPalette } from '../data/themes';

export const BPM = 84;
export const BEATS_PER_BAR = 4;
export const LOOP_BARS = 8;
export const BEAT = 60 / BPM;
export const LOOP_SECONDS = LOOP_BARS * BEATS_PER_BAR * BEAT;

export type MusicLayer = 'calm' | 'tense';

export interface NoteEvent {
  /** Seconds from the loop start. */
  t: number;
  inst: InstrumentName;
  midi: number;
  vel: number;
  layer: MusicLayer;
}

/* D major pentatonic: D E F# A B */
const D4 = 62,
  E4 = 64,
  Fs4 = 66,
  A4 = 69,
  B4 = 71,
  D5 = 74,
  E5 = 76,
  Fs5 = 78,
  A5 = 81,
  B5 = 83;

/** Melody per bar: [beat, midi, velocity]. Sparse, koto phrasing, resolves to D every fourth bar. */
const MELODY: [number, number, number][][] = [
  [
    [0, D5, 0.9],
    [1.5, Fs5, 0.7],
    [2.5, A5, 0.8],
  ],
  [
    [0.5, B4, 0.7],
    [2, A4, 0.75],
    [3, Fs4, 0.6],
  ],
  [
    [0, E5, 0.85],
    [1, D5, 0.7],
    [2.5, B4, 0.75],
    [3.5, A4, 0.55],
  ],
  [[0, D5, 0.9]],
  [
    [0, A5, 0.85],
    [1.5, B5, 0.7],
    [2.5, A5, 0.75],
    [3, Fs5, 0.6],
  ],
  [
    [0.5, E5, 0.75],
    [2, D5, 0.8],
  ],
  [
    [0, B4, 0.8],
    [1, D5, 0.7],
    [2, E5, 0.75],
    [3, Fs5, 0.7],
  ],
  [
    [0, D5, 0.9],
    [2, A4, 0.5],
  ],
];

/** Pad chords by bar: root midi values for the three voices (D, Bm, G, A). */
const CHORDS: number[][] = [
  [D4, Fs4, A4],
  [D4, Fs4, A4],
  [B4 - 12, D4, Fs4],
  [B4 - 12, D4, Fs4],
  [55, B4 - 12, D4],
  [55, B4 - 12, D4],
  [57, 61, E4],
  [D4, Fs4, A4],
];

const BASS_ROOTS = [38, 38, 35, 35, 31, 31, 33, 38];

export function buildLoop(p: MusicPalette = THEMES[0].music): NoteEvent[] {
  const ev: NoteEvent[] = [];
  const beat = 60 / p.bpm,
    bar = BEATS_PER_BAR * beat,
    tr = p.transpose;
  const lead = p.lead,
    chord = p.lead === 'pad' ? 'pluck' : 'pad';
  for (let b = 0; b < LOOP_BARS; b++) {
    const t0 = b * bar;
    for (const [bt, midi, vel] of MELODY[b])
      ev.push({ t: t0 + bt * beat, inst: lead, midi: midi + tr + p.octave, vel, layer: 'calm' });
    if (b % 2 === 0)
      for (const m of CHORDS[b])
        ev.push({ t: t0, inst: chord, midi: m + tr, vel: chord === 'pluck' ? 0.35 : 0.5, layer: 'calm' });
    ev.push({ t: t0, inst: 'bass', midi: BASS_ROOTS[b] + tr, vel: 0.7, layer: 'calm' });
    if (b % 2 === 1) ev.push({ t: t0 + 2 * beat, inst: 'bass', midi: BASS_ROOTS[b] + tr, vel: 0.5, layer: 'calm' });
    if (p.calmShaker)
      for (let e = 0; e < 8; e++)
        ev.push({ t: t0 + e * 0.5 * beat, inst: 'shaker', midi: 60, vel: e % 2 ? 0.2 : 0.35, layer: 'calm' });
    if (p.calmDrone && b % 2 === 0)
      ev.push({ t: t0, inst: 'drone', midi: BASS_ROOTS[b] + tr, vel: 0.45, layer: 'calm' });
    // Tension layer: taiko on 1 and 3 (and the "and" of 4 on even bars), shakers on eighths, a drone every two bars.
    if (p.tensePercussion) {
      ev.push({ t: t0, inst: 'taiko', midi: 60, vel: 0.95, layer: 'tense' });
      ev.push({ t: t0 + 2 * beat, inst: 'taiko', midi: 60, vel: 0.8, layer: 'tense' });
      if (b % 2 === 0) ev.push({ t: t0 + 3.5 * beat, inst: 'taiko', midi: 62, vel: 0.6, layer: 'tense' });
    }
    for (let e = 0; e < 8; e++)
      ev.push({ t: t0 + e * 0.5 * beat, inst: 'shaker', midi: 60, vel: e % 2 ? 0.35 : 0.6, layer: 'tense' });
    if (b % 2 === 0) ev.push({ t: t0, inst: 'drone', midi: BASS_ROOTS[b] + tr, vel: 0.7, layer: 'tense' });
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/** Loop length for a palette (the tempo changes it). */
export function loopSecondsFor(p: MusicPalette): number {
  return LOOP_BARS * BEATS_PER_BAR * (60 / p.bpm);
}

export function midiToRate(midi: number, baseMidi: number): number {
  return Math.pow(2, (midi - baseMidi) / 12);
}

export const PENTATONIC = new Set([D4, E4, Fs4, A4, B4, D5, E5, Fs5, A5, B5].map((m) => m % 12));
