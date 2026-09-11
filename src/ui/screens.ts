/* Full-screen panels: demo ad, shop, starter offer, daily bonus, dev panel and the map. */

import { sfx } from '../audio/audio';
import { easeBack } from '../engine/util';
import { reducedMotion } from '../anim/motion';
import { COLORS, GOLD, H, TIER_COLOR, W } from '../data/constants';
import { CHARACTERS } from '../art/characters';
import { DECOR_ART } from '../art/decor';
import { sprite } from '../art/svg';
import { curveFor } from '../data/curve';
import { activeTheme } from '../data/theme-state';
import { DECOR, decorOf, themeById, themeUnlocked, THEMES } from '../data/themes';
import { drawCharacter } from '../render/diner';
import { MECH_UNLOCK } from '../data/mechanics';
import { PRODUCTS } from '../data/products';
import { starterBought } from '../meta/offers';
import { buy, isDemoStore, priceOf, store } from '../meta/purchases';
import { schedTier, isAuthored } from '../engine/levels';
import { rng } from '../engine/rng';
import { addCoins, newLevel } from '../engine/rules';
import { cur, G, runPending, type MapTab, type Screen, toast } from '../engine/state';
import { todayKey } from '../engine/util';
import { t } from '../i18n';
import { buyDecor, buyProduct } from '../meta/economy';
import { clearSave, S, save } from '../meta/save';
import { ctx } from '../render/canvas';
import { drawPlate } from '../render/plate';
import { card, coinIcon, dim, lanternIcon, paper, rrect, txt, UI, wood } from '../render/primitives';
import { button, closeBtn } from './buttons';
import { dateKey, puzzleStreak } from '../engine/modes-core';
import { startMode } from '../meta/modes';
import { locale } from '../i18n';
import { drawEditor, importJson, openEditor } from './editor';
import { drawEventBanner, drawEventsScreen } from './events';
import { drawNotifyPrompt } from './notify';
import { drawLivesScreen } from './lives';
import { analyticsReport, exportAnalytics, track } from '../meta/analytics';
import { flagsStatus, livesOverride, livesVariant, setLivesOverride } from '../meta/flags';
import { lives } from '../meta/lives';
import { drawProfileScreen, drawRanksTab } from './ranks';
import { drawConfirm, drawPause, drawSettings } from './modals';
import { resetTutorial } from './tutorial';

export function showStats(): void {
  const box = document.getElementById('statsBox') as HTMLElement;
  const ta = document.getElementById('statsText') as HTMLTextAreaElement;
  ta.value = JSON.stringify(
    { exported: new Date().toISOString(), level: S.level, coins: S.coins, records: S.stats },
    null,
    2
  );
  box.style.display = 'block';
}

export function bindStatsBox(): void {
  const close = document.getElementById('statsClose');
  if (close)
    close.addEventListener('click', () => {
      (document.getElementById('statsBox') as HTMLElement).style.display = 'none';
    });
  const apply = document.getElementById('statsApply');
  if (apply)
    apply.addEventListener('click', () => {
      const ta = document.getElementById('statsText') as HTMLTextAreaElement;
      if (importJson(ta.value)) (document.getElementById('statsBox') as HTMLElement).style.display = 'none';
    });
}

