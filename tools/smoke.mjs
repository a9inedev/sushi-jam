// Smoke test: boots the built game in headless Edge, drives the dev API, reports console errors.
// Usage: node tools/smoke.mjs [dir-with-index.html]   (default: dist)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));
if (!EDGE) {
  console.error('Edge not found');
  process.exit(2);
}
const DIR = process.argv[2] || 'dist';
const OUT = path.resolve('tools/out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const info = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, info });
    console.log(`  ok   ${name}${info ? '  (' + info + ')' : ''}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, info: String(e.message || e) });
    console.log(`  FAIL ${name}: ${e.message || e}`);
  }
};

const { url, close } = await serve(DIR);
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
page.on('requestfailed', (r) => {
  if (!/fonts\.g/.test(r.url())) errors.push('requestfailed: ' + r.url());
});
page.on('response', (r) => {
  if (r.status() >= 400 && !/fonts\.g/.test(r.url())) errors.push(`http ${r.status()}: ${r.url()}`);
});

const sj = (expr) => page.evaluate(expr);
// Map logical 480x900 game coordinates to CSS pixels on the scaled canvas.
const tapCanvas = async (x, y) => {
  const box = await page.$eval('#c', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (x / 480) * box.w, box.y + (y / 900) * box.h);
};
const status = () => sj('window.__SJ.state() ? window.__SJ.state().status : null');
const screenType = () => sj('window.__SJ.screen() ? window.__SJ.screen().type : null');
const autoplayUntil = async (want, maxMs) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await status();
    if (st === want) return Date.now() - t0;
    if (st === 'fail') throw new Error('level failed during autoplay');
    if (st === 'intro') await sj('window.__SJ.skipIntro()');
    if (st === 'mech') await sj('window.__SJ.mechCard()');
    if (st === 'play') await sj('window.__SJ.auto()');
    await sleep(90);
  }
  throw new Error(`timeout waiting for status ${want}`);
};

console.log('smoke: ' + url + '  (' + path.resolve(DIR) + ')');
await step('boot', async () => {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__SJ && window.__SJ.state(), { timeout: 10000 });
  return `${Date.now() - t0} ms to interactive`;
});
await step('daily bonus shows and collects', async () => {
  await sleep(300);
  const t = await screenType();
  if (t !== 'daily') throw new Error('expected daily screen, got ' + t);
  const before = await sj('window.__SJ.S.coins');
  await tapCanvas(240, 526);
  await sleep(1400);
  const after = await sj('window.__SJ.S.coins');
  if (!(after > before)) throw new Error(`coins did not increase (${before} -> ${after})`);
  return `+${after - before} coins`;
});
await step('level 1 autoplays to a win', async () => {
  await sj('window.__SJ.jump(1)');
  const ms = await autoplayUntil('win', 90000);
  return ms + ' ms';
});
await step('win card -> next level', async () => {
  await tapCanvas(240, 502);
  await sleep(300);
  const n = await sj('window.__SJ.state().n');
  if (n !== 2) throw new Error('expected level 2, got ' + n);
});
await step('level 2 autoplays to a win', async () => {
  const ms = await autoplayUntil('win', 90000);
  return ms + ' ms';
});
await step('force fail and retry', async () => {
  await sj('window.__SJ.jump(3)');
  await sj('window.__SJ.skipIntro()');
  await sleep(100);
  await sj('window.__SJ.forceFail()');
  await sleep(900);
  const st = await status();
  if (st !== 'fail' && st !== 'failing') throw new Error('expected fail, got ' + st);
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, 'smoke-fail.png') });
  await tapCanvas(240, 614); // Retry level
  await sleep(200);
  const st2 = await status();
  if (st2 !== 'intro' && st2 !== 'play') throw new Error('expected intro/play after retry, got ' + st2);
});
await step('rewarded ad rescue restores play', async () => {
  await sj('window.__SJ.skipIntro()');
  await sleep(100);
  await sj('window.__SJ.forceFail()');
  await sleep(1600);
  await tapCanvas(240, 560); // Watch an ad for a free seat
  await sleep(200);
  if ((await screenType()) !== 'ad') throw new Error('ad screen not shown');
  await sleep(5300);
  await tapCanvas(240, 664); // Claim reward
  await sleep(200);
  const st = await status();
  if (st !== 'play') throw new Error('expected play after rescue, got ' + st);
  const seats = await sj('window.__SJ.state().seats.length');
  if (seats !== 5) throw new Error('expected 5 seats after rescue, got ' + seats);
});
await step('level with every mechanic autoplays 15 s without errors', async () => {
  await sj('window.__SJ.S.devAllMech = true');
  await sj('window.__SJ.jump(75)');
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const st = await status();
    if (st === 'intro') await sj('window.__SJ.skipIntro()');
    else if (st === 'mech') await sj('window.__SJ.mechCard()');
    else if (st === 'play') await sj('window.__SJ.auto()');
    else break;
    await sleep(90);
  }
  await page.screenshot({ path: path.join(OUT, 'smoke-mechanics.png') });
  await sj('window.__SJ.S.devAllMech = false');
  return 'ended in status ' + (await status());
});
await step('map, shop, dev screens open and close', async () => {
  await sj('window.__SJ.jump(2)');
  for (const s of ['map', 'shop', 'dev']) {
    await sj(`window.__SJ.setScreen({ type: '${s}', tab: 'path', t: 0 })`);
    await sleep(150);
    const t = await screenType();
    if (t !== s) throw new Error('screen ' + s + ' not shown');
    await page.screenshot({ path: path.join(OUT, `smoke-${s}.png`) });
    await sj('window.__SJ.closeScreen()');
  }
});
await step('demo purchase grants coins', async () => {
  const before = await sj('window.__SJ.S.coins');
  await sj("window.__SJ.setScreen({ type: 'shop', t: 0 })");
  await sleep(150);
  await tapCanvas(366, 250 + 96 + 42); // Coin Pouch buy button (second product)
  await sleep(200);
  const after = await sj('window.__SJ.S.coins');
  if (after !== before + 500) throw new Error(`expected +500 coins, got ${before} -> ${after}`);
  await sj('window.__SJ.closeScreen()');
});
await step('settings screen toggles haptics and sound', async () => {
  await sj("window.__SJ.setScreen({ type: 'settings', t: 0 })");
  await sleep(150);
  await page.screenshot({ path: path.join(OUT, 'smoke-settings.png') });
  const h0 = await sj('window.__SJ.S.haptics');
  await tapCanvas(240, 396); // haptics row
  await sleep(120);
  const h1 = await sj('window.__SJ.S.haptics');
  if (h1 === h0) throw new Error('haptics toggle did not flip');
  await tapCanvas(240, 396);
  await sleep(120);
  if ((await sj('window.__SJ.S.haptics')) !== h0) throw new Error('haptics toggle did not flip back');
  const s0 = await sj('window.__SJ.S.sound');
  await tapCanvas(240, 330); // sound row
  await sleep(120);
  if ((await sj('window.__SJ.S.sound')) === s0) throw new Error('sound toggle did not flip');
  await tapCanvas(240, 330);
  await sleep(120);
  await tapCanvas(240, 607); // Done
  await sleep(120);
  if ((await screenType()) !== null) throw new Error('settings did not close');
});
await step('pause freezes the level and resumes; back button pauses', async () => {
  await sj('window.__SJ.skipIntro()');
  await sleep(300);
  await sj('window.__SJ.back()');
  await sleep(100);
  if ((await screenType()) !== 'pause') throw new Error('back did not open pause');
  const e0 = await sj('window.__SJ.state().elapsed');
  await sleep(600);
  const e1 = await sj('window.__SJ.state().elapsed');
  if (e1 !== e0) throw new Error(`level advanced while paused (${e0} -> ${e1})`);
  await page.screenshot({ path: path.join(OUT, 'smoke-pause.png') });
  await tapCanvas(240, 386); // Resume
  await sleep(300);
  if ((await screenType()) !== null) throw new Error('resume did not close pause');
  const e2 = await sj('window.__SJ.state().elapsed');
  if (!(e2 > e1)) throw new Error('level did not resume');
  await sj('window.__SJ.back()'); // pause again, then back closes it
  await sleep(100);
  await sj('window.__SJ.back()');
  await sleep(100);
  if ((await screenType()) !== null) throw new Error('back did not close pause');
});
await step('play screenshot', async () => {
  await sj('window.__SJ.skipIntro()');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, 'smoke-play.png') });
});
await step('save persists across reload', async () => {
  const coins = await sj('window.__SJ.S.coins');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__SJ && window.__SJ.state(), { timeout: 10000 });
  const again = await sj('window.__SJ.S.coins');
  if (again !== coins) throw new Error(`coins changed across reload (${coins} -> ${again})`);
  const t = await screenType();
  if (t === 'daily') throw new Error('daily bonus offered twice on the same day');
});
await step('no console errors', async () => {
  if (errors.length) throw new Error(errors.join(' | '));
});

await browser.close();
await close();
const failed = results.filter((r) => !r.ok);
console.log(`\nsmoke: ${results.length - failed.length}/${results.length} steps passed`);
fs.writeFileSync(
  path.join(OUT, 'smoke.json'),
  JSON.stringify({ when: new Date().toISOString(), dir: path.resolve(DIR), results, errors }, null, 2)
);
process.exit(failed.length ? 1 : 0);
