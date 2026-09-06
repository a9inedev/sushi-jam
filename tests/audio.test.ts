import { describe, expect, it } from 'vitest';
import {
  BEAT,
  buildLoop,
  INSTRUMENTS,
  LOOP_SECONDS,
  midiToRate,
  PENTATONIC,
  renderPatch,
  SOUNDS,
  toWav,
} from '../src/audio/index';

const REQUIRED = [
  'tap',
  'click',
  'swish',
  'thud',
  'bell',
  'pop',
  'chew',
  'stamp',
  'cash',
  'coin',
  'tick',
  'chime',
  'crack',
  'spoil',
  'locked',
  'reveal',
  'boost',
  'fail',
  'win',
  'blocked',
  'sting',
];

describe('sound set', () => {
  it('covers every sound in the spec list', () => {
    const names = SOUNDS.map((s) => s.name);
    for (const r of REQUIRED) expect(names, r).toContain(r);
    expect(new Set(names).size).toBe(names.length);
    for (const s of SOUNDS) expect(s.trigger.length, s.name).toBeGreaterThan(8);
  });

  it('every patch renders a non-silent buffer within its stated duration and peak', () => {
    for (const s of SOUNDS) {
      const r = renderPatch(s.patch, 22050);
      expect(r.samples.length).toBe(Math.round(s.patch.dur * 22050));
      let peak = 0,
        energy = 0;
      for (const v of r.samples) {
        peak = Math.max(peak, Math.abs(v));
        energy += v * v;
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(peak, s.name + ' peak').toBeLessThanOrEqual(1.0001);
      expect(peak, s.name + ' peak').toBeGreaterThan(0.2);
      expect(energy / r.samples.length, s.name + ' energy').toBeGreaterThan(1e-4);
      // The last sample is faded to avoid clicks.
      expect(Math.abs(r.samples[r.samples.length - 1])).toBeLessThan(0.02);
    }
  });

  it('sound effects are short and the sting is the only long one', () => {
    for (const s of SOUNDS) {
      if (s.name === 'sting') expect(s.patch.dur).toBeLessThanOrEqual(2);
      else expect(s.patch.dur, s.name).toBeLessThanOrEqual(1);
    }
  });

  it('rendering is deterministic', () => {
    const a = renderPatch(SOUNDS[0].patch, 8000).samples;
    const b = renderPatch(SOUNDS[0].patch, 8000).samples;
    expect(Array.from(a.slice(0, 200))).toEqual(Array.from(b.slice(0, 200)));
  });

  it('writes a valid WAV header', () => {
    const r = renderPatch(SOUNDS[1].patch, 8000);
    const w = toWav(r);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    expect(w.length).toBe(44 + r.samples.length * 2);
  });
});

describe('instruments', () => {
  it('render and have a base pitch', () => {
    for (const i of INSTRUMENTS) {
      const r = renderPatch(i.patch, 22050);
      expect(r.peak, i.name).toBeGreaterThan(0.3);
      expect(i.baseMidi).toBeGreaterThan(0);
    }
  });
});

describe('music loop', () => {
  it('is 8 bars of 4/4 at 84 bpm with events inside the loop', () => {
    const ev = buildLoop();
    expect(LOOP_SECONDS).toBeCloseTo(8 * 4 * BEAT);
    expect(ev.length).toBeGreaterThan(80);
    for (const e of ev) {
      expect(e.t).toBeGreaterThanOrEqual(0);
      expect(e.t).toBeLessThan(LOOP_SECONDS);
    }
    for (let i = 1; i < ev.length; i++) expect(ev[i].t).toBeGreaterThanOrEqual(ev[i - 1].t);
  });

  it('melody stays in D major pentatonic and both layers are present', () => {
    const ev = buildLoop();
    const plucks = ev.filter((e) => e.inst === 'pluck');
    expect(plucks.length).toBeGreaterThan(15);
    for (const p of plucks) expect(PENTATONIC.has(p.midi % 12), 'midi ' + p.midi).toBe(true);
    expect(ev.some((e) => e.layer === 'calm')).toBe(true);
    expect(ev.some((e) => e.layer === 'tense')).toBe(true);
    expect(ev.filter((e) => e.inst === 'taiko').length).toBeGreaterThanOrEqual(16);
  });

  it('midi to playback rate', () => {
    expect(midiToRate(60, 60)).toBe(1);
    expect(midiToRate(72, 60)).toBe(2);
    expect(midiToRate(48, 60)).toBe(0.5);
  });
});
