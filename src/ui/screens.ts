/* Full-screen panels: demo ad, shop, starter offer, daily bonus, dev panel and the map. */

import { sfx } from '../audio/audio';
import { AUTHORED } from '../data/authored';
import { GOLD, H, TIER_COLOR, W } from '../data/constants';
import { DECOR } from '../data/decor';
import { MECH_UNLOCK } from '../data/mechanics';
import { PRODUCTS } from '../data/products';
import { schedTier } from '../engine/levels';
import { rng } from '../engine/rng';
import { addCoins, newLevel } from '../engine/rules';
import { cur, G, runPending, type MapTab, type Screen } from '../engine/state';
import { todayKey, weekKey } from '../engine/util';
import { buyDecor, buyProduct } from '../meta/economy';
import { clearSave, S, save } from '../meta/save';
import { weeklyBoard } from '../meta/weekly';
import { ctx } from '../render/canvas';
import { drawPlate } from '../render/plate';
import { card, coinIcon, dim, rrect, txt } from '../render/primitives';
import { button, closeBtn } from './buttons';
import { drawConfirm, drawPause, drawSettings } from './modals';

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
  txt('DEMO AD', 240, 240, 14, 800, 'rgba(255,255,255,.7)', 'center', 'middle');
  txt(sc.kind === 'inter' ? 'Ad break' : 'Watch to earn', 240, 285, 34, 800, '#fff', 'center', 'middle');
  const bob = Math.abs(Math.sin(sc.t * 4)) * 26;
  drawPlate(240, 400 - bob, { color: Math.floor(R() * 7), vip: seed > 0.5 }, 48);
  txt('Sushi Jam Deluxe', 240, 490, 26, 800, '#fff', 'center', 'middle');
  txt(
    'This stands in for a real ad network placement.',
    240,
    526,
    14,
    700,
    'rgba(255,255,255,.85)',
    'center',
    'middle'
  );
  txt('Nothing is loaded or tracked.', 240, 548, 14, 700, 'rgba(255,255,255,.85)', 'center', 'middle');
  const left = Math.max(0, (sc.dur || 0) - sc.t);
  if (left > 0) {
    txt(
      sc.kind === 'inter' ? 'Skip in ' + Math.ceil(left) : 'Reward in ' + Math.ceil(left),
      240,
      660,
      18,
      800,
      '#FFF7E8',
      'center',
      'middle'
    );
  } else
    button(120, 640, 240, 48, sc.kind === 'inter' ? 'Continue' : 'Claim reward', null, {
      primary: true,
      onTap: () => {
        const f = sc.onDone;
        G.screen = null;
        if (f) f();
      },
    });
  if (sc.kind === 'inter')
    button(140, 710, 200, 36, 'Remove ads', null, {
      tone: '#3B3F4A',
      size: 14,
      onTap: () => {
        sfx.ui();
        G.screen = { type: 'shop', t: 0, back: sc };
      },
    });
}

