/* Every piece of SVG art must rasterise, cover a sane share of its box, and the seven characters must have
   silhouettes that differ from one another at 40 px. Uses sharp (librsvg) as an independent renderer. */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  SPRITE_STATES,
  SUSHI,
  backgroundSvg,
  bonsaiSvg,
  characterSvg,
  foodSvg,
  lanternSvg,
  norenSvg,
  tankSvg,
} from '../src/art/index';

async function alphaMask(svg: string, size: number, sourceSize = 100): Promise<Uint8Array> {
  const density = Math.max(1, (72 * size) / sourceSize);
  const { data, info } = await sharp(Buffer.from(svg), { density })
    .resize(size, size, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) mask[p] = data[i + 3] > 40 ? 1 : 0;
  return mask;
}

function coverage(mask: Uint8Array): number {
  let n = 0;
  for (const v of mask) n += v;
  return n / mask.length;
}

function difference(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n / a.length;
}

describe('characters', () => {
  it('every character and state rasterises at 40 px with a solid body', async () => {
    for (const c of CHARACTERS)
      for (const st of SPRITE_STATES)
        for (const vip of [false, true]) {
          const cov = coverage(await alphaMask(characterSvg(c.color, st, vip), 40));
          expect(cov, `${c.id}/${st}${vip ? '/vip' : ''}`).toBeGreaterThan(0.3);
          expect(cov, `${c.id}/${st}${vip ? '/vip' : ''}`).toBeLessThan(0.85);
        }
  });

  it('the seven silhouettes differ from each other at 40 px', async () => {
    const masks = await Promise.all(CHARACTERS.map((c) => alphaMask(characterSvg(c.color, 'idle'), 40)));
    for (let i = 0; i < masks.length; i++)
      for (let j = i + 1; j < masks.length; j++) {
        const d = difference(masks[i], masks[j]);
        expect(d, `${CHARACTERS[i].id} vs ${CHARACTERS[j].id}`).toBeGreaterThan(0.04);
      }
  });

  it('states differ from idle so expressions read', async () => {
    for (const c of CHARACTERS.slice(0, 3)) {
      const idle = await alphaMask(characterSvg(c.color, 'idle'), 64);
      for (const st of SPRITE_STATES.filter((s) => s !== 'idle')) {
        // Compare the rendered RGB, not just alpha: a mouth change keeps the silhouette but changes pixels.
        const a = await sharp(Buffer.from(characterSvg(c.color, 'idle')), { density: 46 })
          .resize(64, 64)
          .raw()
          .toBuffer();
        const b = await sharp(Buffer.from(characterSvg(c.color, st)), { density: 46 })
          .resize(64, 64)
          .raw()
          .toBuffer();
        let diff = 0;
        for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 24) diff++;
        expect(diff / a.length, `${c.id}/${st}`).toBeGreaterThan(0.005);
      }
      expect(idle.length).toBe(64 * 64);
    }
  });
});

describe('sushi', () => {
  it('every plate colour has food that rasterises and fills a sensible share of the plate', async () => {
    for (const s of SUSHI) {
      const cov = coverage(await alphaMask(foodSvg(s.color), 26));
      expect(cov, s.id).toBeGreaterThan(0.12);
      expect(cov, s.id).toBeLessThan(0.7);
    }
    expect(foodSvg(99)).toBe('');
  });

  it('the seven foods differ from each other', async () => {
    const masks = await Promise.all(SUSHI.map((s) => alphaMask(foodSvg(s.color), 32)));
    let distinctPairs = 0;
    for (let i = 0; i < masks.length; i++)
      for (let j = i + 1; j < masks.length; j++) if (difference(masks[i], masks[j]) > 0.03) distinctPairs++;
    // Nigiri share a rice base, so silhouettes alone will not separate all of them; colour does. Most pairs should still differ.
    expect(distinctPairs).toBeGreaterThanOrEqual(12);
  });
});

describe('room and decor', () => {
  it('the background covers the whole canvas', async () => {
    const cov = coverage(await alphaMask(backgroundSvg(), 96, 480));
    expect(cov).toBeGreaterThan(0.98);
  });

  it('decor pieces rasterise', async () => {
    for (const [name, svg, src] of [
      ['noren', norenSvg(), 320],
      ['lantern', lanternSvg(), 72],
      ['bonsai', bonsaiSvg(), 64],
      ['tank', tankSvg(), 92],
    ] as [string, string, number][]) {
      const cov = coverage(await alphaMask(svg, 48, src));
      expect(cov, name).toBeGreaterThan(0.1);
    }
  });
});

describe('dimmed variant', () => {
  it('keeps the silhouette and darkens the colours', async () => {
    const a = await sharp(Buffer.from(characterSvg(2, 'idle')), { density: 46 })
      .resize(64, 64)
      .ensureAlpha()
      .raw()
      .toBuffer();
    const b = await sharp(Buffer.from(characterSvg(2, 'idle', false, true)), { density: 46 })
      .resize(64, 64)
      .ensureAlpha()
      .raw()
      .toBuffer();
    let sameAlpha = 0,
      darker = 0,
      opaque = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] > 40 === b[i + 3] > 40) sameAlpha++;
      if (a[i + 3] > 200) {
        opaque++;
        if (b[i] + b[i + 1] + b[i + 2] < a[i] + a[i + 1] + a[i + 2]) darker++;
      }
    }
    expect(sameAlpha / (a.length / 4)).toBeGreaterThan(0.98);
    expect(darker / opaque).toBeGreaterThan(0.9);
  });
});