function drawAd(sc: Screen): void {
  ctx.fillStyle = '#12100E';
  ctx.fillRect(0, 0, W, H);
  const seed = sc.seed || 0;
  const R = rng(Math.floor(seed * 1e9));
  const hue = ['#E5484D', '#3E7BFA', '#8E5BE0', '#148F82'][Math.floor(seed * 4)];
  ctx.fillStyle = hue;
  rrect(40, 200, 400, 420, 24);
  ctx.fill();
  txt(t('ad.demo'), 240, 240, 14, 800, 'rgba(255,255,255,.7)', 'center', 'middle');
  txt(sc.kind === 'inter' ? t('ad.break') : t('ad.watch'), 240, 285, 34, 800, '#fff', 'center', 'middle');
  const bob = Math.abs(Math.sin(sc.t * 4)) * 26;
  drawPlate(240, 400 - bob, { color: Math.floor(R() * 7), vip: seed > 0.5 }, 48);
  txt(t('ad.product'), 240, 490, 26, 800, '#fff', 'center', 'middle');
  txt(t('ad.placeholder1'), 240, 526, 14, 700, 'rgba(255,255,255,.85)', 'center', 'middle');
  txt(t('ad.placeholder2'), 240, 548, 14, 700, 'rgba(255,255,255,.85)', 'center', 'middle');
  const left = Math.max(0, (sc.dur || 0) - sc.t);
  if (left > 0) {
    const n = Math.ceil(left);
    txt(
      sc.kind === 'inter' ? t('ad.skipIn', { n }) : t('ad.rewardIn', { n }),
      240,
      660,
      18,
      800,
      '#FFF7E8',
      'center',
      'middle'
    );
  } else
    button(120, 640, 240, 48, sc.kind === 'inter' ? t('ad.continue') : t('ad.claim'), null, {
      primary: true,
      onTap: () => {
        const f = sc.onDone;
        track('ad', { kind: sc.kind || 'inter' });
        G.screen = null;
        if (f) f();
      },
    });
  if (sc.kind === 'inter')
    button(140, 710, 200, 36, t('ad.remove'), null, {
      tone: '#3B3F4A',
      size: 14,
      onTap: () => {
        sfx.ui();
        G.screen = { type: 'shop', t: 0, back: sc };
      },
    });
}

function drawShop(sc: Screen): void {
  card(30, 80, 420, 740, '#E5484D', t('shop.title'));
  closeBtn(() => {
    sfx.ui();
    if (sc.back) G.screen = sc.back;
    else G.screen = null;
  });
  ctx.fillStyle = '#FFF0D6';
  rrect(50, 154, 380, 40, 10);
  ctx.fill();
  txt(isDemoStore() ? t('shop.demo') : t('shop.real'), 240, 174, 13, 800, '#8A5A00', 'center', 'middle');
  coinIcon(70, 222, 11);
  txt(t('shop.coins', { n: S.coins.toLocaleString() }), 88, 223, 18, 800, '#2A2320', 'left', 'middle');
  txt(
    t('shop.boosters', { v: S.inv.vip, t: S.inv.takeout, s: S.inv.sendback }),
    430,
    223,
    13,
    700,
    '#5A4E45',
    'right',
    'middle'
  );
  PRODUCTS.forEach((p, i) => {
    const y = 250 + i * 86;
    wood(44, y + 70, 392, 9, 3, UI.wood);
    ctx.fillStyle = 'rgba(42,31,26,.22)';
    rrect(50, y + 62, 380, 12, 6);
    ctx.fill();
    paper(50, y, 380, 72, 12, UI.rice);
    txt(t('product.' + p.id + '.name'), 66, y + 24, 18, 800, '#2A2320', 'left', 'middle');
    txt(t('product.' + p.id + '.desc'), 66, y + 50, 12, 700, '#5A4E45', 'left', 'middle');
    const owned = (p.id === 'noads' && S.noAds) || (p.id === 'season' && S.season.premium);
    const busy = store.busy === p.id;
    button(
      318,
      y + 16,
      96,
      44,
      owned ? t('shop.owned') : busy ? '…' : priceOf(p.id), // i18n-ignore
      owned || busy ? null : isDemoStore() ? t('shop.buy') : t('shop.buyReal'),
      {
        primary: !owned,
        disabled: owned || !!store.busy,
        onTap: () => buyProduct(p.id),
      }
    );
  });
  txt(isDemoStore() ? t('shop.footer') : t('shop.restoreHint'), 240, 790, 12, 700, '#8A8378', 'center', 'middle');
}

function drawOffer(): void {
  card(60, 220, 360, 400, '#8E5BE0', t('offer.title'));
  txt(t('offer.once'), 240, 306, 14, 800, '#8E5BE0', 'center', 'middle');
  coinIcon(150, 350, 22);
  txt(t('offer.coins'), 182, 351, 24, 800, '#2A2320', 'left', 'middle');
  txt(t('offer.items'), 240, 396, 15, 700, '#5A4E45', 'center', 'middle');
  txt(isDemoStore() ? t('offer.demo') : t('offer.real'), 240, 424, 12, 700, '#8A8378', 'center', 'middle');
  const busy = store.busy === 'starter';
  button(
    90,
    466,
    300,
    54,
    busy ? '…' : t('offer.buy', { price: priceOf('starter') }),
    isDemoStore() ? t('offer.demoTag') : null,
    {
      // i18n-ignore
      primary: true,
      disabled: !!store.busy,
      onTap: () => {
        sfx.ui();
        void buy('starter').then((r) => {
          if (r.status !== 'ok') return;
          starterBought();
          G.screen = null;
          runPending();
        });
      },
    }
  );
  button(90, 532, 300, 44, t('offer.no'), null, {
    tone: '#3B3F4A',
    disabled: busy,
    onTap: () => {
      sfx.ui();
      G.screen = null;
      runPending();
    },
  });
}

