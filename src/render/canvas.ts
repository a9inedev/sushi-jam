import { H, W } from '../data/constants';

export const cv = document.getElementById('c') as HTMLCanvasElement;
export const ctx = cv.getContext('2d') as CanvasRenderingContext2D;

/** Space available inside #wrap after its safe-area padding, falling back to the window size. */
function available(): { w: number; h: number } {
  const wrap = cv.parentElement;
  if (!wrap) return { w: window.innerWidth, h: window.innerHeight };
  const cs = getComputedStyle(wrap);
  const w = wrap.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
  const h = wrap.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0');
  return w > 0 && h > 0 ? { w, h } : { w: window.innerWidth, h: window.innerHeight };
}

/** Fit the 480x900 logical canvas to the safe area and size the backing store for the device pixel ratio. */
export function resize(): void {
  const a = available();
  const s = Math.min(a.w / W, a.h / H),
    dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.floor(W * dpr);
  cv.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
