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
await step('audio unlocked by the first tap, sound set rendered, music running', async () => {
  const a = await sj(
    '(() => ({ state: window.__SJ.audio.state(), buffers: window.__SJ.audio.buffers(), events: window.__SJ.audio.events() }))()'
  );
  if (a.state !== 'running') throw new Error('context state ' + a.state + ' events ' + a.events.join(','));
  if (a.buffers < 27) throw new Error('expected 27 rendered buffers, got ' + a.buffers);
  if (!a.events.includes('music:start')) throw new Error('music did not start: ' + a.events.join(','));
  await sj("window.__SJ.audio.play('bell')");
  return a.buffers + ' buffers, ' + a.state;
});
await step('backgrounding suspends audio and returning resumes it without errors', async () => {
  // Drive the real visibilitychange listener: override visibilityState, dispatch, then restore.
  const hidden = await page.evaluate(async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 400));
    return { state: window.__SJ.audio.state(), events: window.__SJ.audio.events() };
  });
  const back = await page.evaluate(async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 600));
    return { state: window.__SJ.audio.state(), events: window.__SJ.audio.events() };
  });
  if (!hidden.events.includes('background')) throw new Error('no background event: ' + hidden.events.join(','));
  if (hidden.state !== 'suspended') throw new Error('context not suspended while hidden: ' + hidden.state);
  if (!back.events.includes('foreground')) throw new Error('no foreground event: ' + back.events.join(','));
  if (back.state !== 'running') throw new Error('context did not resume: ' + back.state + ' ' + back.events.join(','));
  const resyncs = back.events.filter((e) => e === 'music:resync').length;
  return 'hidden: ' + hidden.state + ', back: ' + back.state + ', loop resyncs: ' + resyncs;
});
await step('naive player follows the tutorial through levels 1 to 3', async () => {
  await sj('window.__SJ.closeScreen()'); // the background step left the game paused, as it should
  const start = await sj('window.__SJ.S.tutorial');
  if (start !== 0) throw new Error('fresh save should start the tutorial at 0, got ' + start);
  for (let lvl = 1; lvl <= 3; lvl++) {
    const t0 = Date.now();
    let guidedTaps = 0,
      infoTaps = 0;
    while (Date.now() - t0 < 120000) {
      const st = await status();
      if (st === 'win') break;
      if (st === 'fail') throw new Error('level ' + lvl + ' failed while following the tutorial');
      if (st === 'intro') await sj('window.__SJ.skipIntro()');
      else if (st === 'mech') await sj('window.__SJ.mechCard()');
      else if (st === 'play') {
        const tg = await sj('window.__SJ.tutorial.target()');
        if (tg && tg.guided) {
          await tapCanvas(tg.x, tg.y);
          guidedTaps++;
        } else if (tg && tg.key !== 'tutorial.seatAll') {
          await tapCanvas(240, 300);
          infoTaps++;
        } else if (tg) {
          await tapCanvas(tg.x, tg.y); // free play: follow the hint hand
        } else await sj('window.__SJ.auto()');
      }
      await sleep(120);
    }
    if ((await status()) !== 'win') throw new Error('level ' + lvl + ' not won within 2 minutes');
    if (lvl === 1) await page.screenshot({ path: path.join(OUT, 'smoke-tutorial-win1.png') });
    const done = await sj('window.__SJ.S.tutorial');
    if (done < lvl) throw new Error('tutorial for level ' + lvl + ' not marked complete (' + done + ')');
    if (lvl < 3) {
      await tapCanvas(240, 502); // Next level
      await sleep(400);
      // Screenshot the guided first step of level 2 for the docs.
      if (lvl === 1) {
        await sj('window.__SJ.skipIntro()');
        await sleep(500);
        await page.screenshot({ path: path.join(OUT, 'smoke-tutorial-l2.png') });
      }
    }
    void guidedTaps;
    void infoTaps;
  }
  return 'levels 1 to 3 won, tutorial complete';
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
  await tapCanvas(240, 626); // Retry level
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
  await tapCanvas(240, 440); // haptics row
  await sleep(120);
  const h1 = await sj('window.__SJ.S.haptics');
  if (h1 === h0) throw new Error('haptics toggle did not flip');
  await tapCanvas(240, 440);
  await sleep(120);
  if ((await sj('window.__SJ.S.haptics')) !== h0) throw new Error('haptics toggle did not flip back');
  const s0 = await sj('window.__SJ.S.sound');
  await tapCanvas(240, 254); // sound row
  await sleep(120);
  if ((await sj('window.__SJ.S.sound')) === s0) throw new Error('sound toggle did not flip');
  await tapCanvas(240, 254);
  await sleep(120);
  const rm0 = await sj('window.__SJ.S.reduceMotion');
  await tapCanvas(240, 502); // reduce motion row
  await sleep(120);
  if ((await sj('window.__SJ.S.reduceMotion')) === rm0) throw new Error('reduce motion toggle did not flip');
  await tapCanvas(240, 502);
  await sleep(120);
  if ((await sj('window.__SJ.S.reduceMotion')) !== rm0) throw new Error('reduce motion toggle did not flip back');
  // Sliders: a press sets the value, a drag follows the pointer.
  await tapCanvas(186 + 170 * 0.25, 302); // music slider at 25 percent
  await sleep(120);
  const vm = await sj('window.__SJ.S.volMusic');
  if (Math.abs(vm - 0.25) > 0.06) throw new Error('music slider press gave ' + vm);
  const box = await page.$eval('#c', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const gx = (x) => box.x + (x / 480) * box.w,
    gy = (y) => box.y + (y / 900) * box.h;
  await page.mouse.move(gx(200), gy(344));
  await page.mouse.down();
  await page.mouse.move(gx(280), gy(344), { steps: 6 });
  await page.mouse.move(gx(356), gy(344), { steps: 6 });
  await page.mouse.up();
  await sleep(120);
  const vs = await sj('window.__SJ.S.volSfx');
  if (vs < 0.95) throw new Error('sfx slider drag to the end gave ' + vs);
  await sj('window.__SJ.S.volMusic = 0.6; window.__SJ.S.volSfx = 1; window.__SJ.saveApi.save(true);');
  // Colour patterns and left-handed layout toggles.
  await tapCanvas(240, 564);
  await sleep(120);
  if ((await sj('window.__SJ.S.colorblind')) !== true) throw new Error('colourblind toggle did not turn on');
  await page.screenshot({ path: path.join(OUT, 'smoke-settings-game.png') });
  await tapCanvas(240, 626);
  await sleep(120);
  if ((await sj('window.__SJ.S.leftHanded')) !== true) throw new Error('left-handed toggle did not turn on');
  await tapCanvas(240, 771); // Done
  await sleep(200);
  await page.screenshot({ path: path.join(OUT, 'smoke-colorblind-lefthand.png') });
  await tapCanvas(480 - 238, 38); // gear is mirrored to the left in left-handed layout
  await sleep(150);
  if ((await screenType()) !== 'settings') throw new Error('mirrored gear button did not open settings');
  await tapCanvas(240, 626);
  await tapCanvas(240, 564);
  await sleep(120);
  // Language row cycles from Automatic to English and on; set Arabic through the dev API for the RTL check.
  const lang0 = await sj('window.__SJ.S.lang');
  await tapCanvas(240, 686);
  await sleep(120);
  const lang1 = await sj('window.__SJ.S.lang');
  if (lang1 === lang0) throw new Error('language row did not cycle');
  await sj("window.__SJ.i18n.set('ar')");
  await sleep(200);
  const ar = await sj(
    "(() => ({ dir: document.documentElement.dir, title: window.__SJ.i18n.t('settings.title'), loc: window.__SJ.i18n.get() }))()"
  );
  if (ar.dir !== 'rtl' || ar.loc !== 'ar' || !/[\u0600-\u06FF]/.test(ar.title))
    throw new Error('RTL check failed: ' + JSON.stringify(ar));
  await page.screenshot({ path: path.join(OUT, 'smoke-settings-ar.png') });
  await sj("window.__SJ.i18n.set('ja')");
  await sleep(150);
  await page.screenshot({ path: path.join(OUT, 'smoke-settings-ja.png') });
  await sj("window.__SJ.i18n.set('')");
  await sleep(150);
  if ((await sj('document.documentElement.dir')) !== 'ltr') throw new Error('dir not restored');
  await tapCanvas(240, 771); // Done
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
await step('6x6 grid with every mechanic renders (art readability check)', async () => {
  await sj('window.__SJ.S.devAllMech = true');
  await sj('window.__SJ.jump(30)');
  await sleep(300);
  await sj('window.__SJ.skipIntro()');
  for (let i = 0; i < 10; i++) {
    if ((await status()) === 'mech') await sj('window.__SJ.mechCard()');
    await sleep(80);
  }
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, 'smoke-grid6.png') });
  const st = await sj(
    '(() => { const L = window.__SJ.state(); return { rows: L.rows, cols: L.cols, cell: L.cell }; })()'
  );
  await sj('window.__SJ.S.devAllMech = false');
  if (st.rows !== 6 || st.cols !== 6) throw new Error('expected a 6x6 board, got ' + st.rows + 'x' + st.cols);
  return '6x6, cell ' + st.cell.toFixed(1) + ' px, diner radius ' + (st.cell * 0.36).toFixed(1) + ' px';
});
await step('frame rate with 40+ live particles (headless Edge on this PC)', async () => {
  await sj('window.__SJ.jump(2)');
  await sleep(150);
  await sj('window.__SJ.skipIntro()');
  await sleep(300);
  const r = await page.evaluate(async () => {
    const sj = window.__SJ;
    sj.fx.burst(80);
    const frames = [];
    let minLive = Infinity;
    await new Promise((res) => {
      let n = 0,
        last = performance.now();
      const f = (ts) => {
        frames.push(ts - last);
        last = ts;
        minLive = Math.min(minLive, sj.fx.count());
        if (++n % 24 === 0) sj.fx.burst(40);
        if (n < 180) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
    frames.shift();
    const sorted = frames.slice().sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    return {
      avgFps: 1000 / avg,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      minLive,
      live: sj.fx.count(),
      tweens: sj.fx.tweens(),
    };
  });
  if (r.minLive < 40) throw new Error('fewer than 40 particles live during the measurement: ' + r.minLive);
  if (r.avgFps < 55) throw new Error('average fps below 55: ' + r.avgFps.toFixed(1));
  return r.avgFps.toFixed(0) + ' fps avg, p95 frame ' + r.p95.toFixed(1) + ' ms, min ' + r.minLive + ' particles live';
});
await step('reduce motion: level still plays and no confetti or steam is spawned', async () => {
  await sj('window.__SJ.fx.reduce(true)');
  await sj('window.__SJ.jump(1)');
  const ms = await autoplayUntil('win', 90000);
  await sleep(200);
  const live = await sj('window.__SJ.fx.count()');
  await page.screenshot({ path: path.join(OUT, 'smoke-reduced-win.png') });
  await sj('window.__SJ.fx.reduce(false)');
  if (live > 8) throw new Error('particles alive under reduce motion right after a win: ' + live);
  return 'won level 1 in ' + ms + ' ms with ' + live + ' particles live';
});
await step('play screenshot (level 2, a few moves in)', async () => {
  await sj('window.__SJ.jump(2)');
  await sleep(150);
  await sj('window.__SJ.skipIntro()');
  for (let i = 0; i < 3; i++) {
    await sj('window.__SJ.auto()');
    await sleep(700);
  }
  await sleep(2200);
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
const reloadAndWait = async () => {
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__SJ && window.__SJ.state(), { timeout: 10000 });
  await sleep(200);
};
await step('save is a versioned envelope with a valid checksum', async () => {
  const info = await sj(`(() => {
    const e = JSON.parse(localStorage.getItem('sushijam.save'));
    return { v: e.v, hasSum: typeof e.sum === 'number', level: e.data.level, src: window.__SJ.saveApi.info().source };
  })()`);
  if (info.v !== 6 || !info.hasSum) throw new Error('bad envelope ' + JSON.stringify(info));
  return `v${info.v}, loaded from ${info.src}`;
});
await step('legacy v2 save migrates with level, coins, decor and stats intact', async () => {
  await sj(`(() => {
    ['sushijam.save', 'sushijam.save.tmp', 'sushijam.save.bak'].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('sushijam.v2', JSON.stringify({ level: 7, coins: 777, decor: ['noren'], inv: { vip: 2 },
      stats: [{ n: 1, result: 'win' }, { n: 2, result: 'fail' }], sound: false }));
  })()`);
  await reloadAndWait();
  const s =
    await sj(`(() => { const S = window.__SJ.S; return { level: S.level, coins: S.coins, decor: S.decor, vip: S.inv.vip,
    stats: S.stats.length, sound: S.sound, haptics: S.haptics, n: window.__SJ.state().n,
    from: window.__SJ.saveApi.info().migratedFrom, hasV3: !!localStorage.getItem('sushijam.save') }; })()`);
  const ok =
    s.level === 7 &&
    s.coins === 777 &&
    s.decor[0] === 'noren' &&
    s.vip === 2 &&
    s.stats === 2 &&
    s.sound === false &&
    s.haptics === true &&
    s.n === 7 &&
    s.from === 2 &&
    s.hasV3;
  if (!ok) throw new Error(JSON.stringify(s));
  await sj('window.__SJ.closeScreen()');
});
await step('corrupt primary save recovers from the backup copy', async () => {
  await sj('window.__SJ.saveApi.rotateBackup()');
  await sj(`localStorage.setItem('sushijam.save', '{"v":3,"sum":1,"data":{"level":99')`);
  await reloadAndWait();
  const s = await sj(`(() => ({ level: window.__SJ.S.level, coins: window.__SJ.S.coins,
    src: window.__SJ.saveApi.info().source, rec: window.__SJ.saveApi.info().recovered,
    mainOk: (() => { try { return JSON.parse(localStorage.getItem('sushijam.save')).data.level; } catch (e) { return 'corrupt'; } })() }))()`);
  if (s.level !== 7 || s.coins !== 777 || s.src !== 'bak' || !s.rec || s.mainOk !== 7)
    throw new Error(JSON.stringify(s));
  await sj('window.__SJ.closeScreen()');
  return 'recovered from ' + s.src + ', primary rewritten';
});
await step('settings: restore progress from backup with confirmation', async () => {
  await sj(
    'window.__SJ.S.coins = 5000; window.__SJ.saveApi.rotateBackup(); window.__SJ.S.coins = 1; window.__SJ.saveApi.save(true);'
  );
  await sj("window.__SJ.setScreen({ type: 'settings', t: 0 })");
  await sleep(150);
  await page.screenshot({ path: path.join(OUT, 'smoke-settings-save.png') });
  await tapCanvas(320, 207); // Account tab
  await sleep(120);
  await tapCanvas(240, 298); // Restore progress
  await sleep(150);
  if ((await screenType()) !== 'confirm') throw new Error('confirm dialog not shown');
  await page.screenshot({ path: path.join(OUT, 'smoke-confirm.png') });
  await tapCanvas(315, 494); // Cancel first
  await sleep(150);
  if ((await screenType()) !== 'settings') throw new Error('cancel did not return to settings');
  if ((await sj('window.__SJ.S.coins')) !== 1) throw new Error('cancel changed the state');
  await tapCanvas(240, 298);
  await sleep(150);
  await tapCanvas(165, 494); // Restore
  await sleep(300);
  const coins = await sj('window.__SJ.S.coins');
  if (coins !== 5000) throw new Error('expected 5000 coins after restore, got ' + coins);
  if ((await screenType()) !== null) throw new Error('screen still open after restore');
});
await step('settings: reset progress wipes the save and reloads', async () => {
  await sj("window.__SJ.setScreen({ type: 'settings', t: 0 })");
  await sleep(150);
  await tapCanvas(320, 207); // Account tab
  await sleep(120);
  await tapCanvas(240, 354); // Reset progress
  await sleep(150);
  if ((await screenType()) !== 'confirm') throw new Error('confirm dialog not shown');
  await tapCanvas(165, 494); // Reset
  await sleep(500);
  await page.waitForFunction(() => window.__SJ && window.__SJ.state() && window.__SJ.S.level === 1, { timeout: 10000 });
  const s = await sj(`(() => ({ level: window.__SJ.S.level, coins: window.__SJ.S.coins,
    keys: ['sushijam.save', 'sushijam.save.bak', 'sushijam.save.tmp', 'sushijam.v2', 'sushijam.v1'].filter((k) => localStorage.getItem(k) !== null) }))()`);
  // The weekly check writes a fresh primary at boot, so only a pristine sushijam.save may remain.
  const fresh = await sj(`(() => { const raw = localStorage.getItem('sushijam.save'); if (!raw) return true;
    const d = JSON.parse(raw).data; return d.level === 1 && d.coins === 300 && d.decor.length === 0 && d.stats.length === 0; })()`);
  const stale = s.keys.filter((k) => k !== 'sushijam.save');
  if (s.level !== 1 || s.coins !== 300 || stale.length || !fresh) throw new Error(JSON.stringify({ ...s, fresh }));
});
await step('levels 1 to 100 are the authored files; 101 falls back to the generator', async () => {
  const r = await sj(`(() => { const a = window.__SJ.getLevel(37), b = window.__SJ.getLevel(101);
    return { a: !!a.authored, b: !!b.authored, rows: a.rows, cols: a.cols }; })()`);
  if (!r.a || r.b) throw new Error(JSON.stringify(r));
});
await step('level editor: dev panel only, load, paint, solve, export/import round trip, play test', async () => {
  await sj('window.__SJ.closeScreen()');
  await sj("window.__SJ.setScreen({ type: 'dev', t: 0 })");
  await sleep(120);
  await tapCanvas(240, 602); // Level editor button on the dev panel
  await sleep(150);
  if ((await screenType()) !== 'editor') throw new Error('editor did not open from the dev panel');
  await sj('window.__SJ.editor.load(21)');
  await sleep(100);
  await page.screenshot({ path: path.join(OUT, 'smoke-editor.png') });
  const st = await sj('window.__SJ.editor.state()');
  if (st.n !== 21 || st.cells < 4) throw new Error('load: ' + JSON.stringify(st));
  const v = await sj('window.__SJ.editor.solve(40)');
  if (!v.ok) throw new Error('level 21 does not validate in the editor: ' + v.problems.join('; '));
  const before = await sj('window.__SJ.editor.get()');
  const back = await sj(
    `(() => { const j = window.__SJ.editor.get(); window.__SJ.editor.set(JSON.parse(JSON.stringify(j))); return window.__SJ.editor.get(); })()`
  );
  if (JSON.stringify({ ...back, diff: 0 }) !== JSON.stringify({ ...before, diff: 0 }))
    throw new Error('export/import round trip changed the level');
  // Paint a diner that blocks the peel and confirm the solver reports it, then erase it again.
  const empty = await sj(
    `(() => { const j = window.__SJ.editor.get(); for (let r = 0; r < j.rows; r++) { const t = j.cells[r].split(' '); const c = t.indexOf('.'); if (c >= 0) return [r, c]; } return null; })()`
  );
  if (!empty) throw new Error('no empty cell to paint on level 21');
  await sj(`window.__SJ.editor.paint(${empty[0]}, ${empty[1]}, '0v9')`);
  const tok = await sj(`window.__SJ.editor.cellToken(${empty[0]}, ${empty[1]})`);
  if (tok !== '0v9') throw new Error('paint wrote ' + tok);
  const bad = await sj('window.__SJ.editor.solve(20)');
  if (bad.ok) throw new Error('an appetite of 9 with no plates for it should fail validation');
  await sj(`window.__SJ.editor.paint(${empty[0]}, ${empty[1]}, null)`);
  const good = await sj('window.__SJ.editor.solve(20)');
  if (!good.ok) throw new Error('erase did not restore the level: ' + good.problems.join('; '));
  const played = await sj('window.__SJ.editor.play()');
  await sleep(200);
  const lv = await sj(
    '(() => { const s = window.__SJ.state(); return s ? { n: s.lv.n, authored: !!s.lv.authored, status: s.status } : null; })()'
  );
  if (!played || !lv || lv.n !== 21 || !lv.authored || (await screenType()))
    throw new Error('play test: ' + JSON.stringify(lv));
  // The HUD and map never link to the editor: only the dev panel button does.
  await sj('window.__SJ.closeScreen()');
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