function drawDaily(sc: Screen): void {
  const reward = sc.reward || 0;
  card(60, 260, 360, 320, '#2FB36B', t('daily.title'));
  txt(t('daily.day', { n: S.dailyStreak }), 240, 340, 18, 800, '#2A2320', 'center', 'middle');
  coinIcon(196, 400, 22);
  txt('+' + reward, 226, 401, 36, 800, '#2A2320', 'left', 'middle');
  txt(t('daily.tomorrow'), 240, 452, 14, 700, '#5A4E45', 'center', 'middle');
  button(120, 500, 240, 52, t('daily.collect'), null, {
    primary: true,
    onTap: () => {
      S.lastDaily = todayKey();
      addCoins(reward, 240, 400);
      save();
      sfx.cash();
      G.screen = null;
    },
  });
}

function drawDev(): void {
  const L = cur();
  card(30, 80, 420, 760, '#3B3F4A', t('dev.title'));
  closeBtn();
  const lv = L.lv;
  let y = 168;
  const line = (s: string, col?: string) => {
    txt(s, 50, y, 14, 700, col || '#2A2320', 'left', 'middle');
    y += 22;
  };
  line(
    t('dev.levelLine', { n: L.n, sched: lv.P.tier, label: lv.tierLabel }) + (lv.authored ? t('dev.authoredTag') : '')
  );
  line(t('dev.failRate', { pct: Math.round(lv.diff * 100) }), '#E5484D');
  line(
    t('dev.gridLine', {
      rows: lv.rows,
      cols: lv.cols,
      diners: lv.diners.length,
      plates: lv.kitchen.length,
      colours: lv.P.colors,
    })
  );
  line(
    t('dev.seatsLine', {
      seats: L.seatCount,
      cap: L.beltCap,
      vis: L.visibleNext,
      loop: (1 / L.speed).toFixed(1),
    })
  );
  line(t('dev.mechs', { list: lv.mechs.length ? lv.mechs.join(', ') : t('dev.none') }));
  line(t('dev.stats', { n: S.stats.length, w: S.weekly, s: S.streak, fps: Math.round(G.fps) }), '#5A4E45');
  const lv13 = lives();
  line(
    t('dev.lives', {
      v: livesVariant(),
      src: livesOverride() ? 'override' : flagsStatus().source,
      n: lv13.n,
      max: lv13.max,
    }),
    '#5A4E45'
  );
  const rep = analyticsReport()[livesVariant()];
  line(
    t('dev.analytics', { s: rep.sessions, m: rep.avgSessionMin, r: rep.retriesPerFail, a: rep.adsPerSession }),
    '#5A4E45'
  );
  const bx = 50,
    bw = 184;
  const go = (n: number) => () => {
    sfx.ui();
    G.screen = null;
    newLevel(n);
  };
  button(bx, 310, bw, 44, t('dev.skip1'), null, { tone: '#148F82', onTap: go(L.n + 1) });
  button(bx + 196, 310, bw, 44, t('dev.skip10'), null, { tone: '#148F82', onTap: go(L.n + 10) });
  button(bx, 364, bw, 44, t('dev.back10'), null, { tone: '#148F82', onTap: go(Math.max(1, L.n - 10)) });
  button(
    bx + 196,
    364,
    bw,
    44,
    t('dev.allMech', { state: S.devAllMech ? t('dev.on') : t('dev.off') }),
    t('dev.fromLevel1'),
    {
      tone: S.devAllMech ? '#E25E12' : '#6B6560',
      onTap: () => {
        sfx.ui();
        S.devAllMech = !S.devAllMech;
        save();
        newLevel(L.n);
      },
    }
  );
  button(bx, 418, bw, 44, t('dev.demoAds', { state: S.demoAds ? t('dev.on') : t('dev.off') }), null, {
    tone: S.demoAds ? '#E25E12' : '#6B6560',
    onTap: () => {
      sfx.ui();
      S.demoAds = !S.demoAds;
      save();
    },
  });
  button(bx + 196, 418, bw, 44, t('dev.giveCoins'), null, {
    tone: '#6A4C93',
    onTap: () => {
      S.coins += 1000;
      G.coinPop = 1;
      save();
      sfx.cash();
    },
  });
  button(bx, 472, bw, 44, t('dev.export'), null, {
    tone: '#3E7BFA',
    onTap: () => {
      sfx.ui();
      showStats();
    },
  });
  button(bx + 196, 472, bw, 44, t('dev.clearStats'), null, {
    tone: '#6B6560',
    onTap: () => {
      sfx.ui();
      S.stats = [];
      save();
    },
  });
  button(bx, 526, bw, 44, t('dev.replayTutorial'), null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      resetTutorial();
      G.screen = null;
      newLevel(1);
    },
  });
  button(bx + 196, 526, bw, 44, t('dev.reset'), null, {
    tone: '#E5484D',
    onTap: () => {
      sfx.ui();
      clearSave();
      location.reload();
    },
  });
  button(bx, 634, bw, 44, t('dev.livesToggle', { v: livesOverride() || 'auto' }), null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      const cur13 = livesOverride();
      setLivesOverride(cur13 === null ? 'B' : cur13 === 'B' ? 'A' : null);
    },
  });
  button(bx + 196, 634, bw, 44, t('dev.exportAnalytics'), null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      const json = exportAnalytics();
      const nav = navigator as Navigator & { clipboard?: { writeText: (s: string) => Promise<void> } };
      if (nav.clipboard) void nav.clipboard.writeText(json).then(() => toast(t('dev.analyticsCopied'), 2));
      else toast(t('dev.analyticsCopied'), 2);
    },
  });
  button(bx, 580, bw * 2 + 16, 44, t('dev.editor'), null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      openEditor(cur().n);
    },
  });
  txt(t('dev.hint1'), 240, 650, 12, 700, '#8A8378', 'center', 'middle');
  txt(t('dev.hint2'), 240, 670, 12, 700, '#8A8378', 'center', 'middle');
}

