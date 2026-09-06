// One-off: load the legacy single-file game in headless Edge and dump its generated levels as a fixture,
// so the TypeScript engine can be proven to generate identical boards. Usage:
//   node tools/dump-legacy-levels.mjs <dir-with-legacy-index.html> <out.json> [maxLevel]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { serve } from './serve.mjs';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));
const [dir, out, maxArg] = process.argv.slice(2);
const MAX = Number(maxArg || 100);
const { url, close } = await serve(dir);
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__SJ && window.__SJ.state());
const data = await page.evaluate((max) => {
  const compact = (lv) => ({
    n: lv.n,
    seed: lv.seed,
    diff: +lv.diff.toFixed(4),
    tierLabel: lv.tierLabel,
    rows: lv.rows,
    cols: lv.cols,
    authored: !!lv.authored,
    visibleNext: lv.P.visibleNext,
    beltCap: lv.P.beltCap,
    mechs: lv.mechs,
    diners: lv.diners.map((d) => [d.r, d.c, d.dir, d.color, d.need, d.vip ? 1 : 0, d.lockColor, d.ice]),
    kitchen: lv.kitchen.map((p) => [p.color, p.vip ? 1 : 0, p.double ? 1 : 0, p.wasabi ? 1 : 0, p.covered ? 1 : 0]),
  });
  const normal = [];
  for (let n = 1; n <= max; n++) normal.push(compact(window.__SJ.getLevel(n)));
  // all-mechanics variant: flip the dev flag, clear nothing (cache key differs), read, flip back
  window.__SJ.S.devAllMech = true;
  const all = [];
  for (let n = 1; n <= Math.min(max, 60); n++) all.push(compact(window.__SJ.getLevel(n)));
  window.__SJ.S.devAllMech = false;
  return { normal, all };
}, MAX);
fs.writeFileSync(out, JSON.stringify(data));
console.log(`dumped ${data.normal.length} levels + ${data.all.length} all-mechanic levels to ${out}`);
await browser.close();
await close();
