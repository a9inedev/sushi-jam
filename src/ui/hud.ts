import { applyVolumes, sfx } from '../audio/audio';
import { COIN_POS, GOLD, TIER_COLOR, W } from '../data/constants';
import { logStat, newLevel } from '../engine/rules';
import { cur, G } from '../engine/state';
import type { Tier } from '../engine/types';
import { t } from '../i18n';
import { S, save } from '../meta/save';
import { ctx } from '../render/canvas';
import { coinIcon, rrect, textW, txt } from '../render/primitives';
import { badge, boosterButton, button, iconBtn } from './buttons';

const TIER_KEY: Record<Tier, string> = {
  Easy: 'tier.easy',
  Medium: 'tier.medium',
  Hard: 'tier.hard',
  'Super Hard': 'tier.superHard', // i18n-ignore
};

export function tierLabel(tier: Tier): string {
  return t(TIER_KEY[tier]);
}

/** Left-handed layout mirrors the HUD: a rect at x with width w moves to the other side. */
export function mx(x: number, w: number): number {
  return S.leftHanded ? W - x - w : x;
}

/** The coin counter's icon position for the current layout. */
export function coinPos(): { x: number; y: number } {
  return { x: mx(COIN_POS.x, 0), y: COIN_POS.y };
}

export function drawHud(): void {
  const L = cur();
  const left = !S.leftHanded;
  const label = t('hud.level', { n: L.n });
  const tw = textW(label, 28, 800);
  const tier = tierLabel(L.lv.tierLabel);
  const bw = textW(tier, 13, 800) + 26;
  // Level label and tier badge sit on the thumb side; the buttons on the other.
  const lx = left ? 20 : W - 20 - tw;
  txt(label, lx, 46, 28, 800, '#FFF7E8');
  const bx = left ? 28 + tw : lx - 8 - bw;
  badge(tier, bx, 26, TIER_COLOR[L.lv.tierLabel]);
  if (S.streak > 1) {
    const fx0 = left ? bx + bw + 12 : bx - 22;
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
    txt(S.streak, fx0 + 12, 39, 15, 800, '#F5843B', left ? 'left' : 'left', 'middle');
  }
  // Tapping the level label five times within two seconds opens the dev panel.
  G.buttons.push({
    x: left ? 10 : W - 30 - tw,
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
  button(mx(220, 36), 20, 36, 36, '⚙', null, {
    tone: '#4A4540',
    size: 20,
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'settings', t: 0, tab: 'game' };
    },
  });
  button(mx(262, 36), 20, 36, 36, S.sound ? '♪' : '✕', null, {
    tone: '#4A4540',
    onTap: () => {
      S.sound = !S.sound;
      save();
      applyVolumes();
      if (S.sound) sfx.ui();
    },
  });
  button(mx(304, 36), 20, 36, 36, '↻', null, {
    tone: '#4A4540',
    onTap: () => {
      sfx.ui();
      if (L.status === 'play' && L.stat.taps > 0) logStat('restart');
      newLevel(L.n);
    },
  });
  const pop = 1 + G.coinPop * 0.15;
  const cp = coinPos();
  ctx.save();
  ctx.translate(cp.x, cp.y);
  ctx.scale(pop, pop);
  coinIcon(0, 0, 11);
  ctx.restore();
  if (left) txt(S.coins.toLocaleString(), 382, 39, 22, 800, GOLD, 'left', 'middle');
  else txt(S.coins.toLocaleString(), cp.x - 18, 39, 22, 800, GOLD, 'right', 'middle');
  iconBtn(mx(34, 66), 100, 66, 52, 'map', t('hud.map'), () => {
    sfx.ui();
    G.screen = { type: 'map', tab: 'path', t: 0 };
  });
  iconBtn(mx(380, 66), 100, 66, 52, 'shop', t('hud.shop'), () => {
    sfx.ui();
    G.screen = { type: 'shop', t: 0 };
  });
}

export function drawBoosters(): void {
  const L = cur();
  if (L.status !== 'play' && L.status !== 'intro' && L.status !== 'mech') return;
  const dis = L.status !== 'play',
    y = 530;
  // Mirrored for left-handed play so the most-used booster stays under the thumb.
  const xs = S.leftHanded ? [360, 240, 120] : [120, 240, 360];
  boosterButton(xs[0], y, 'vip', '#6A4C93', dis || L.vipUsed, false, L.vipUsed);
  boosterButton(xs[1], y, 'takeout', '#148F82', dis, L.armed === 'takeout', false);
  boosterButton(xs[2], y, 'sendback', '#E25E12', dis, L.armed === 'sendback', false);
  if (L.armed) {
    ctx.save();
    ctx.fillStyle = 'rgba(42,35,32,.92)';
    rrect(90, 262, 300, 56, 12);
    ctx.fill();
    txt(
      L.armed === 'takeout' ? t('booster.hintTakeout') : t('booster.hintSendback'),
      240,
      282,
      14,
      800,
      '#fff',
      'center',
      'middle'
    );
    button(190, 292, 100, 22, t('booster.cancel'), null, {
      tone: '#6B6560',
      size: 13,
      onTap: () => {
        L.armed = null;
      },
    });
    ctx.restore();
  }
}