function drawMap(sc: Screen): void {
  const L = cur(),
    gt = G.gt;
  card(30, 80, 420, 760, '#6A4C93', t('map.title'));
  closeBtn();
  const tabs: [MapTab, string][] = [
    ['path', t('map.path')],
    ['modes', t('map.modes')],
    ['decor', t('map.decor')],
    ['album', t('map.album')],
    ['weekly', t('map.ranks')],
  ];
  tabs.forEach(([id, label], i) =>
    button(50 + i * 80, 160, 76, 38, label, null, {
      size: 12,
      tone: sc.tab === id ? '#6A4C93' : '#B9B2A5',
      onTap: () => {
        sfx.ui();
        sc.tab = id;
      },
    })
  );
  if (sc.tab === 'path') {
    // Side modes never move the path: it is anchored on the level counter while one is being played.
    const home = L.mode === 'level' ? L.n : S.level;
    const start = Math.max(1, home - 5);
    ctx.save();
    paper(50, 262, 380, 560, 12, UI.cream);
    const pts: { lvl: number; x: number; y: number }[] = [];
    drawEventBanner(50, 200, 380, 56);
    for (let i = 0; i < 14; i++) pts.push({ lvl: start + i, x: 240 + Math.sin(i * 0.95) * 130, y: 780 - i * 38 });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [wd, col] of [
      [18, 'rgba(122,74,34,.28)'],
      [9, 'rgba(122,74,34,.45)'],
      [3, 'rgba(42,31,26,.35)'],
    ] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    for (const p of pts) {
      const cleared = p.lvl < S.level,
        curL = p.lvl === home,
        st = schedTier(p.lvl);
      if (curL) {
        // The current level: a lantern, breathing.
        lanternIcon(p.x, p.y - 4, 15 + Math.sin(gt * 4), 0.5 + G.glowPulse * 0.5);
        txt(p.lvl, p.x, p.y, 15, 800, UI.rice, 'center', 'middle');
      } else {
        // A stamp: cream disc, a double ring in the tier colour, cleared ones inked green.
        ctx.fillStyle = cleared ? '#2FB36B' : UI.cream;
        ctx.strokeStyle = cleared ? '#1F8A4E' : TIER_COLOR[st];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, 7);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12.5, 0, 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
        txt(p.lvl, p.x, p.y + 1, 13, 800, cleared ? UI.rice : TIER_COLOR[st], 'center', 'middle', '-0.5px');
      }
      if (isAuthored(p.lvl)) {
        ctx.fillStyle = '#E5484D';
        ctx.beginPath();
        ctx.moveTo(p.x + 14, p.y - 22);
        ctx.lineTo(p.x + 26, p.y - 16);
        ctx.lineTo(p.x + 14, p.y - 10);
        ctx.closePath();
        ctx.fill();
      }
      if (p.lvl % 10 === 1 && p.lvl > 20 && Object.values(MECH_UNLOCK).includes(p.lvl))
        txt(t('map.newRule'), p.x, p.y - 26, 11, 800, '#3E7BFA', 'center', 'middle');
    }
    ctx.restore();
    txt(t('map.legend'), 240, 815, 12, 700, '#8A8378', 'center', 'middle');
  } else if (sc.tab === 'modes') {
    drawModes();
  } else if (sc.tab === 'decor') {
    drawDecorShop(sc);
  } else if (sc.tab === 'album') {
    drawAlbum();
  } else {
    drawRanksTab(sc);
  }
}

