/* In-level overlays: level intro, mechanic cards, the fail card and the win card. */

import { sfx } from '../audio/audio';
import { H, TIER_COLOR } from '../data/constants';
import { THEME_SPAN, THEMES, themeById } from '../data/themes';
import { easeOut } from '../engine/util';
import { POINTS_PER_WIN } from '../data/events-schema';
import { GOLD } from '../data/constants';
import { isAuthored, schedTier } from '../engine/levels';
import { adRescue, finishReveal, nextMechCard, paidRescue } from '../engine/rules';
import { cur, G, runPending } from '../engine/state';
import { queueStarter } from '../meta/offers';
import { buy, priceOf, store } from '../meta/purchases';
import { t } from '../i18n';
import { afterWin } from '../meta/flow';
import { leaveMode, restartLevel, startMode } from '../meta/modes';
import { puzzleStreak } from '../engine/modes-core';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { drawMechIcon } from '../render/icons';
import { card, coinIcon, dim, rrect, textW, txt, UI, wrapText } from '../render/primitives';
import { drawPlate } from '../render/plate';
import { drawConfetti } from '../render/scene';
import { button } from './buttons';
import { tierLabel } from './hud';
import { drawShareBtn } from './ranks';

/** The fail card's spilled tray: a tipped tray and two plates at angles behind the timer. */
function drawSpill(cx: number, cy: number, cw: number): void {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(cx + cw - 72, cy + 168);
  ctx.rotate(0.35);
  ctx.fillStyle = UI.woodDark;
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  rrect(-34, -12, 68, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(cx + 60, cy + 190);
  ctx.rotate(-0.5);
  drawPlate(0, 0, { color: 0 }, 13);
  ctx.restore();
  ctx.save();
  ctx.translate(cx + cw - 50, cy + 200);
  ctx.rotate(0.7);
  drawPlate(0, 0, { color: 2 }, 11);
  ctx.restore();
}

/** The win card's receipt: a paper strip with perforated edges and a gold PAID stamp. */
function drawReceipt(cx: number, cy: number, cw: number): void {
  ctx.save();
  ctx.fillStyle = UI.cream;
  ctx.strokeStyle = 'rgba(42,31,26,.4)';
  ctx.lineWidth = 1.5;
  rrect(cx + 40, cy + 82, cw - 80, 56, 3);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(cx + 48, cy + 90);
  ctx.lineTo(cx + cw - 48, cy + 90);
  ctx.moveTo(cx + 48, cy + 130);
  ctx.lineTo(cx + cw - 48, cy + 130);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(cx + cw - 78, cy + 108);
  ctx.rotate(-0.28);
  ctx.strokeStyle = UI.gold;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  rrect(-26, -11, 52, 22, 4);
  ctx.stroke();
  txt(t('hud.paid'), 0, 1, 13, 800, UI.gold, 'center', 'middle', '-0.5px');
  ctx.restore();
}

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
  if (L.status === 'reveal' && L.reveal) {
    // Curtains part on the new room, then the name card rises.
    const th = themeById(L.reveal),
      P = th.palette;
    const open = easeOut(Math.min(1, L.revealT / 0.7)) * 250;
    ctx.fillStyle = P.headerDark;
    ctx.fillRect(-open, 0, 240, H);
    ctx.fillRect(240 + open, 0, 240, H);
    ctx.fillStyle = P.accent;
    ctx.fillRect(240 - open - 6, 0, 6, H);
    ctx.fillRect(240 + open, 0, 6, H);
    if (L.revealT > 0.5) {
      const a = Math.min(1, (L.revealT - 0.5) / 0.3);
      const cy = 250 + (1 - a) * 40;
      ctx.save();
      ctx.globalAlpha = a;
      card(60, cy, 360, 300, P.accent, t('theme.reveal'));
      txt(t('theme.' + th.id + '.name'), 240, cy + 100, 26, 800, '#2A2320', 'center', 'middle');
      wrapText(t('theme.' + th.id + '.desc'), 240, cy + 138, 300, 15, '#5A4E45');
      txt(
        th.index === THEMES.length - 1
          ? t('theme.levelsFrom', { a: th.from })
          : t('theme.levels', { a: th.from, b: th.from + THEME_SPAN - 1 }),
        240,
        cy + 200,
        13,
        700,
        '#8A8378',
        'center',
        'middle'
      );
      button(120, cy + 232, 240, 46, t('theme.enter'), null, {
        primary: true,
        onTap: () => {
          sfx.ui();
          finishReveal();
        },
      });
      ctx.restore();
    }
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
    const why = L.failReason;
    card(cx, cy, cw, ch, '#E5484D', t('fail.' + why + 'Title'));
    txt(t('fail.' + why + 'Text1'), 240, cy + 90, 15, 700, '#5A4E45', 'center', 'middle');
    txt(t('fail.' + why + 'Text2'), 240, cy + 110, 15, 700, '#5A4E45', 'center', 'middle');
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
    drawSpill(cx, cy, cw);
    // The countdown as a kitchen timer: a steel body, a knob, ticks, the red arc.
    ctx.save();
    ctx.fillStyle = 'rgba(42,31,26,.28)';
    ctx.beginPath();
    ctx.ellipse(242, cy + 214, 30, 7, 0, 0, 7);
    ctx.fill();
    const tg = ctx.createRadialGradient(232, cy + 172, 6, 240, cy + 182, 34);
    tg.addColorStop(0, '#F2F5F9');
    tg.addColorStop(0.7, '#C9CFD8');
    tg.addColorStop(1, '#8E97A6');
    ctx.fillStyle = tg;
    ctx.strokeStyle = UI.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(240, cy + 182, 32, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = UI.lacquer;
    rrect(232, cy + 142, 16, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(42,31,26,.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(240 + Math.cos(a) * 26, cy + 182 + Math.sin(a) * 26);
      ctx.lineTo(240 + Math.cos(a) * 29, cy + 182 + Math.sin(a) * 29);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = frac > 0.3 ? UI.lacquer : '#B9B2A5';
    ctx.beginPath();
    ctx.arc(240, cy + 182, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
    txt(Math.ceil(L.failT), 240, cy + 184, 22, 800, UI.ink, 'center', 'middle');
    const live = L.failT > 0;
    const buying = store.busy === 'rescue';
    button(
      cx + 24,
      cy + 224,
      cw - 48,
      52,
      buying ? t('fail.rescueWait') : t('fail.rescue', { price: priceOf('rescue') }),
      live ? t('fail.rescueSub') : t('fail.expired'),
      {
        primary: true,
        disabled: !live || !!store.busy,
        onTap: () => {
          sfx.ui();
          void buy('rescue').then((r) => {
            if (r.status === 'ok') paidRescue();
          });
        },
      }
    );
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
      disabled: buying,
      onTap: () => {
        sfx.ui();
        G.pending = [];
        if (L.mode === 'level' && queueStarter('fail', L.n)) {
          G.pending.push(() => restartLevel());
          runPending();
        } else restartLevel();
      },
    });
  } else if (L.mode !== 'level') {
    drawModeWin(cx, cy, cw, ch);
  } else {
    card(cx, cy, cw, ch, '#2FB36B', t('win.title'));
    drawShareBtn(cx + cw - 34, cy + 22, { type: 'level', n: L.n });
    drawReceipt(cx, cy, cw);
    coinIcon(196, cy + 108, 16);
    txt('+' + L.earned, 220, cy + 109, 34, 800, UI.gold, 'left', 'middle');
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
    txt(t('win.season', { n: POINTS_PER_WIN.level }), 240, cy + 196, 12, 800, GOLD, 'center', 'middle');
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
        restartLevel();
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

/** The end card of a side mode. None of these touch the level counter. */
function drawModeWin(cx: number, cy: number, cw: number, ch: number): void {
  const L = cur();
  const toMap = () => {
    sfx.ui();
    G.screen = { type: 'map', tab: 'modes', t: 0 };
  };
  const toLevels = () => {
    sfx.ui();
    leaveMode();
  };
  if (L.mode === 'daily') {
    card(cx, cy, cw, ch, '#3E7BFA', t('mode.dailyWin'));
    coinIcon(196, cy + 108, 16);
    txt('+' + L.earned, 220, cy + 109, 34, 800, '#2A2320', 'left', 'middle');
    txt(
      t('mode.dailyStreak', { n: puzzleStreak(S.puzzleDays, L.modeKey) }),
      240,
      cy + 152,
      16,
      800,
      '#3E7BFA',
      'center',
      'middle'
    );
    txt(t('mode.dailyBack'), 240, cy + 178, 13, 700, '#8A8378', 'center', 'middle');
    button(cx + 24, cy + 224, cw - 48, 56, t('mode.backMap'), t('mode.calendarHint'), { primary: true, onTap: toMap });
    button(cx + 24, cy + 292, cw - 48, 44, t('mode.replay'), null, {
      tone: '#3B3F4A',
      onTap: () => {
        sfx.ui();
        restartLevel();
      },
    });
    button(cx + 24, cy + 344, cw - 48, 40, t('mode.backLevels', { n: S.level }), null, {
      tone: '#6A4C93',
      onTap: toLevels,
    });
    return;
  }
  if (L.mode === 'boss') {
    card(cx, cy, cw, ch, '#E5484D', t('mode.bossWin'));
    coinIcon(196, cy + 108, 16);
    txt('+' + L.earned, 220, cy + 109, 34, 800, '#2A2320', 'left', 'middle');
    txt(t('mode.bossNote'), 240, cy + 152, 14, 700, '#5A4E45', 'center', 'middle');
    button(cx + 24, cy + 224, cw - 48, 56, t('events.title'), null, {
      primary: true,
      onTap: () => {
        sfx.ui();
        G.screen = { type: 'events', t: 0, back: null };
      },
    });
    button(cx + 24, cy + 292, cw - 48, 44, t('mode.backMap'), null, { tone: '#3B3F4A', onTap: toMap });
    button(cx + 24, cy + 344, cw - 48, 40, t('mode.backLevels', { n: S.level }), null, {
      tone: '#6A4C93',
      onTap: toLevels,
    });
    return;
  }
  if (L.mode === 'rush') {
    card(cx, cy, cw, ch, '#E25E12', t('mode.rushOver'));
    if (L.score > 0) drawShareBtn(cx + cw - 34, cy + 22, { type: 'rush', score: L.score });
    txt(t('mode.rushScore', { n: L.score }), 240, cy + 100, 26, 800, '#2A2320', 'center', 'middle');
    const best = L.score > 0 && L.score >= S.rushBest;
    txt(
      best ? t('mode.rushNewBest') : t('mode.rushBest', { n: S.rushBest }),
      240,
      cy + 136,
      15,
      800,
      best ? '#E25E12' : '#5A4E45',
      'center',
      'middle'
    );
    coinIcon(206, cy + 172, 12);
    txt('+' + L.earned, 224, cy + 173, 20, 800, '#2A2320', 'left', 'middle');
    button(cx + 24, cy + 224, cw - 48, 56, t('mode.replay'), t('mode.rushAgain'), {
      primary: true,
      onTap: () => {
        sfx.ui();
        startMode('rush');
      },
    });
    button(cx + 24, cy + 292, cw - 48, 44, t('mode.backMap'), null, { tone: '#3B3F4A', onTap: toMap });
    button(cx + 24, cy + 344, cw - 48, 40, t('mode.backLevels', { n: S.level }), null, {
      tone: '#6A4C93',
      onTap: toLevels,
    });
    return;
  }
  card(cx, cy, cw, ch, '#148F82', t('win.title'));
  coinIcon(196, cy + 108, 16);
  txt('+' + L.earned, 220, cy + 109, 34, 800, '#2A2320', 'left', 'middle');
  txt(t('mode.zenNote'), 240, cy + 152, 14, 700, '#5A4E45', 'center', 'middle');
  txt(t('mode.hudZen', { n: L.n }), 240, cy + 178, 13, 700, '#8A8378', 'center', 'middle');
  button(cx + 24, cy + 224, cw - 48, 56, t('mode.zenNext', { n: L.n + 1 }), null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      startMode('zen');
    },
  });
  button(cx + 24, cy + 292, cw - 48, 44, t('mode.backMap'), null, { tone: '#3B3F4A', onTap: toMap });
  button(cx + 24, cy + 344, cw - 48, 40, t('mode.backLevels', { n: S.level }), null, {
    tone: '#6A4C93',
    onTap: toLevels,
  });
}
