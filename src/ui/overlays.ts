/* In-level overlays: level intro, mechanic cards, the fail card and the win card. */

import { sfx } from '../audio/audio';
import { TIER_COLOR } from '../data/constants';
import { isAuthored, schedTier } from '../engine/levels';
import { adRescue, newLevel, nextMechCard, paidRescue } from '../engine/rules';
import { cur, G } from '../engine/state';
import { t } from '../i18n';
import { afterWin } from '../meta/flow';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { drawMechIcon } from '../render/icons';
import { card, coinIcon, dim, rrect, textW, txt, wrapText } from '../render/primitives';
import { drawConfetti } from '../render/scene';
import { button } from './buttons';
import { tierLabel } from './hud';

export function getLevelLabelQuick(n: number): string {
  return (isAuthored(n) ? t('tier.authored') : '') + tierLabel(schedTier(n));
}

export function drawStatusOverlay(): void {
  const L = cur();
  if (L.status === 'intro') {
    const a = Math.min(1, L.introT * 4, (1.4 - L.introT) * 3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(42,35,32,.94)';
    rrect(110, 255, 260, 92, 16);
    ctx.fill();
    txt(t('hud.level', { n: L.n }), 240, 288, 30, 800, '#FFF7E8', 'center', 'middle');
    const lbl = tierLabel(L.lv.tierLabel),
      bw = textW(lbl, 13, 800) + 26;
    ctx.fillStyle = TIER_COLOR[L.lv.tierLabel];
    rrect(240 - bw / 2, 308, bw, 24, 7);
    ctx.fill();
    txt(lbl, 240, 321, 13, 800, '#fff', 'center', 'middle');
    ctx.restore();
    return;
  }
  if (L.status === 'mech') {
    const kind = L.newMechs[L.mechIdx];
    if (!kind) {
      L.status = 'play';
      return;
    }
    dim(0.55);
    card(60, 250, 360, 330, '#3E7BFA', t('mech.newRule'));
    drawMechIcon(kind, 240, 340);
    txt(t('mech.' + kind + '.title'), 240, 400, 24, 800, '#2A2320', 'center', 'middle');
    wrapText(t('mech.' + kind + '.text'), 240, 432, 300, 15, '#5A4E45');
    button(120, 516, 240, 46, L.mechIdx + 1 < L.newMechs.length ? t('mech.next') : t('mech.gotIt'), null, {
      primary: true,
      onTap: () => {
        sfx.ui();
        nextMechCard();
      },
    });
    return;
  }
  if (L.status !== 'fail' && L.status !== 'win') return;
  if (L.status === 'win') {
    dim();
    drawConfetti();
  } else dim();
  const cx = 70,
    cy = 250,
    cw = 340,
    ch = 400;
  if (L.status === 'fail') {
    const wasabi = L.failReason === 'wasabi';
    card(cx, cy, cw, ch, '#E5484D', wasabi ? t('fail.wasabiTitle') : t('fail.jamTitle'));
    txt(wasabi ? t('fail.wasabiText1') : t('fail.jamText1'), 240, cy + 90, 15, 700, '#5A4E45', 'center', 'middle');
    txt(wasabi ? t('fail.wasabiText2') : t('fail.jamText2'), 240, cy + 110, 15, 700, '#5A4E45', 'center', 'middle');
    const left = L.diners.filter((d) => d.state !== 'done').length;
    txt(
      left <= 5 ? t('fail.left', { n: left }) : t('fail.waiting', { n: left }),
      240,
      cy + 136,
      15,
      800,
      '#E5484D',
      'center',
      'middle'
    );
    const frac = L.failT / 10;
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#EADFC4';
    ctx.beginPath();
    ctx.arc(240, cy + 182, 26, 0, 7);
    ctx.stroke();
    ctx.strokeStyle = frac > 0.3 ? '#E5484D' : '#B9B2A5';
    ctx.beginPath();
    ctx.arc(240, cy + 182, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
    txt(Math.ceil(L.failT), 240, cy + 184, 22, 800, '#2A2320', 'center', 'middle');
    const live = L.failT > 0;
    button(cx + 24, cy + 224, cw - 48, 52, t('fail.rescue'), live ? t('fail.rescueSub') : t('fail.expired'), {
      primary: true,
      disabled: !live,
      onTap: () => paidRescue(),
    });
    button(cx + 24, cy + 286, cw - 48, 48, t('fail.ad'), S.demoAds ? t('fail.adSub') : t('fail.adOff'), {
      tone: '#148F82',
      disabled: !S.demoAds,
      onTap: () => {
        sfx.ui();
        adRescue();
      },
    });
    button(cx + 24, cy + 344, cw - 48, 40, t('fail.retry'), null, {
      tone: '#3B3F4A',
      onTap: () => {
        sfx.ui();
        newLevel(L.n);
      },
    });
  } else {
    card(cx, cy, cw, ch, '#2FB36B', t('win.title'));
    coinIcon(196, cy + 108, 16);
    txt('+' + L.earned, 220, cy + 109, 34, 800, '#2A2320', 'left', 'middle');
    txt(
      L.streakBonus > 0 ? t('win.streak', { n: S.streak, b: L.streakBonus }) : t('win.streakHint'),
      240,
      cy + 152,
      15,
      700,
      '#5A4E45',
      'center',
      'middle'
    );
    txt(
      t('win.total', { c: S.coins.toLocaleString(), w: S.weekly }),
      240,
      cy + 178,
      13,
      700,
      '#8A8378',
      'center',
      'middle'
    );
    const nn = L.n + 1;
    button(cx + 24, cy + 224, cw - 48, 56, t('win.next', { n: nn }), getLevelLabelQuick(nn), {
      primary: true,
      onTap: () => {
        sfx.ui();
        afterWin();
      },
    });
    button(cx + 24, cy + 292, cw - 48, 44, t('win.replay'), null, {
      tone: '#3B3F4A',
      onTap: () => {
        sfx.ui();
        newLevel(L.n);
      },
    });
    button(cx + 24, cy + 344, cw - 48, 40, t('win.map'), null, {
      tone: '#6A4C93',
      onTap: () => {
        sfx.ui();
        G.screen = { type: 'map', tab: 'decor', t: 0 };
      },
    });
  }
}