export function drawScreen(): void {
  const sc = G.screen;
  if (!sc) return;
  if (sc.type === 'ad') {
    drawAd(sc);
    return;
  }
  // Every card slides up with an ease-out-back while its dim and shadow fade in, within 220 ms.
  const u = reducedMotion() ? 1 : Math.min(1, sc.t / 0.22);
  dim(0.7 * Math.min(1, u * 1.6));
  ctx.save();
  ctx.globalAlpha = Math.min(1, u * 1.5);
  ctx.translate(0, (1 - easeBack(u)) * 40);
  if (sc.type === 'shop') drawShop(sc);
  else if (sc.type === 'offer') drawOffer();
  else if (sc.type === 'daily') drawDaily(sc);
  else if (sc.type === 'dev') drawDev();
  else if (sc.type === 'editor') drawEditor();
  else if (sc.type === 'events') drawEventsScreen(sc);
  else if (sc.type === 'profile') drawProfileScreen(sc);
  else if (sc.type === 'notify') drawNotifyPrompt(sc);
  else if (sc.type === 'lives') drawLivesScreen(sc);
  else if (sc.type === 'map') drawMap(sc);
  else if (sc.type === 'settings') drawSettings(sc);
  else if (sc.type === 'pause') drawPause(sc);
  else if (sc.type === 'confirm') drawConfirm(sc);
  ctx.restore();
}

/** The Modes tab of the map: the daily puzzle with its streak calendar, rush with its best, zen with its rung. */
function drawModes(): void {
  const today = dateKey(),
    done = S.puzzleDays.includes(today),
    streak = puzzleStreak(S.puzzleDays, today);
  const panel = (
    y: number,
    h: number,
    color: string,
    title: string,
    desc: string,
    status: string,
    onPlay: () => void
  ) => {
    ctx.fillStyle = '#FFFDF7';
    rrect(50, y, 380, h, 12);
    ctx.fill();
    ctx.fillStyle = color;
    rrect(50, y, 8, h, 4);
    ctx.fill();
    txt(title, 72, y + 26, 20, 800, '#2A2320', 'left', 'middle');
    txt(desc, 72, y + 52, 11, 700, '#5A4E45', 'left', 'middle');
    txt(status, 72, y + 74, 13, 800, color, 'left', 'middle');
    button(318, y + 16, 96, 44, t('mode.play'), null, {
      tone: color,
      onTap: () => {
        sfx.ui();
        onPlay();
      },
    });
  };
  panel(
    206,
    262,
    '#3E7BFA',
    t('mode.daily'),
    t('mode.dailyDesc'),
    done ? t('mode.dailyDone', { n: streak }) : t('mode.dailyTodo', { n: streak }),
    () => startMode('daily')
  );
  drawCalendar(72, 318, today);
  panel(478, 100, '#E25E12', t('mode.rush'), t('mode.rushDesc'), t('mode.rushBest', { n: S.rushBest }), () =>
    startMode('rush')
  );
  panel(588, 100, '#148F82', t('mode.zen'), t('mode.zenDesc'), t('mode.hudZen', { n: S.zenLevel }), () =>
    startMode('zen')
  );
  txt(t('mode.noProgress'), 240, 716, 12, 700, '#8A8378', 'center', 'middle');
}

