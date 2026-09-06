import { H, W } from '../data/constants';

export const cv = document.getElementById('c') as HTMLCanvasElement;
export const ctx = cv.getContext('2d') as CanvasRenderingContext2D;

/** Fit the 480x900 logical canvas to the window and size the backing store for the device pixel ratio. */
export function resize(): void {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H),
    dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.floor(W * dpr);
  cv.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