function drawShop(sc: Screen): void {
  card(30, 80, 420, 740, '#E5484D', 'Shop');
  closeBtn(() => {
    sfx.ui();
    if (sc.back) G.screen = sc.back;
    else G.screen = null;
  });
  ctx.fillStyle = '#FFF0D6';
  rrect(50, 154, 380, 40, 10);
  ctx.fill();
  txt(
    'Demo store. Buttons grant items instantly. Nothing is charged.',
    240,
    174,
    13,
    800,
    '#8A5A00',
    'center',
    'middle'
  );
  coinIcon(70, 222, 11);
  txt(S.coins.toLocaleString() + ' coins', 88, 223, 18, 800, '#2A2320', 'left', 'middle');
  txt(
    'Boosters: VIP ' + S.inv.vip + ' · Takeout ' + S.inv.takeout + ' · Send Back ' + S.inv.sendback,
    430,
    223,
    13,
    700,
    '#5A4E45',
    'right',
    'middle'
  );
  PRODUCTS.forEach((p, i) => {
    const y = 250 + i * 96;
    ctx.fillStyle = '#FFFDF7';
    rrect(50, y, 380, 84, 12);
    ctx.fill();
    ctx.strokeStyle = '#EADFC4';
    ctx.lineWidth = 1;
    rrect(50, y, 380, 84, 12);
    ctx.stroke();
    txt(p.name, 66, y + 26, 20, 800, '#2A2320', 'left', 'middle');
    txt(p.desc, 66, y + 54, 13, 700, '#5A4E45', 'left', 'middle');
    const owned = p.id === 'noads' && S.noAds;
    button(318, y + 20, 96, 44, owned ? 'Owned' : p.price, owned ? null : 'buy · demo', {
      primary: !owned,
      disabled: owned,
      onTap: () => buyProduct(p.id),
    });
  });
  txt(
    'Real builds wire these to StoreKit / Play Billing and an ad SDK.',
    240,
    690,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
}

function drawOffer(): void {
  card(60, 220, 360, 400, '#8E5BE0', 'Starter Pack');
  txt('One-time offer', 240, 306, 14, 800, '#8E5BE0', 'center', 'middle');
  coinIcon(150, 350, 22);
  txt('600 coins', 182, 351, 24, 800, '#2A2320', 'left', 'middle');
  txt('+ 1 VIP Seat · 1 Takeout · 1 Send Back', 240, 396, 15, 700, '#5A4E45', 'center', 'middle');
  txt('Demo purchase. Nothing is charged.', 240, 424, 12, 700, '#8A8378', 'center', 'middle');
  button(90, 466, 300, 54, 'Buy for $1.99', 'demo', {
    primary: true,
    onTap: () => {
      buyProduct('starter');
      S.starterShown = true;
      save();
      G.screen = null;
      runPending();
    },
  });
  button(90, 532, 300, 44, 'No thanks', null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      S.starterShown = true;
      save();
      G.screen = null;
      runPending();
    },
  });
}

