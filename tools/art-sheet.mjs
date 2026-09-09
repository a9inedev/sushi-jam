// Renders the character and sushi sheets plus a before/after composite into docs/art/.
// Bundles src/art/index.ts with esbuild so the same TypeScript builders feed the sheet.
//   node tools/art-sheet.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const OUT = path.resolve('docs/art');
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
const { CHARACTERS, SPRITE_STATES, characterSvg, SUSHI, foodSvg, COLORS, THEMES, DECOR_ART, backgroundSvg } = art;

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const png = (svg, size, src = 100) =>
  sharp(Buffer.from(svg), { density: Math.max(1, (72 * size) / src) })
    .resize(size, size)
    .png()
    .toBuffer();
const label = (text, w, h, size = 12) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w / 2}" y="${h / 2 + size * 0.35}" font-family="Trebuchet MS, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#5A4E45" text-anchor="middle">${text}</text></svg>`
  );

async function characterSheet(cell) {
  const pad = Math.round(cell * 0.35),
    labelW = 70,
    headerH = 24;
  const cols = SPRITE_STATES.length + 1; // + vip
  const W = labelW + cols * (cell + pad) + pad,
    H = headerH + CHARACTERS.length * (cell + pad) + pad;
  const layers = [];
  [...SPRITE_STATES, 'vip'].forEach((st, i) =>
    layers.push({ input: label(st, cell + pad, headerH), left: labelW + i * (cell + pad), top: 0 })
  );
  for (let r = 0; r < CHARACTERS.length; r++) {
    const c = CHARACTERS[r];
    const top = headerH + pad + r * (cell + pad);
    layers.push({ input: label(c.name, labelW, cell), left: 0, top });
    for (let i = 0; i < SPRITE_STATES.length; i++)
      layers.push({
        input: await png(characterSvg(c.color, SPRITE_STATES[i]), cell),
        left: labelW + i * (cell + pad),
        top,
      });
    layers.push({
      input: await png(characterSvg(c.color, 'idle', true), cell),
      left: labelW + SPRITE_STATES.length * (cell + pad),
      top,
    });
  }
  const file = path.join(OUT, `characters-${cell}px.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#FBF3E4' } })
    .composite(layers)
    .png()
    .toFile(file);
  return file;
}

function plateSvg(color) {
  const hex = COLORS[color].hex;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">` +
    `<circle cx="50" cy="52" r="47" fill="#FFFDF7"/><circle cx="50" cy="52" r="40" fill="none" stroke="${hex}" stroke-width="13"/>` +
    `<g transform="translate(50 50) scale(0.85) translate(-50 -52)">${inner(foodSvg(color))}</g>` +
    `</svg>`
  );
}

async function plateSheet(cell) {
  const pad = Math.round(cell * 0.4),
    headerH = 22;
  const W = SUSHI.length * (cell + pad) + pad,
    H = headerH + cell + pad * 2;
  const layers = [];
  for (let i = 0; i < SUSHI.length; i++) {
    layers.push({ input: label(SUSHI[i].id, cell + pad, headerH), left: i * (cell + pad), top: 0 });
    layers.push({ input: await png(plateSvg(SUSHI[i].color), cell), left: pad + i * (cell + pad), top: headerH + pad });
  }
  const file = path.join(OUT, `plates-${cell}px.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#FBF3E4' } })
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
  await sharp({ create: { width: W, height: H, channels: 4, background: '#171512' } })
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
    create: { width: pad + THEMES.length * (w + pad), height: h + 24 + pad, channels: 4, background: '#FBF3E4' },
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
    create: { width: pad + ids.length * (cell + pad), height: cell + 24 + pad, channels: 4, background: '#FBF3E4' },
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
      background: '#FBF3E4',
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
for (const [b, a, o] of [
  ['before-level2.png', 'after-level2.png', 'before-after-level2.png'],
  ['before-mechanics.png', 'after-mechanics.png', 'before-after-mechanics.png'],
]) {
  const f = await sideBySide(path.join(OUT, b), path.join(OUT, a), path.join(OUT, o));
  if (f) made.push(f);
}
// Layered SVG exports for anyone who wants the vectors.
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(SPRITE_STATES.length + 1) * 110} ${CHARACTERS.length * 110}" width="${(SPRITE_STATES.length + 1) * 110}" height="${CHARACTERS.length * 110}">`;
CHARACTERS.forEach((c, r) => {
  [...SPRITE_STATES.map((st) => characterSvg(c.color, st)), characterSvg(c.color, 'idle', true)].forEach((svg, i) => {
    sheet += `<g transform="translate(${i * 110 + 5} ${r * 110 + 5})">${inner(svg)
      .replace(/id="g"/g, `id="g${r}_${i}"`)
      .replace(/url\(#g\)/g, `url(#g${r}_${i})`)}</g>`;
  });
});
sheet += '</svg>';
fs.writeFileSync(path.join(OUT, 'characters.svg'), sheet);
let plates = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SUSHI.length * 110} 110" width="${SUSHI.length * 110}" height="110">`;
SUSHI.forEach((s, i) => (plates += `<g transform="translate(${i * 110 + 5} 5)">${inner(plateSvg(s.color))}</g>`));
plates += '</svg>';
fs.writeFileSync(path.join(OUT, 'plates.svg'), plates);
made.push(path.join(OUT, 'characters.svg'), path.join(OUT, 'plates.svg'));
console.log('art sheets:\n  ' + made.map((f) => path.relative(process.cwd(), f)).join('\n  '));
