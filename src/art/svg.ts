/* Rasterises SVG strings into cached canvases at exact device-pixel sizes. Sprites are requested by key;
   the first request kicks off an async decode and returns null, later requests return the cached canvas. */

type Entry = HTMLCanvasElement | 'pending' | 'failed';
const cache = new Map<string, Entry>();

export function dpr(): number {
  return Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
}

export function rasterize(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const scale = dpr();
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        const g = c.getContext('2d');
        if (!g) return reject(new Error('no 2d context'));
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('svg decode failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function cacheKey(key: string, w: number, h: number): string {
  return `${key}@${w}x${h}@${dpr()}`;
}

/** The cached canvas for a sprite, or null while it is still decoding (or if decoding failed). */
export function sprite(key: string, svg: () => string, w: number, h: number): HTMLCanvasElement | null {
  const k = cacheKey(key, w, h);
  const hit = cache.get(k);
  if (hit && hit !== 'pending' && hit !== 'failed') return hit;
  if (hit === undefined) {
    cache.set(k, 'pending');
    rasterize(svg(), w, h).then(
      (c) => cache.set(k, c),
      () => cache.set(k, 'failed')
    );
  }
  return null;
}

export function spriteReady(key: string, w: number, h: number): boolean {
  const hit = cache.get(cacheKey(key, w, h));
  return !!hit && hit !== 'pending' && hit !== 'failed';
}

export interface PreloadEntry {
  key: string;
  svg: () => string;
  w: number;
  h: number;
}

/** Decode a batch up front so the first frame already has its art. Resolves when every entry settled. */
export async function preload(entries: PreloadEntry[]): Promise<{ ok: number; failed: number }> {
  let ok = 0,
    failed = 0;
  await Promise.all(
    entries.map(async (e) => {
      const k = cacheKey(e.key, e.w, e.h);
      const hit = cache.get(k);
      if (hit && hit !== 'pending' && hit !== 'failed') {
        ok++;
        return;
      }
      cache.set(k, 'pending');
      try {
        cache.set(k, await rasterize(e.svg(), e.w, e.h));
        ok++;
      } catch {
        cache.set(k, 'failed');
        failed++;
      }
    })
  );
  return { ok, failed };
}

/** Drop every cached sprite, e.g. after a device pixel ratio change. */
export function clearSprites(): void {
  cache.clear();
}

export function spriteCount(): number {
  let n = 0;
  for (const v of cache.values()) if (v !== 'pending' && v !== 'failed') n++;
  return n;
}
