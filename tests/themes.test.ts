/* The restaurant journey: themes switch every twenty levels, each has three decor pieces and a completion
   reward, every room and decor piece rasterises, the outfits and music palettes differ per theme, and the save
   carries what was seen and rewarded. */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { backgroundSvg, characterSvg } from '../src/art/index';
import { DECOR_ART } from '../src/art/decor';
import { buildLoop, loopSecondsFor } from '../src/audio/music';
import { DECOR, decorOf, setComplete, THEMES, themeFor, themeUnlocked } from '../src/data/themes';
import { defaultSave, migrateV7toV8, normalize, SAVE_VERSION } from '../src/meta/save-schema';

async function coverage(svg: string, w: number, h: number): Promise<number> {
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(w, h, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 40) n++;
  return n / (info.width * info.height);
}

describe('themes', () => {
  it('switch every twenty levels in the journey order', () => {
    const at = (n: number) => themeFor(n).id;
    expect(at(1)).toBe('stall');
    expect(at(20)).toBe('stall');
    expect(at(21)).toBe('diner');
    expect(at(40)).toBe('diner');
    expect(at(41)).toBe('rooftop');
    expect(at(61)).toBe('ryokan');
    expect(at(80)).toBe('ryokan');
    expect(at(81)).toBe('station');
    expect(at(500)).toBe('station');
    expect(THEMES.map((t) => t.from)).toEqual([1, 21, 41, 61, 81]);
    expect(themeUnlocked(THEMES[2], 40)).toBe(false);
    expect(themeUnlocked(THEMES[2], 41)).toBe(true);
  });

  it('each has three decor pieces with unique ids and a reward; the set rule counts them all', () => {
    expect(DECOR.length).toBe(15);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(15);
    for (const t of THEMES) {
      expect(decorOf(t.id).length, t.id).toBe(3);
      expect(t.reward).toBeGreaterThan(0);
      const ids = decorOf(t.id).map((d) => d.id);
      expect(setComplete(t.id, ids.slice(0, 2))).toBe(false);
      expect(setComplete(t.id, ids)).toBe(true);
    }
    for (const d of DECOR) if (d.slot !== 'sign') expect(DECOR_ART[d.id], d.id).toBeDefined();
  });

  it('every room rasterises and differs from the others', async () => {
    const pixels: Buffer[] = [];
    for (const t of THEMES) {
      const svg = backgroundSvg(t);
      expect(await coverage(svg, 96, 180), t.id).toBeGreaterThan(0.95);
      pixels.push(await sharp(Buffer.from(svg)).resize(48, 90).raw().toBuffer());
    }
    for (let i = 0; i < pixels.length; i++)
      for (let j = i + 1; j < pixels.length; j++) {
        let diff = 0;
        for (let k = 0; k < pixels[i].length; k++) if (Math.abs(pixels[i][k] - pixels[j][k]) > 24) diff++;
        expect(diff / pixels[i].length, `${THEMES[i].id} vs ${THEMES[j].id}`).toBeGreaterThan(0.1);
      }
  });

  it('every decor piece rasterises with a visible body', async () => {
    for (const [id, art] of Object.entries(DECOR_ART)) {
      const cov = await coverage(art.svg(), art.w, art.h);
      expect(cov, id).toBeGreaterThan(0.08);
    }
  });

  it('outfits change the character art without changing the silhouette much', async () => {
    const plain = await sharp(Buffer.from(characterSvg(1, 'idle')), { density: 46 })
      .resize(64, 64)
      .raw()
      .toBuffer();
    for (const t of THEMES.slice(1)) {
      const dressed = await sharp(Buffer.from(characterSvg(1, 'idle', false, false, t.outfit)), { density: 46 })
        .resize(64, 64)
        .raw()
        .toBuffer();
      let diff = 0;
      for (let i = 0; i < plain.length; i++) if (Math.abs(plain[i] - dressed[i]) > 24) diff++;
      expect(diff / plain.length, t.outfit).toBeGreaterThan(0.004);
      expect(diff / plain.length, t.outfit).toBeLessThan(0.2);
    }
  });

  it('music palettes give each restaurant its own tempo, key and layer mix', () => {
    const seconds = THEMES.map((t) => loopSecondsFor(t.music));
    expect(new Set(seconds.map((s) => s.toFixed(3))).size).toBe(THEMES.length);
    const stall = buildLoop(THEMES[0].music),
      station = buildLoop(THEMES[4].music);
    const lead = (ev: ReturnType<typeof buildLoop>) =>
      ev.filter((e) => e.layer === 'calm' && (e.inst === 'pluck' || e.inst === 'pad'));
    const meanMidi = (ev: ReturnType<typeof buildLoop>) => ev.reduce((a, e) => a + e.midi, 0) / ev.length;
    expect(meanMidi(lead(station))).toBeGreaterThan(meanMidi(lead(stall)) + 10);
    expect(buildLoop(THEMES[3].music).some((e) => e.inst === 'taiko')).toBe(false);
    expect(buildLoop(THEMES[1].music).some((e) => e.inst === 'shaker' && e.layer === 'calm')).toBe(true);
    expect(buildLoop(THEMES[2].music).some((e) => e.inst === 'pad' && e.layer === 'calm')).toBe(true);
  });
});

describe('save v8', () => {
  it('adds the journey fields and keeps them through normalize', () => {
    expect(SAVE_VERSION).toBe(8);
    const v7 = { ...(defaultSave() as unknown as Record<string, unknown>) };
    delete v7.themesSeen;
    delete v7.decorRewards;
    const v8 = migrateV7toV8(v7);
    expect(v8.themesSeen).toEqual([]);
    expect(v8.decorRewards).toEqual([]);
    const s = normalize({ ...v8, themesSeen: ['diner', 'nope', 3], decorRewards: ['stall'] });
    expect(s.themesSeen).toEqual(['diner']);
    expect(s.decorRewards).toEqual(['stall']);
  });
});
