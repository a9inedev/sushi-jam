import './style.css';
import { audioContext, setRumble, sfx } from './audio/audio';
import { getLevel } from './engine/levels';
import { canMove, checkDeadlock, devAuto, fail, newLevel, nextMechCard, updateBelt, win } from './engine/rules';
import { closeScreen, G, toast, type Screen } from './engine/state';
import type { RuntimeLevel } from './engine/types';
import { checkDaily, checkWeekly } from './meta/daily';
import {
  backupInfo,
  clearSave,
  load,
  loadInfo,
  restoreFromBackup,
  rotateBackup,
  S,
  save,
  setCloudProvider,
} from './meta/save';
import { cloudProviderFor } from './meta/save-providers';
import {
  hideSplash,
  hideStatusBar,
  keepAwake,
  onAppActive,
  onBackButton,
  platform,
  setHapticsGate,
} from './platform/native';
import { ctx, cv, resize } from './render/canvas';
import {
  drawBelt,
  drawBg,
  drawDecor,
  drawFloating,
  drawFx,
  drawGrid,
  drawKitchen,
  drawParticles,
  drawPlatesOnBelt,
  drawSeats,
  drawToasts,
} from './render/scene';
import { drawBoosters, drawHud } from './ui/hud';
import { bindInput } from './ui/input';
import { drawStatusOverlay } from './ui/overlays';
import { bindStatsBox, drawScreen } from './ui/screens';

function update(dt: number): void {
  G.gt += dt;
  G.coinPop = Math.max(0, G.coinPop - dt * 3);
  if (G.screen) G.screen.t += dt;
  const L = G.L;
  if (!L) return;
  const slow = L.status === 'failing' ? 0.25 : 1,
    gdt = dt * slow;
  for (const d of L.diners) {
    d.bump = Math.max(0, d.bump - gdt * 4);
    d.shake = Math.max(0, d.shake - gdt * 2.6);
    d.bubblePop = Math.max(0, d.bubblePop - gdt * 4);
    if (d.state === 'paying') d.paidT += gdt;
    if (d.state === 'leaving') d.leaveT += gdt;
  }
  for (let i = G.fx.length - 1; i >= 0; i--) {
    G.fx[i].t += gdt;
    if (G.fx[i].t > G.fx[i].dur) G.fx.splice(i, 1);
  }
  L.shake = Math.max(0, L.shake - dt * 1.6);
  // Any open screen (ad, shop, map, settings, pause...) freezes the level so the belt never runs unseen.
  if (!G.screen) {
    if (L.status === 'intro') {
      L.introT += dt;
      if (L.introT >= 1.4) L.status = L.newMechs.length ? 'mech' : 'play';
    }
    for (let i = G.tweens.length - 1; i >= 0; i--) {
      const tw = G.tweens[i];
      tw.t += gdt;
      const u = Math.min(1, tw.t / tw.dur),
        e = tw.ease(u);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (u >= 1) {
        G.tweens.splice(i, 1);
        if (tw.onDone) tw.onDone();
      }
    }
    if (L.status === 'play') {
      L.elapsed += dt;
      L.seatShake = Math.max(0, L.seatShake - dt);
      updateBelt(dt);
      if (L.status === 'play') {
        for (const d of L.diners) if (d.state === 'grid') d.movable = canMove(d);
        checkDeadlock(dt);
        const full = L.seats.every((s) => s.diner);
        L.tension =
          full && L.belt.length >= L.beltCap - 2 ? Math.min(1, L.tension + dt * 2) : Math.max(0, L.tension - dt * 2);
        if (L.diners.every((d) => d.state === 'done')) win();
      }
    }
    if (L.status === 'failing') {
      L.failSlow -= dt;
      L.elapsed += gdt;
      if (L.failSlow <= 0) {
        L.status = 'fail';
        L.failT = 10;
      }
    }
    if (L.status === 'fail') L.failT = Math.max(0, L.failT - dt);
  }
  const playing = L.status === 'play' && !G.screen;
  if (audioContext()) setRumble(playing ? L.tension : 0);
  keepAwake(playing);
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.t += dt;
    if (p.t >= p.dur) {
      S.coins += p.value;
      G.coinPop = 1;
      sfx.coin();
      G.particles.splice(i, 1);
      if (!G.particles.length) save();
    }
  }
  for (let i = G.toasts.length - 1; i >= 0; i--) {
    const t = G.toasts[i];
    t.t += dt;
    if (t.t > t.dur) G.toasts.splice(i, 1);
  }
}

function draw(): void {
  G.buttons = [];
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.save();
  const L = G.L;
  if (L && L.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * L.shake, (Math.random() - 0.5) * 12 * L.shake);
  drawBg();
  drawDecor();
  drawHud();
  drawBelt();
  drawPlatesOnBelt();
  drawKitchen();
  drawSeats();
  drawGrid();
  drawFloating();
  drawFx();
  drawBoosters();
  drawToasts();
  drawParticles();
  ctx.restore();
  if (G.screen) {
    G.buttons = [];
    drawScreen();
    return;
  }
  drawStatusOverlay();
}