/** This month, Monday first: won days filled, today ringed. */
function drawCalendar(x: number, y: number, today: string): void {
  const [yy, mm] = today.split('-').map(Number);
  const first = new Date(yy, mm - 1, 1);
  const days = new Date(yy, mm, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cell = 21;
  const lang = locale() || 'en';
  txt(
    first.toLocaleDateString(lang, { month: 'long', year: 'numeric' }),
    x,
    y - 14,
    12,
    800,
    '#5A4E45',
    'left',
    'middle'
  );
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i); // a Monday
    txt(
      d.toLocaleDateString(lang, { weekday: 'narrow' }),
      x + i * cell + cell / 2,
      y + 4,
      10,
      800,
      '#8A8378',
      'center',
      'middle'
    );
  }
  for (let d = 1; d <= days; d++) {
    const idx = offset + d - 1,
      cx = x + (idx % 7) * cell + cell / 2,
      cy = y + 20 + Math.floor(idx / 7) * cell + cell / 2;
    const key = today.slice(0, 8) + String(d).padStart(2, '0');
    const won = S.puzzleDays.includes(key);
    ctx.fillStyle = won ? '#2FB36B' : '#EDE6D3';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, 7);
    ctx.fill();
    if (key === today) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 11.5, 0, 7);
      ctx.stroke();
    }
    txt(d, cx, cy + 1, 9, 800, won ? '#fff' : '#8A8378', 'center', 'middle');
  }
}

/** A decor piece's picture, fitted into a box; sign pieces show their glow word. */
function drawDecorPreview(id: string, x: number, y: number, size: number, accent: string, dimmed: boolean): void {
  const art = DECOR_ART[id];
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.35;
  if (art) {
    const img = sprite('decor:' + id, art.svg, art.w, art.h);
    if (img) {
      const k = Math.min(size / art.w, size / art.h);
      ctx.drawImage(img, x + (size - art.w * k) / 2, y + (size - art.h * k) / 2, art.w * k, art.h * k);
    }
  } else {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    txt(t('decor.signPreview'), x + size / 2, y + size / 2, Math.round(size * 0.32), 800, accent, 'center', 'middle');
  }
  ctx.restore();
}

/** The Decor tab: a chip per restaurant, three pieces for the chosen one, and its set reward. */
function drawDecorShop(sc: Screen): void {
  const sel = themeById(sc.theme || activeTheme().id);
  coinIcon(70, 216, 11);
  txt(t('shop.coins', { n: S.coins.toLocaleString() }), 88, 217, 16, 800, '#2A2320', 'left', 'middle');
  THEMES.forEach((th, i) => {
    const open = themeUnlocked(th, S.best);
    button(
      50 + i * 78,
      236,
      74,
      34,
      open ? t('theme.' + th.id + '.short') : t('theme.lockedAt', { n: th.from }),
      null,
      {
        size: 11,
        tone: sel.id === th.id ? th.palette.accent : open ? '#6B6560' : '#B9B2A5',
        disabled: !open,
        onTap: () => {
          sfx.ui();
          sc.theme = th.id;
        },
      }
    );
  });
  decorOf(sel.id).forEach((d, i) => {
    const y = 286 + i * 96,
      owned = S.decor.includes(d.id);
    wood(44, y + 78, 392, 9, 3, UI.wood);
    ctx.fillStyle = 'rgba(42,31,26,.22)';
    rrect(50, y + 70, 380, 12, 6);
    ctx.fill();
    paper(50, y, 380, 80, 12, UI.rice);
    drawDecorPreview(d.id, 62, y + 14, 56, sel.palette.accent, false);
    txt(t('decor.' + d.id + '.name'), 130, y + 26, 18, 800, '#2A2320', 'left', 'middle');
    txt(t('decor.' + d.id + '.desc'), 130, y + 54, 12, 700, '#5A4E45', 'left', 'middle');
    button(318, y + 20, 96, 44, owned ? t('shop.owned') : d.cost + '', owned ? null : t('map.coinsLabel'), {
      tone: owned ? '#B9B2A5' : sel.palette.accent,
      disabled: owned || S.coins < d.cost,
      onTap: () => buyDecor(d.id),
    });
    if (!owned && S.coins < d.cost)
      txt(t('map.need', { n: d.cost - S.coins }), 366, y + 74, 11, 700, '#8A8378', 'center', 'middle');
  });
  const paid = S.decorRewards.includes(sel.id);
  txt(
    paid ? t('decor.setDone', { n: sel.reward }) : t('decor.setHint', { n: sel.reward }),
    240,
    592,
    13,
    800,
    paid ? '#2FB36B' : '#8A8378',
    'center',
    'middle'
  );
  txt(t('decor.onlyHere', { name: t('theme.' + sel.id + '.name') }), 240, 614, 11, 700, '#8A8378', 'center', 'middle');
}

