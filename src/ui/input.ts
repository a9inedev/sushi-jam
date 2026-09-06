import { audio } from '../audio/audio';
import { H, W } from '../data/constants';
import { handleArmed, hitGridDiner, logStat, nextMechCard, tryMove } from '../engine/rules';
import { G } from '../engine/state';
import { save } from '../meta/save';
import { cv } from '../render/canvas';
import { inRect } from '../render/primitives';

/** A tap in logical canvas coordinates. Buttons drawn this frame take priority over the board. */
export function onTap(x: number, y: number): void {
  audio();
  for (const b of G.buttons)
    if (inRect(x, y, b)) {
      b.onTap();
      return;
    }
  const L = G.L;
  if (G.screen || !L) return;
  if (L.status === 'intro') {
    L.introT = 1.4;
    return;
  }
  if (L.status === 'mech') {
    nextMechCard();
    return;
  }
  if (L.status !== 'play') return;
  L.stat.taps++;
  if (L.armed) {
    handleArmed(x, y);
    return;
  }
  const d = hitGridDiner(x, y);
  if (d) tryMove(d);
}

export function bindInput(): void {
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    onTap(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  });
  window.addEventListener('pagehide', () => {
    if (G.L && G.L.status === 'play' && G.L.stat.taps > 0) {
      logStat('quit');
      save();
    }
  });
}