function drawDaily(sc: Screen): void {
  const reward = sc.reward || 0;
  card(60, 260, 360, 320, '#2FB36B', 'Daily bonus');
  txt('Day ' + S.dailyStreak + ' in a row', 240, 340, 18, 800, '#2A2320', 'center', 'middle');
  coinIcon(196, 400, 22);
  txt('+' + reward, 226, 401, 36, 800, '#2A2320', 'left', 'middle');
  txt('Come back tomorrow for a bigger bonus.', 240, 452, 14, 700, '#5A4E45', 'center', 'middle');
  button(120, 500, 240, 52, 'Collect', null, {
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
  card(30, 80, 420, 760, '#3B3F4A', 'Dev panel');
  closeBtn();
  const lv = L.lv;
  let y = 168;
  const line = (s: string, col?: string) => {
    txt(s, 50, y, 14, 700, col || '#2A2320', 'left', 'middle');
    y += 22;
  };
  line('Level ' + L.n + ' · schedule ' + lv.P.tier + ' · label ' + lv.tierLabel + (lv.authored ? ' · authored' : ''));
  line('Measured fail rate (noisy solver, 40 runs): ' + Math.round(lv.diff * 100) + '%', '#E5484D');
  line(
    'Grid ' +
      lv.rows +
      '×' +
      lv.cols +
      ' · ' +
      lv.diners.length +
      ' diners · ' +
      lv.kitchen.length +
      ' plates · ' +
      lv.P.colors +
      ' colours'
  );
  line(
    'Seats ' +
      L.seatCount +
      ' · belt cap ' +
      L.beltCap +
      ' · next visible ' +
      L.visibleNext +
      ' · loop ' +
      (1 / L.speed).toFixed(1) +
      's'
  );
  line('Mechanics here: ' + (lv.mechs.length ? lv.mechs.join(', ') : 'none'));
  line('Stats logged: ' + S.stats.length + ' · this week ' + S.weekly + ' cleared · streak ' + S.streak, '#5A4E45');
  const bx = 50,
    bw = 184;
  const go = (n: number) => () => {
    sfx.ui();
    G.screen = null;
    newLevel(n);
  };
  button(bx, 310, bw, 44, 'Skip +1 level', null, { tone: '#148F82', onTap: go(L.n + 1) });
  button(bx + 196, 310, bw, 44, 'Skip +10 levels', null, { tone: '#148F82', onTap: go(L.n + 10) });
  button(bx, 364, bw, 44, 'Back 10 levels', null, { tone: '#148F82', onTap: go(Math.max(1, L.n - 10)) });
  button(bx + 196, 364, bw, 44, 'All mechanics: ' + (S.devAllMech ? 'ON' : 'off'), 'from level 1', {
    tone: S.devAllMech ? '#E25E12' : '#6B6560',
    onTap: () => {
      sfx.ui();
      S.devAllMech = !S.devAllMech;
      save();
      newLevel(L.n);
    },
  });
  button(bx, 418, bw, 44, 'Demo ads: ' + (S.demoAds ? 'ON' : 'off'), null, {
    tone: S.demoAds ? '#E25E12' : '#6B6560',
    onTap: () => {
      sfx.ui();
      S.demoAds = !S.demoAds;
      save();
    },
  });
  button(bx + 196, 418, bw, 44, 'Give 1,000 coins', null, {
    tone: '#6A4C93',
    onTap: () => {
      S.coins += 1000;
      G.coinPop = 1;
      save();
      sfx.cash();
    },
  });
  button(bx, 472, bw, 44, 'Export stats JSON', null, {
    tone: '#3E7BFA',
    onTap: () => {
      sfx.ui();
      showStats();
    },
  });
  button(bx + 196, 472, bw, 44, 'Clear stats', null, {
    tone: '#6B6560',
    onTap: () => {
      sfx.ui();
      S.stats = [];
      save();
    },
  });
  button(bx, 526, bw * 2 + 12, 44, 'Reset all progress', null, {
    tone: '#E5484D',
    onTap: () => {
      sfx.ui();
      clearSave();
      location.reload();
    },
  });
  txt('Open this panel by tapping the level label five times.', 240, 600, 12, 700, '#8A8378', 'center', 'middle');
  txt(
    'Per-level log fields: time, taps, fails, boosters, belt peak, result.',
    240,
    620,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
}

function drawMap(sc: Screen): void {
  const L = cur(),
    gt = G.gt;
  card(30, 80, 420, 760, '#6A4C93', 'Map');
  closeBtn();
  const tabs: [MapTab, string][] = [
    ['path', 'Path'],
    ['decor', 'Decor'],
    ['weekly', 'Weekly'],
  ];
  tabs.forEach(([id, label], i) =>
    button(50 + i * 130, 160, 120, 38, label, null, {
      tone: sc.tab === id ? '#6A4C93' : '#B9B2A5',
      onTap: () => {
        sfx.ui();
        sc.tab = id;
      },
    })
  );
  if (sc.tab === 'path') {
    const start = Math.max(1, L.n - 5);
    ctx.save();
    const pts: { lvl: number; x: number; y: number }[] = [];
    for (let i = 0; i < 16; i++) pts.push({ lvl: start + i, x: 240 + Math.sin(i * 0.95) * 130, y: 780 - i * 38 });
    ctx.strokeStyle = '#D9CBB0';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    for (const p of pts) {
      const cleared = p.lvl < S.level,
        curL = p.lvl === L.n,
        st = schedTier(p.lvl);
      ctx.fillStyle = cleared ? '#2FB36B' : curL ? GOLD : '#E4D6B4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, curL ? 20 + Math.sin(gt * 4) * 2 : 16, 0, 7);
      ctx.fill();
      ctx.strokeStyle = TIER_COLOR[st];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curL ? 20 : 16, 0, 7);
      ctx.stroke();
      txt(p.lvl, p.x, p.y + 1, curL ? 16 : 13, 800, cleared || curL ? '#fff' : '#8A8378', 'center', 'middle');
      if (AUTHORED[p.lvl]) {
        ctx.fillStyle = '#E5484D';
        ctx.beginPath();
        ctx.moveTo(p.x + 14, p.y - 22);
        ctx.lineTo(p.x + 26, p.y - 16);
        ctx.lineTo(p.x + 14, p.y - 10);
        ctx.closePath();
        ctx.fill();
      }
      if (p.lvl % 10 === 1 && p.lvl > 20 && Object.values(MECH_UNLOCK).includes(p.lvl))
        txt('new rule', p.x, p.y - 26, 11, 800, '#3E7BFA', 'center', 'middle');
    }
    ctx.restore();
    txt('Ring colour = scheduled tier · flag = hand-made wall', 240, 815, 12, 700, '#8A8378', 'center', 'middle');
  } else if (sc.tab === 'decor') {
    coinIcon(70, 226, 11);
    txt(S.coins.toLocaleString() + ' coins', 88, 227, 18, 800, '#2A2320', 'left', 'middle');
    DECOR.forEach((d, i) => {
      const y = 250 + i * 96,
        owned = S.decor.includes(d.id);
      ctx.fillStyle = '#FFFDF7';
      rrect(50, y, 380, 84, 12);
      ctx.fill();
      ctx.strokeStyle = '#EADFC4';
      ctx.lineWidth = 1;
      rrect(50, y, 380, 84, 12);
      ctx.stroke();
      txt(d.name, 66, y + 26, 20, 800, '#2A2320', 'left', 'middle');
      txt(d.desc, 66, y + 54, 13, 700, '#5A4E45', 'left', 'middle');
      button(318, y + 20, 96, 44, owned ? 'Owned' : d.cost + '', owned ? null : 'coins', {
        tone: owned ? '#B9B2A5' : '#6A4C93',
        disabled: owned || S.coins < d.cost,
        onTap: () => buyDecor(d.id),
      });
      if (!owned && S.coins < d.cost)
        txt('need ' + (d.cost - S.coins) + ' more', 366, y + 74, 11, 700, '#8A8378', 'center', 'middle');
    });
  } else {
    const rows = weeklyBoard();
    txt('Levels cleared this week · ' + (S.weekKey || weekKey()), 240, 226, 13, 700, '#5A4E45', 'center', 'middle');
    rows.forEach((r, i) => {
      const y = 248 + i * 46;
      ctx.fillStyle = r.me ? '#FFF0D6' : i % 2 ? '#FFFDF7' : '#F7F0E0';
      rrect(50, y, 380, 40, 10);
      ctx.fill();
      txt('#' + (i + 1), 66, y + 21, 15, 800, i < 3 ? GOLD : '#8A8378', 'left', 'middle');
      txt(r.name, 110, y + 21, 17, 800, '#2A2320', 'left', 'middle');
      txt(r.score, 414, y + 21, 17, 800, r.me ? '#E5484D' : '#2A2320', 'right', 'middle');
    });
    txt(
      'Rivals are local ghosts seeded by the week. Swap in a backend later.',
      240,
      720,
      12,
      700,
      '#8A8378',
      'center',
      'middle'
    );
  }
}

export function drawScreen(): void {
  const sc = G.screen;
  if (!sc) return;
  if (sc.type === 'ad') {
    drawAd(sc);
    return;
  }
  dim(0.7);
  if (sc.type === 'shop') drawShop(sc);
  else if (sc.type === 'offer') drawOffer();
  else if (sc.type === 'daily') drawDaily(sc);
  else if (sc.type === 'dev') drawDev();
  else if (sc.type === 'map') drawMap(sc);
  else if (sc.type === 'settings') drawSettings(sc);
  else if (sc.type === 'pause') drawPause(sc);
  else if (sc.type === 'confirm') drawConfirm(sc);
}
