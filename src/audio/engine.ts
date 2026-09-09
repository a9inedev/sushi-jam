/* Web Audio engine: the mixer (master, music, sfx, ui buses), buffer playback, the music sequencer, iOS unlock,
   and interruption handling. Sounds are rendered from patches into AudioBuffers on the first user gesture. */

import { INSTRUMENTS, PATCHES, SOUNDS, type Bus, type InstrumentName, type SfxName } from './patches';
import type { MusicPalette } from '../data/themes';
import { buildLoop, LOOP_SECONDS, loopSecondsFor, midiToRate, type MusicLayer, type NoteEvent } from './music';
import { renderPatch } from './synth';

export interface Volumes {
  master: boolean;
  music: number;
  sfx: number;
  ui: number;
}

type Ctor = typeof AudioContext;

const LOOKAHEAD = 0.15;
const TICK_MS = 40;

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;
  private layers: Record<MusicLayer, GainNode> | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private rendered = false;
  private loop: NoteEvent[] = buildLoop();
  private loopLen = LOOP_SECONDS;
  private loopStart = 0;
  private nextIdx = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volumes: Volumes = { master: true, music: 0.6, sfx: 1, ui: 0.8 };
  private background = false;
  private tension = 0;
  private musicOn = false;
  private duckUntil = 0;
  unlocked = false;
  /** Set by the host: how the engine should log unusual state changes (tests inspect this). */
  events: string[] = [];

  private note(e: string): void {
    this.events.push(e);
    if (this.events.length > 40) this.events.shift();
  }

  /** Must be called from a user gesture. Creates the context, resumes it, renders every sound. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor: Ctor | undefined =
          window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor({ latencyHint: 'interactive' });
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.connect(ctx.destination);
        const mk = () => {
          const g = ctx.createGain();
          g.connect(this.master as GainNode);
          return g;
        };
        this.buses = { music: mk(), sfx: mk(), ui: mk() };
        const layer = () => {
          const g = ctx.createGain();
          g.connect(this.buses!.music);
          return g;
        };
        this.layers = { calm: layer(), tense: layer() };
        this.layers.tense.gain.value = 0;
        ctx.onstatechange = () => {
          this.note('state:' + ctx.state);
          if (ctx.state === 'running' && this.musicOn) this.resync();
        };
        this.applyVolumes();
      }
      const ctx = this.ctx;
      if (ctx.state !== 'running') void ctx.resume().catch(() => {});
      // iOS needs an actual (silent) buffer to start from inside the gesture.
      if (!this.unlocked) {
        const b = ctx.createBuffer(1, 1, ctx.sampleRate);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
        this.unlocked = true;
        this.note('unlocked');
      }
      if (!this.rendered) this.renderAll();
      if (!this.musicOn) this.startMusic();
    } catch {
      /* no audio on this device; the game plays silently */
    }
  }

  /** Render every patch and instrument into AudioBuffers. Runs once, synchronously, a few milliseconds. */
  renderAll(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const sr = ctx.sampleRate;
    const put = (key: string, samples: Float32Array) => {
      const buf = ctx.createBuffer(1, samples.length, sr);
      buf.getChannelData(0).set(samples);
      this.buffers.set(key, buf);
    };
    for (const s of SOUNDS) put(s.name, renderPatch(s.patch, sr).samples);
    for (const i of INSTRUMENTS) put('inst:' + i.name, renderPatch(i.patch, sr).samples);
    this.rendered = true;
    this.note('rendered ' + this.buffers.size);
  }

  get ready(): boolean {
    return !!this.ctx && this.rendered;
  }

  state(): string {
    return this.ctx ? this.ctx.state : 'none';
  }

  bufferCount(): number {
    return this.buffers.size;
  }

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.buses || !this.master) return;
    const t = this.ctx.currentTime;
    const on = this.volumes.master && !this.background ? 1 : 0;
    this.master.gain.setTargetAtTime(on, t, 0.03);
    this.buses.music.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.buses.ui.gain.setTargetAtTime(this.volumes.ui, t, 0.05);
  }

  /** Play a named sound on its bus. Safe before unlock (no-op). */
  play(name: SfxName, opts: { gain?: number; rate?: number; bus?: Bus } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.buses || !this.volumes.master || this.background) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const g = ctx.createGain();
      g.gain.value = opts.gain ?? 1;
      const bus = opts.bus || SOUNDS.find((s) => s.name === name)?.bus || 'sfx';
      src.connect(g).connect(this.buses[bus]);
      src.start();
    } catch {
      /* ignore */
    }
  }

  /* ---------- music ---------- */

  private playNote(e: NoteEvent, when: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.layers) return;
    const buf = this.buffers.get('inst:' + e.inst);
    if (!buf) return;
    const base = INSTRUMENTS.find((i) => i.name === e.inst)?.baseMidi ?? 60;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = midiToRate(e.midi, base);
    const g = ctx.createGain();
    g.gain.value = e.vel;
    src.connect(g).connect(this.layers[e.layer]);
    src.start(when);
  }

  startMusic(): void {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.resync();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.note('music:start');
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Retune the loop for a restaurant: key, tempo and layer mix. The clock restarts so the change is clean. */
  setPalette(p: MusicPalette): void {
    this.loop = buildLoop(p);
    this.loopLen = loopSecondsFor(p);
    if (this.musicOn) this.resync();
    this.note('music:palette:' + p.bpm + ':' + p.transpose);
  }

  /** Restart the loop clock from now, e.g. after an interruption, so no burst of missed notes plays. */
  resync(): void {
    if (!this.ctx) return;
    this.loopStart = this.ctx.currentTime + 0.05;
    this.nextIdx = 0;
    this.note('music:resync');
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicOn || ctx.state !== 'running' || this.background) return;
    const now = ctx.currentTime;
    // Schedule every event whose absolute time falls inside the lookahead window, wrapping the loop.
    let guard = 0;
    while (guard++ < 64) {
      if (this.nextIdx >= this.loop.length) {
        this.loopStart += this.loopLen;
        this.nextIdx = 0;
      }
      const e = this.loop[this.nextIdx];
      const when = this.loopStart + e.t;
      if (when > now + LOOKAHEAD) break;
      if (when >= now - 0.02) this.playNote(e, Math.max(when, now));
      this.nextIdx++;
    }
    if (this.layers) {
      const t = ctx.currentTime;
      const duck = t < this.duckUntil ? 0.35 : 1;
      this.layers.calm.gain.setTargetAtTime(duck, t, 0.15);
      this.layers.tense.gain.setTargetAtTime(this.tension * 0.9 * duck, t, 0.3);
    }
  }

  /** 0..1 belt tension; the tense layer follows it. */
  setTension(v: number): void {
    this.tension = Math.max(0, Math.min(1, v));
  }

  /** Level-clear sting: plays on the music bus and ducks the loop for 1.6 s. */
  sting(): void {
    if (!this.ctx) return;
    this.duckUntil = this.ctx.currentTime + 1.6;
    this.play('sting', { bus: 'music' });
  }

  /* ---------- interruptions ---------- */

  /** Backgrounded (tab hidden, app inactive, phone call): mute at once and suspend the context. */
  setBackground(bg: boolean): void {
    if (bg === this.background) return;
    this.background = bg;
    this.applyVolumes();
    const ctx = this.ctx;
    if (!ctx) return;
    if (bg) {
      this.note('background');
      void ctx.suspend().catch(() => {});
    } else {
      this.note('foreground');
      void ctx
        .resume()
        .then(() => this.resync())
        .catch(() => {});
    }
  }

  isBackground(): boolean {
    return this.background;
  }
}

export const engine = new AudioEngine();

/** Wire the document-level unlock and interruption listeners once. */
export function bindAudio(): void {
  const unlock = () => engine.unlock();
  for (const ev of ['pointerdown', 'touchend', 'keydown'] as const)
    document.addEventListener(ev, unlock, { passive: true });
  document.addEventListener('visibilitychange', () => engine.setBackground(document.visibilityState !== 'visible'));
  window.addEventListener('pagehide', () => engine.setBackground(true));
  window.addEventListener('pageshow', () => engine.setBackground(document.visibilityState !== 'visible'));
}

export function instrumentNames(): InstrumentName[] {
  return INSTRUMENTS.map((i) => i.name);
}

export { PATCHES };
