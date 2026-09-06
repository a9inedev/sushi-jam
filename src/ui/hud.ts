import { setRumble, sfx } from '../audio/audio';
import { COIN_POS, GOLD, TIER_COLOR } from '../data/constants';
import { logStat, newLevel } from '../engine/rules';
import { cur, G } from '../engine/state';
import { S, save } from '../meta/save';
import { ctx } from '../render/canvas';
import { coinIcon, rrect, textW, txt } from '../render/primitives';
import { badge, boosterButton, button, iconBtn } from './buttons';

export function drawHud(): void {
  const L = cur();
  txt('Level ' + L.n, 20, 46, 28, 800, '#FFF7E8');
  const tw = textW('Level ' + L.n, 28, 800);
  const bw = badge(L.lv.tierLabel.toUpperCase(), 28 + tw, 26, TIER_COLOR[L.lv.tierLabel]);
  if (S.streak > 1) {
    const fx0 = 28 + tw + bw + 12;
    ctx.save();
    ctx.fillStyle = '#F5843B';
    ctx.beginPath();
    ctx.moveTo(fx0, 46);
    ctx.quadraticCurveTo(fx0 - 9, 36, fx0 - 2, 26);
    ctx.quadraticCurveTo(fx0, 32, fx0 + 3, 28);
    ctx.quadraticCurveTo(fx0 + 9, 38, fx0, 46);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(fx0, 41, 3.5, 0, 7);
    ctx.fill();
    ctx.restore();
    txt(S.streak, fx0 + 12, 39, 15, 800, '#F5843B', 'left', 'middle');
  }
  // Tapping the level label five times within two seconds opens the dev panel.
  G.buttons.push({
    x: 10,
    y: 14,
    w: 20 + tw,
    h: 44,
    onTap: () => {
      const now = performance.now();
      G.devTaps = G.devTaps.filter((t) => now - t < 2000);
      G.devTaps.push(now);
      if (G.devTaps.length >= 5) {
        G.devTaps = [];
        G.screen = { type: 'dev', t: 0 };
      }
    },
  });
  button(262, 20, 36, 36, S.sound ? '♪' : '✕', null, {
    tone: '#4A4540',
    onTap: () => {
      S.sound = !S.sound;
      save();
      if (S.sound) sfx.tap();
      else setRumble(0);
    },
  });
  button(304, 20, 36, 36, '↻', null, {
    tone: '#4A4540',
    onTap: () => {
      sfx.tap();
      if (L.status === 'play' && L.stat.taps > 0) logStat('restart');
      newLevel(L.n);
    },
  });
  const pop = 1 + G.coinPop * 0.15;
  ctx.save();
  ctx.translate(COIN_POS.x, COIN_POS.y);
  ctx.scale(pop, pop);
  coinIcon(0, 0, 11);
  ctx.restore();
  txt(S.coins.toLocaleString(), 382, 39, 22, 800, GOLD, 'left', 'middle');
  iconBtn(34, 100, 66, 52, 'map', 'MAP', () => {
    sfx.tap();
    G.screen = { type: 'map', tab: 'path', t: 0 };
  });
  iconBtn(380, 100, 66, 52, 'shop', 'SHOP', () => {
    sfx.tap();
    G.screen = { type: 'shop', t: 0 };
  });
}

export function drawBoosters(): void {
  const L = cur();
  if (L.status !== 'play' && L.status !== 'intro' && L.status !== 'mech') return;
  const dis = L.status !== 'play',
    y = 530;
  boosterButton(120, y, 'vip', '#6A4C93', dis || L.vipUsed, false, L.vipUsed);
  boosterButton(240, y, 'takeout', '#148F82', dis, L.armed === 'takeout', false);
  boosterButton(360, y, 'sendback', '#E25E12', dis, L.armed === 'sendback', false);
  if (L.armed) {
    ctx.save();
    ctx.fillStyle = 'rgba(42,35,32,.92)';
    rrect(90, 262, 300, 56, 12);
    ctx.fill();
    txt(
      L.armed === 'takeout' ? 'Tap a seated diner to serve them to go' : 'Tap a plate on the belt to send it back',
      240,
      282,
      14,
      800,
      '#fff',
      'center',
      'middle'
    );
    button(190, 292, 100, 22, 'Cancel', null, {
      tone: '#6B6560',
      size: 13,
      onTap: () => {
        L.armed = null;
      },
    });
    ctx.restore();
  }
}
