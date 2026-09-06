// Renders the authored sound set and a music preview to docs/audio/*.wav and rebuilds the spec table in
// docs/audio.md between the markers. Same TypeScript builders the game uses, bundled with esbuild.
//   node tools/audio-render.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = path.resolve('docs/audio');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.resolve('tools/out'), { recursive: true });
await build({
  entryPoints: ['src/audio/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'tools/out/audio.mjs',
  logLevel: 'silent',
});
const a = await import(pathToFileURL(path.resolve('tools/out/audio.mjs')).href + '?t=' + Date.now());
const SR = 22050;

const rows = [];
for (const s of a.SOUNDS) {
  const r = a.renderPatch(s.patch, SR);
  fs.writeFileSync(path.join(OUT, `${s.name}.wav`), a.toWav(r));
  rows.push(`| \`${s.name}\` | ${s.trigger} | ${Math.round(s.patch.dur * 1000)} ms | ${s.bus} | ${s.layering} |`);
}
for (const i of a.INSTRUMENTS) {
  const r = a.renderPatch(i.patch, SR);
  fs.writeFileSync(path.join(OUT, `inst-${i.name}.wav`), a.toWav(r));
}

// Music preview: mix the first 4 bars of both layers offline with the same instruments and pitch rule.
const bars = 4;
const secs = bars * 4 * a.BEAT + 2.5;
const mix = new Float32Array(Math.round(secs * SR));
const inst = Object.fromEntries(
  a.INSTRUMENTS.map((i) => [i.name, { samples: a.renderPatch(i.patch, SR).samples, base: i.baseMidi }])
);
const previewLayers = { calm: 1, tense: 0.45 };
for (const e of a.buildLoop()) {
  if (e.t >= bars * 4 * a.BEAT) continue;
  const { samples, base } = inst[e.inst];
  const rate = a.midiToRate(e.midi, base),
    gain = e.vel * previewLayers[e.layer];
  const start = Math.round(e.t * SR);
  for (let i = 0; ; i++) {
    const src = i * rate;
    const k = Math.floor(src);
    if (k + 1 >= samples.length || start + i >= mix.length) break;
    const v = samples[k] + (samples[k + 1] - samples[k]) * (src - k);
    mix[start + i] += v * gain;
  }
}
let peak = 0;
for (const v of mix) peak = Math.max(peak, Math.abs(v));
if (peak > 0) for (let i = 0; i < mix.length; i++) mix[i] *= 0.85 / peak;
fs.writeFileSync(path.join(OUT, 'music-preview.wav'), a.toWav({ samples: mix, sampleRate: SR, peak }));

// Spec table into docs/audio.md between the markers.
const doc = path.resolve('docs/audio.md');
if (fs.existsSync(doc)) {
  let md = fs.readFileSync(doc, 'utf8');
  const table = ['| Name | Trigger | Length | Bus | Layering |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
  md = md.replace(
    /<!-- sfx-table -->[\s\S]*?<!-- \/sfx-table -->/,
    `<!-- sfx-table -->\n${table}\n<!-- /sfx-table -->`
  );
  fs.writeFileSync(doc, md);
}
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.wav'));
const total = files.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`rendered ${files.length} wav files (${(total / 1024).toFixed(0)} KB) into docs/audio`);