function frame(ts: number): void {
  const dt = Math.min(0.05, G.lastT ? (ts - G.lastT) / 1000 : 0);
  G.lastT = ts;
  G.lastDt = dt;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

/** Generates an icon and a web manifest at runtime so the page can be added to a home screen. */
function installPWA(): void {
  try {
    const ic = document.createElement('canvas');
    ic.width = ic.height = 512;
    const c2 = ic.getContext('2d') as CanvasRenderingContext2D;
    c2.fillStyle = '#2B2622';
    c2.beginPath();
    c2.arc(256, 256, 256, 0, 7);
    c2.fill();
    c2.fillStyle = '#FFFDF7';
    c2.beginPath();
    c2.arc(256, 256, 190, 0, 7);
    c2.fill();
    c2.lineWidth = 46;
    c2.strokeStyle = '#E5484D';
    c2.beginPath();
    c2.arc(256, 256, 160, 0, 7);
    c2.stroke();
    c2.fillStyle = '#F1EAD6';
    c2.beginPath();
    c2.ellipse(256, 290, 110, 60, 0, 0, 7);
    c2.fill();
    c2.fillStyle = '#E5484D';
    c2.beginPath();
    c2.ellipse(256, 230, 120, 58, 0, 0, 7);
    c2.fill();
    const url = ic.toDataURL('image/png');
    const man = {
      name: 'Sushi Jam',
      short_name: 'Sushi Jam',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#171512',
      theme_color: '#2B2622',
      start_url: location.href,
      icons: [{ src: url, sizes: '512x512', type: 'image/png' }],
    };
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man));
    document.head.appendChild(link);
    const ai = document.createElement('link');
    ai.rel = 'apple-touch-icon';
    ai.href = url;
    document.head.appendChild(ai);
    for (const [n, c] of [
      ['theme-color', '#2B2622'],
      ['apple-mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
      ['apple-mobile-web-app-title', 'Sushi Jam'],
    ]) {
      const m = document.createElement('meta');
      m.name = n;
      m.content = c;
      document.head.appendChild(m);
    }
  } catch {
    /* manifest is a nicety */
  }
}

/* ---------- native integration ---------- */

/** Android back: close the top screen, else pause. The app never exits from here. */
function handleBack(): void {
  const sc = G.screen;
  if (sc) {
    if (sc.type === 'ad' || sc.type === 'daily' || sc.type === 'offer') return; // these have their own buttons
    G.screen = sc.back || null;
    return;
  }
  if (G.L && G.L.status === 'play') G.screen = { type: 'pause', t: 0 };
}

function bindNative(): void {
  setHapticsGate(() => S.haptics);
  hideStatusBar();
  onBackButton(handleBack);
  onAppActive((active) => {
    if (!active && G.L && G.L.status === 'play' && !G.screen) G.screen = { type: 'pause', t: 0 };
    if (active) resize();
  });
}

/* ---------- boot ---------- */

window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
setCloudProvider(cloudProviderFor(platform));
const loaded = load();
checkWeekly();
resize();
installPWA();
bindNative();
newLevel(S.level);
if (loaded.recovered) toast('Progress restored from a backup copy', 3.2, 0.8);
checkDaily();
bindInput();
bindStatsBox();
const startLoop = () =>
  requestAnimationFrame((ts) => {
    frame(ts);
    hideSplash();
  });
if (document.fonts && document.fonts.load) {
  Promise.race([document.fonts.load('800 20px "Baloo 2"'), new Promise((r) => setTimeout(r, 1500))]).then(
    startLoop,
    startLoop
  );
} else startLoop();

/* ---------- dev API for automated checks ---------- */

export interface DevApi {
  S: typeof S;
  getLevel: typeof getLevel;
  state: () => RuntimeLevel | null;
  screen: () => Screen | null;
  jump: (n: number) => void;
  auto: () => boolean;
  forceFail: () => void;
  closeScreen: () => void;
  setScreen: (s: Screen | null) => void;
  mechCard: () => void;
  skipIntro: () => void;
  back: () => void;
  saveApi: {
    save: (force?: boolean) => boolean;
    rotateBackup: () => boolean;
    backupInfo: typeof backupInfo;
    restoreFromBackup: () => boolean;
    clear: () => void;
    info: () => typeof loadInfo;
  };
}

declare global {
  interface Window {
    __SJ: DevApi;
  }
}

window.__SJ = {
  S,
  getLevel,
  state: () => G.L,
  screen: () => G.screen,
  jump: (n) => {
    G.screen = null;
    newLevel(n);
  },
  auto: devAuto,
  forceFail: () => fail('jam'),
  closeScreen,
  setScreen: (s) => {
    G.screen = s;
  },
  mechCard: nextMechCard,
  skipIntro: () => {
    if (G.L && G.L.status === 'intro') G.L.introT = 1.4;
  },
  back: handleBack,
  saveApi: {
    save: (force) => save(force),
    rotateBackup,
    backupInfo,
    restoreFromBackup,
    clear: clearSave,
    info: () => loadInfo,
  },
};
