// Rasterise the source SVGs in resources/ into the PNGs @capacitor/assets expects, then generate every
// icon and splash size for iOS and Android. Run after `npx cap add ios|android`:
//   node tools/gen-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const SRC = path.resolve('resources');
const OUT = path.resolve('assets'); // @capacitor/assets default input folder (generated, git-ignored)
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['icon.svg', 'icon-only.png', 1024],
  ['icon-foreground.svg', 'icon-foreground.png', 1024],
  ['icon-background.svg', 'icon-background.png', 1024],
  ['splash.svg', 'splash.png', 2732],
  ['splash.svg', 'splash-dark.png', 2732],
];
for (const [svg, png, size] of jobs) {
  const from = path.join(SRC, svg);
  const to = path.join(OUT, png);
  await sharp(from, { density: 300 }).resize(size, size).png().toFile(to);
  console.log(`rasterised ${svg} -> assets/${png} (${size}px)`);
}

const platforms = ['ios', 'android'].filter((p) => fs.existsSync(path.resolve(p)));
if (!platforms.length) {
  console.log('no native projects found (run npx cap add android / ios first); PNGs generated only');
  process.exit(0);
}
const args = [
  'capacitor-assets',
  'generate',
  ...platforms.map((p) => '--' + p),
  '--iconBackgroundColor',
  '#2B2622',
  '--iconBackgroundColorDark',
  '#171512',
  '--splashBackgroundColor',
  '#171512',
  '--splashBackgroundColorDark',
  '#171512',
];
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