/** The Album: restaurants, characters, plates and decor, with what is collected so far. */
function drawAlbum(): void {
  const best = S.best;
  const colors = Math.max(3, curveFor(Math.max(1, best)).colors);
  let have = 0,
    total = 0;
  txt(t('album.restaurants'), 60, 216, 13, 800, '#5A4E45', 'left', 'middle');
  THEMES.forEach((th, i) => {
    const open = themeUnlocked(th, best);
    total++;
    if (open) have++;
    const x = 60 + i * 74;
    ctx.fillStyle = open ? th.palette.headerDark : '#D9D2C4';
    rrect(x, 228, 66, 46, 8);
    ctx.fill();
    ctx.fillStyle = open ? th.palette.accent : '#B9B2A5';
    rrect(x, 266, 66, 8, 3);
    ctx.fill();
    txt(
      open ? t('theme.' + th.id + '.short') : t('theme.lockedAt', { n: th.from }),
      x + 33,
      248,
      10,
      800,
      open ? '#FFF7E8' : '#8A8378',
      'center',
      'middle'
    );
  });
  txt(t('album.characters'), 60, 298, 13, 800, '#5A4E45', 'left', 'middle');
  CHARACTERS.forEach((c, i) => {
    const open = c.color < colors;
    total++;
    if (open) have++;
    const x = 80 + i * 53;
    ctx.save();
    ctx.translate(x, 336);
    if (open) {
      if (!drawCharacter(c.color, 'idle', false, 17)) {
        ctx.fillStyle = COLORS[c.color].hex;
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#D9D2C4';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, 7);
      ctx.fill();
      txt(t('album.unknown'), 0, 1, 16, 800, '#B9B2A5', 'center', 'middle');
    }
    ctx.restore();
    txt(open ? c.name : t('album.unknown'), x, 366, 10, 800, open ? '#2A2320' : '#B9B2A5', 'center', 'middle');
  });
  txt(t('album.plates'), 60, 392, 13, 800, '#5A4E45', 'left', 'middle');
  for (let i = 0; i < 7; i++) {
    const open = i < colors;
    total++;
    if (open) have++;
    const x = 80 + i * 53;
    if (open) drawPlate(x, 424, { color: i }, 15);
    else {
      ctx.fillStyle = '#D9D2C4';
      ctx.beginPath();
      ctx.arc(x, 424, 15, 0, 7);
      ctx.fill();
      txt(t('album.unknown'), x, 425, 14, 800, '#B9B2A5', 'center', 'middle');
    }
  }
  txt(t('album.decor'), 60, 462, 13, 800, '#5A4E45', 'left', 'middle');
  DECOR.forEach((d, i) => {
    const owned = S.decor.includes(d.id);
    total++;
    if (owned) have++;
    const x = 58 + (i % 5) * 74,
      y = 474 + Math.floor(i / 5) * 78;
    ctx.fillStyle = owned ? '#FFFDF7' : '#F1EBDD';
    rrect(x, y, 68, 68, 10);
    ctx.fill();
    drawDecorPreview(d.id, x + 14, y + 6, 40, themeById(d.theme).palette.accent, !owned);
    txt(t('decor.' + d.id + '.name'), x + 34, y + 58, 8, 800, owned ? '#2A2320' : '#B9B2A5', 'center', 'middle');
  });
  txt(t('album.collected', { a: have, b: total }), 240, 726, 13, 800, '#5A4E45', 'center', 'middle');
}
