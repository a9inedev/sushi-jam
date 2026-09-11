import { audio } from '../audio/audio';
import { H, W } from '../data/constants';
import { handleArmed, hitGridDiner, logStat, nextMechCard, tryMove } from '../engine/rules';
import { G } from '../engine/state';
import { save } from '../meta/save';
import { cv } from '../render/canvas';
import { inRect } from '../render/primitives';
import { tutorialTap } from './tutorial';

/** A tap in logical canvas coordinates. Buttons drawn this frame take priority over the board. */
export function onTap(x: number, y: number): void {
  audio();
  for (const b of G.buttons)
    if (inRect(x, y, b)) {
      // One-frame press: the box is drawn pressed for the next few frames even if the pointer lifts at once.
      G.pressed = { x: b.x, y: b.y, w: b.w, h: b.h, until: G.gt + 0.09 };
      if (b.onDrag) {
        b.onDrag(x, y);
        G.drag = b;
      } else b.onTap();
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
  if (tutorialTap(x, y)) return;
  if (L.armed) {
    handleArmed(x, y);
    return;
  }
  const d = hitGridDiner(x, y);
  if (d) tryMove(d);
}

function toGame(e: PointerEvent): { x: number; y: number } {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

export function bindInput(): void {
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = toGame(e);
    G.pointer.x = p.x;
    G.pointer.y = p.y;
    G.pointer.down = true;
    onTap(p.x, p.y);
    if (G.drag) {
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        /* not all browsers allow capture here */
      }
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const q = toGame(e);
    G.pointer.x = q.x;
    G.pointer.y = q.y;
    G.pointer.hover = e.pointerType === 'mouse';
    if (!G.drag || !G.drag.onDrag) return;
    e.preventDefault();
    const p = toGame(e);
    G.drag.onDrag(p.x, p.y);
  });
  const end = () => {
    G.drag = null;
    G.pointer.down = false;
  };
  cv.addEventListener('pointerleave', () => {
    G.pointer.x = -1;
    G.pointer.y = -1;
    G.pointer.hover = false;
  });
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  window.addEventListener('pagehide', () => {
    if (G.L && G.L.status === 'play' && G.L.stat.taps > 0) {
      logStat('quit');
      save();
    }
  });
}
