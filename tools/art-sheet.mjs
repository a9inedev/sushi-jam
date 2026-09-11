// Renders the art sheets (plates with every variant, characters in every state and view, rooms, decor,
// outfits) into docs/art/, plus before/after composites for every sheet that has a snapshot in docs/art/before/
// and every capture pair in docs/art/captures/. Bundles src/art/index.ts with esbuild so the same TypeScript
// builders feed the sheet.
//   node tools/art-sheet.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const OUT = path.resolve('docs/art');
const BEFORE = path.join(OUT, 'before');
const CAPTURES = path.join(OUT, 'captures');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.resolve('tools/out'), { recursive: true });

await build({
  entryPoints: ['src/art/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'tools/out/art.mjs',
  logLevel: 'silent',
});
const art = await import(pathToFileURL(path.resolve('tools/out/art.mjs')).href + '?t=' + Date.now());
const {
  CHARACTERS,
  SPRITE_STATES,
  characterSvg,
  SUSHI,
  foodSvg,
  plateBaseSvg,
  clocheSvg,
  flagSvg,
  THEMES,
  DECOR_ART,
  backgroundSvg,
} = art;
const VIEWS = art.SPRITE_VIEWS || ['front'];

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
/** Nest a sprite with its own defs: ids get a suffix so several sprites can share one document. */
const nested = (svg, tag) =>
  inner(svg)
    .replace(/id="([a-z]+)"/g, `id="$1_${tag}"`)
    .replace(/url\(#([a-z]+)\)/g, `url(#$1_${tag})`);
const png = (svg, size, src = 100) =>
  sharp(Buffer.from(svg), { density: Math.max(1, (72 * size) / src) })
    .resize(size, size)
    .png()
    .toBuffer();
const label = (text, w, h, size = 12) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w / 2}" y="${h / 2 + size * 0.35}" font-family="Trebuchet MS, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#5A4E45" text-anchor="middle">${text}</text></svg>`
  );
const BG = '#F5E9D2';

async function characterSheet(cell) {
  const pad = Math.round(cell * 0.35),
    labelW = 70,
    headerH = 24;
  const columns = [];
  for (const view of VIEWS) for (const st of SPRITE_STATES) columns.push({ st, view, vip: false });
  columns.push({ st: 'idle', view: 'front', vip: true });
  const W = labelW + columns.length * (cell + pad) + pad,
    H = headerH + CHARACTERS.length * (cell + pad) + pad;
  const layers = [];
  columns.forEach((c, i) =>
    layers.push({
      input: label(c.vip ? 'vip' : c.view === 'front' ? c.st : c.st + '·back', cell + pad, headerH, 10),
      left: labelW + i * (cell + pad),
      top: 0,
    })
  );
  for (let r = 0; r < CHARACTERS.length; r++) {
    const c = CHARACTERS[r];
    const top = headerH + pad + r * (cell + pad);
    layers.push({ input: label(c.name, labelW, cell), left: 0, top });
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const svg =
        VIEWS.length > 1
          ? characterSvg(c.color, col.st, col.vip, false, 'none', col.view)
          : characterSvg(c.color, col.st, col.vip);
      layers.push({ input: await png(svg, cell), left: labelW + i * (cell + pad), top });
    }
  }
  const file = path.join(OUT, `characters-${cell}px.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

/** A complete plate as the game draws it: base sprite, food on top, the glyph stamp is canvas-drawn in game. */
function plateSvg(color, variant = {}) {
  const base = plateBaseSvg(color, !!variant.vip, !!variant.double, !!variant.special);
  const top = variant.special
    ? `<g transform="translate(0 -14)">${nested(flagSvg(), 'fl')}</g>`
    : variant.covered
      ? `<g transform="translate(0 -4)">${nested(clocheSvg(), 'cl')}</g>`
      : `<g transform="translate(50 ${variant.double ? 38 : 48}) scale(0.68) translate(-50 -52)">${nested(foodSvg(color), 'fd')}</g>`;
  const ring = variant.wasabi
    ? `<ellipse cx="50" cy="50" rx="44" ry="40" fill="none" stroke="#7BE05A" stroke-width="3" stroke-dasharray="180 60" stroke-linecap="round" transform="rotate(-90 50 50)"/><circle cx="76" cy="75" r="12" fill="#5DBB3F" stroke="#2A1F1A" stroke-width="2"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${nested(base, 'pb')}${top}${ring}</svg>`;
}

const VARIANTS = [
  { id: 'vip', vip: true },
  { id: 'covered', covered: true },
  { id: 'double', double: true },
  { id: 'wasabi', wasabi: true },
  { id: 'special', special: true },
];

async function plateSheet(cell) {
  const pad = Math.round(cell * 0.4),
    headerH = 22;
  const cols = SUSHI.length;
  const W = cols * (cell + pad) + pad,
    H = headerH + cell + pad + headerH + cell + pad * 2;
  const layers = [];
  for (let i = 0; i < SUSHI.length; i++) {
    layers.push({ input: label(SUSHI[i].id, cell + pad, headerH), left: i * (cell + pad), top: 0 });
    layers.push({ input: await png(plateSvg(SUSHI[i].color), cell), left: pad + i * (cell + pad), top: headerH + pad });
  }
  const row2 = headerH + cell + pad * 2;
  for (let i = 0; i < VARIANTS.length; i++) {
    const v = VARIANTS[i];
    layers.push({ input: label(v.id, cell + pad, headerH), left: i * (cell + pad), top: row2 - headerH });
    layers.push({ input: await png(plateSvg(i % SUSHI.length, v), cell), left: pad + i * (cell + pad), top: row2 });
  }
  const file = path.join(OUT, `plates-${cell}px.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

async function sideBySide(beforeFile, afterFile, outFile) {
  if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) return null;
  const a = sharp(beforeFile),
    b = sharp(afterFile);
  const [ma, mb] = await Promise.all([a.metadata(), b.metadata()]);
  const gutter = 24,
    headerH = 30;
  const W = ma.width + gutter + mb.width,
    H = headerH + Math.max(ma.height, mb.height);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#121A3A' } })
    .composite([
      { input: label('before', ma.width, headerH, 16), left: 0, top: 0 },
      { input: label('after', mb.width, headerH, 16), left: ma.width + gutter, top: 0 },
      { input: await a.png().toBuffer(), left: 0, top: headerH },
      { input: await b.png().toBuffer(), left: ma.width + gutter, top: headerH },
    ])
    .png()
    .toFile(outFile);
  return outFile;
}

async function roomSheet() {
  const w = 192,
    h = 360,
    pad = 12;
  const layers = [];
  for (let i = 0; i < THEMES.length; i++) {
    const img = await sharp(Buffer.from(backgroundSvg(THEMES[i])))
      .resize(w, h)
      .png()
      .toBuffer();
    layers.push({ input: img, left: pad + i * (w + pad), top: 24 });
    layers.push({ input: label(THEMES[i].id, w, 24), left: pad + i * (w + pad), top: 0 });
  }
  const file = path.join(OUT, 'rooms-192px.png');
  await sharp({
    create: { width: pad + THEMES.length * (w + pad), height: h + 24 + pad, channels: 4, background: BG },
  })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

async function decorSheet() {
  const cell = 64,
    pad = 16;
  const ids = Object.keys(DECOR_ART);
  const layers = [];
  for (let i = 0; i < ids.length; i++) {
    const a = DECOR_ART[ids[i]];
    const k = Math.min(cell / a.w, cell / a.h);
    const img = await sharp(Buffer.from(a.svg()))
      .resize(Math.round(a.w * k), Math.round(a.h * k))
      .png()
      .toBuffer();
    layers.push({
      input: img,
      left: pad + i * (cell + pad) + Math.round((cell - a.w * k) / 2),
      top: 24 + Math.round((cell - a.h * k) / 2),
    });
    layers.push({ input: label(ids[i], cell + pad, 24, 10), left: pad + i * (cell + pad) - pad / 2, top: 0 });
  }
  const file = path.join(OUT, 'decor-64px.png');
  await sharp({
    create: { width: pad + ids.length * (cell + pad), height: cell + 24 + pad, channels: 4, background: BG },
  })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

async function outfitSheet() {
  const cell = 64,
    pad = 16,
    labelW = 80;
  const layers = [];
  for (let r = 0; r < THEMES.length; r++) {
    const top = 24 + r * (cell + pad);
    layers.push({ input: label(THEMES[r].outfit, labelW, cell), left: 0, top });
    for (let c = 0; c < CHARACTERS.length; c++)
      layers.push({
        input: await png(characterSvg(CHARACTERS[c].color, 'idle', false, false, THEMES[r].outfit), cell),
        left: labelW + c * (cell + pad),
        top,
      });
  }
  const file = path.join(OUT, 'outfits-64px.png');
  await sharp({
    create: {
      width: labelW + CHARACTERS.length * (cell + pad) + pad,
      height: 24 + THEMES.length * (cell + pad) + pad,
      channels: 4,
      background: BG,
    },
  })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

const made = [
  await characterSheet(40),
  await characterSheet(96),
  await plateSheet(30),
  await plateSheet(96),
  await roomSheet(),
  await decorSheet(),
  await outfitSheet(),
];
// Before/after for every sheet with a snapshot, and for every capture pair.
for (const name of [
  'plates-96px',
  'plates-30px',
  'characters-96px',
  'characters-40px',
  'rooms-192px',
  'decor-64px',
  'outfits-64px',
]) {
  const f = await sideBySide(
    path.join(BEFORE, name + '.png'),
    path.join(OUT, name + '.png'),
    path.join(OUT, `before-after-${name}.png`)
  );
  if (f) made.push(f);
}
if (fs.existsSync(CAPTURES))
  for (const name of ['level1', 'all-rules', 'fail', 'map', 'shop']) {
    const f = await sideBySide(
      path.join(CAPTURES, `before-${name}.png`),
      path.join(CAPTURES, `after-${name}.png`),
      path.join(OUT, `before-after-${name}.png`)
    );
    if (f) made.push(f);
  }
// Layered SVG exports for anyone who wants the vectors.
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(SPRITE_STATES.length + 1) * 110} ${CHARACTERS.length * 110}" width="${(SPRITE_STATES.length + 1) * 110}" height="${CHARACTERS.length * 110}">`;
CHARACTERS.forEach((c, r) => {
  [...SPRITE_STATES.map((st) => characterSvg(c.color, st)), characterSvg(c.color, 'idle', true)].forEach((svg, i) => {
    sheet += `<g transform="translate(${i * 110 + 5} ${r * 110 + 5})">${nested(svg, `c${r}_${i}`)}</g>`;
  });
});
sheet += '</svg>';
fs.writeFileSync(path.join(OUT, 'characters.svg'), sheet);
let plates = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SUSHI.length * 110} 220" width="${SUSHI.length * 110}" height="220">`;
SUSHI.forEach(
  (s, i) => (plates += `<g transform="translate(${i * 110 + 5} 5)">${nested(plateSvg(s.color), `p${i}`)}</g>`)
);
VARIANTS.forEach(
  (v, i) => (plates += `<g transform="translate(${i * 110 + 5} 115)">${nested(plateSvg(i, v), `v${i}`)}</g>`)
);
plates += '</svg>';
fs.writeFileSync(path.join(OUT, 'plates.svg'), plates);
made.push(path.join(OUT, 'characters.svg'), path.join(OUT, 'plates.svg'));
console.log('art sheets:\n  ' + made.map((f) => path.relative(process.cwd(), f)).join('\n  '));
