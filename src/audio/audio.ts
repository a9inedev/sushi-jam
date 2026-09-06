/* The sound API the game code calls. Names map to authored patches in patches.ts; playback goes through the
   engine's buses. Volumes and the master switch come from the save. */

import { S } from '../meta/save';
import { engine } from './engine';
import type { SfxName } from './patches';

/** Push the save's audio settings into the mixer. Call after any settings change. */
export function applyVolumes(): void {
  engine.setVolumes({ master: S.sound, music: S.volMusic, sfx: S.volSfx, ui: S.volUi });
}

/** Create/resume the context from a user gesture (also renders the sound set on first call). */
export function audio(): void {
  engine.unlock();
  applyVolumes();
}

export function audioContext(): AudioContext | null {
  return engine.ctx;
}

/** Belt tension drives the tense music layer. */
export function setTension(level: number): void {
  engine.setTension(level);
}

const p = (name: SfxName) => () => engine.play(name);

export const sfx = {
  tap: p('tap'),
  /** UI clicks: buttons, tabs, toggles. */
  ui: p('click'),
  click: p('click'),
  swish: p('swish'),
  thud: p('thud'),
  bell: p('bell'),
  pop: p('pop'),
  chew: p('chew'),
  cash: p('cash'),
  stamp: p('stamp'),
  coin: p('coin'),
  tick: p('tick'),
  chime: p('chime'),
  crack: p('crack'),
  spoil: p('spoil'),
  locked: p('locked'),
  reveal: p('reveal'),
  boost: p('boost'),
  fail: p('fail'),
  win: () => {
    engine.play('win');
    engine.sting();
  },
  blocked: p('blocked'),
};
