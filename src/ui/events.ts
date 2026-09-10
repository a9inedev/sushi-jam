/* Event surfaces: the banner on the map, the progress strip in the HUD, and the Events screen with the season
   pass. All the numbers come from meta/events.ts; nothing here decides what an event is worth. */

import { sfx } from '../audio/audio';
import { COLORS, GOLD } from '../data/constants';
import { eventName, formatCountdown, timeLeft, type Reward } from '../data/events-schema';
import { G, type Screen } from '../engine/state';
import { locale, t } from '../i18n';
import {
  claimAllTiers,
  claimEvent,
  claimTier,
  eventsNow,
  eventsView,
  featuredEvent,
  rewardText,
  seasonSummary,
  startBoss,
} from '../meta/events';
import { buyProduct } from '../meta/economy';
import { isDemoStore, priceOf } from '../meta/purchases';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { card, coinIcon, rrect, txt } from '../render/primitives';
import { button, closeBtn } from './buttons';

type View = ReturnType<typeof eventsView>[number];

function goalText(v: View): string {
  const d = v.def;
  if (!d) return v.state.name || v.id;
  if (d.type === 'streak') return t('events.type.streak', { n: d.goal });
  if (d.type === 'plates')
    return t('events.type.plates', {
      n: d.goal,
      colour: t('colour.' + COLORS[d.color ?? 0].name.toLowerCase()).toLowerCase(),
    });
  return t('events.type.boss', { n: d.level ?? 0 });
}

function title(v: View): string {
  return v.def ? eventName(v.def, locale() || 'en') : v.state.name || v.id;
}

function bar(x: number, y: number, w: number, h: number, frac: number, color: string): void {
  ctx.fillStyle = 'rgba(42,35,32,.12)';
  rrect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    rrect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

/** The strip on the map's path tab: the featured event, or the season pass when nothing is running. */
export function drawEventBanner(x: number, y: number, w: number, h: number): void {
  const now = eventsNow();
  const v = featuredEvent();
  const season = seasonSummary();
  const open = () => {
    sfx.ui();
    G.screen = { type: 'events', t: 0, back: G.screen };
  };
  ctx.save();
  if (v) {
    const color = v.claimable ? '#2FB36B' : v.def && v.def.type === 'boss' ? '#E5484D' : '#3E7BFA';
    ctx.fillStyle = '#FFFDF7';
    rrect(x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = color;
    rrect(x, y, 8, h, 4);
    ctx.fill();
    txt(title(v), x + 20, y + 15, 15, 800, '#2A2320', 'left', 'middle');
    const sub = v.claimable
      ? t('events.ended')
      : v.def
        ? t('events.ends', { t: formatCountdown(timeLeft(v.def, now)) })
        : '';
    txt(sub, x + w - 14, y + 15, 11, 700, v.claimable ? '#2FB36B' : '#8A8378', 'right', 'middle');
    bar(x + 20, y + 30, w - 130, 8, v.state.goal ? v.state.progress / v.state.goal : 0, color);
    txt(
      t('events.progress', { a: v.state.progress, b: v.state.goal }),
      x + w - 14,
      y + 34,
      11,
      800,
      '#5A4E45',
      'right',
      'middle'
    );
    G.buttons.push({ x, y, w, h, onTap: open });
    if (v.claimable)
      button(x + w - 100, y + h - 34, 86, 26, t('events.claim'), null, {
        size: 12,
        primary: true,
        onTap: () => {
          sfx.ui();
          claimEvent(v.id);
        },
      });
  } else if (season) {
    ctx.fillStyle = '#FFFDF7';
    rrect(x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = GOLD;
    rrect(x, y, 8, h, 4);
    ctx.fill();
    txt(
      t('events.bannerSeason', { t: season.tier, n: season.tiers }),
      x + 20,
      y + 15,
      15,
      800,
      '#2A2320',
      'left',
      'middle'
    );
    txt(
      t('events.ends', { t: formatCountdown(timeLeft(season.def as { end: number }, now)) }),
      x + w - 14,
      y + 15,
      11,
      700,
      '#8A8378',
      'right',
      'middle'
    );
    const per = season.def ? season.def.pointsPerTier : 1;
    bar(x + 20, y + 30, w - 130, 8, season.tier >= season.tiers ? 1 : (season.points % per) / per, GOLD);
    txt(
      season.claimable ? t('events.claimableN', { n: season.claimable }) : t('events.pointsToNext', { n: season.next }),
      x + w - 14,
      y + 34,
      11,
      800,
      season.claimable ? '#2FB36B' : '#5A4E45',
      'right',
      'middle'
    );
    G.buttons.push({ x, y, w, h, onTap: open });
  } else {
    ctx.fillStyle = 'rgba(255,253,247,.6)';
    rrect(x, y, w, h, 12);
    ctx.fill();
    txt(t('events.none'), x + w / 2, y + h / 2, 13, 700, '#8A8378', 'center', 'middle');
  }
  ctx.restore();
}

/** A slim progress strip under the level label during play (not in rush, which shows its score there). */
export function drawHudEventBar(x: number, y: number, right: boolean): void {
  const v = featuredEvent();
  const season = seasonSummary();
  const w = 150;
  const x0 = right ? x - w : x;
  let frac: number, color: string, label: string;
  if (v && v.def && v.active) {
    color = v.def.type === 'boss' ? '#E5484D' : '#3E7BFA';
    frac = v.state.goal ? v.state.progress / v.state.goal : 0;
    label = title(v) + ' ' + v.state.progress + '/' + v.state.goal;
  } else if (season) {
    const per = season.def ? season.def.pointsPerTier : 1;
    color = GOLD;
    frac = season.tier >= season.tiers ? 1 : (season.points % per) / per;
    label = t('events.hudSeason', { t: season.tier });
  } else return;
  ctx.save();
  ctx.fillStyle = 'rgba(42,35,32,.55)';
  rrect(x0 - 6, y - 5, w + 12, 30, 8);
  ctx.fill();
  bar(x0, y, w, 6, frac, color);
  txt(label, right ? x : x0, y + 16, 10, 800, '#FFF7E8', right ? 'right' : 'left', 'middle');
  ctx.restore();
}

function rewardIcon(x: number, y: number, r: Reward, size: number, dim: boolean): void {
  ctx.save();
  if (dim) ctx.globalAlpha = 0.45;
  if (r.coins) {
    coinIcon(x, y, size * 0.45);
    txt(String(r.coins), x + size * 0.6, y + 1, size * 0.62, 800, '#2A2320', 'left', 'middle');
  } else {
    const kind = r.vip ? 'vip' : r.takeout ? 'takeout' : r.sendback ? 'sendback' : 'points';
    const n = r.vip || r.takeout || r.sendback || r.points || 0;
    ctx.fillStyle =
      kind === 'vip' ? '#6A4C93' : kind === 'takeout' ? '#148F82' : kind === 'sendback' ? '#E25E12' : GOLD;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.45, 0, 7);
    ctx.fill();
    txt(String(n), x + size * 0.6, y + 1, size * 0.62, 800, '#2A2320', 'left', 'middle');
  }
  ctx.restore();
}

/** The Events screen: running and claimable events, then the season pass with its two tracks. */
export function drawEventsScreen(sc: Screen): void {
  const now = eventsNow();
  card(20, 60, 440, 820, '#3E7BFA', t('events.title'));
  closeBtn(() => {
    sfx.ui();
    G.screen = sc.back || null;
  });
  const list = eventsView();
  let y = 130;
  if (!list.length) {
    txt(t('events.none'), 240, y + 20, 14, 700, '#8A8378', 'center', 'middle');
    y += 50;
  }
  for (const v of list.slice(0, 4)) {
    const color = v.claimable ? '#2FB36B' : v.def && v.def.type === 'boss' ? '#E5484D' : '#3E7BFA';
    ctx.fillStyle = '#FFFDF7';
    rrect(40, y, 400, 92, 12);
    ctx.fill();
    ctx.fillStyle = color;
    rrect(40, y, 8, 92, 4);
    ctx.fill();
    txt(title(v), 60, y + 20, 17, 800, '#2A2320', 'left', 'middle');
    txt(goalText(v), 60, y + 42, 12, 700, '#5A4E45', 'left', 'middle');
    const reward = v.state.reward || (v.def ? v.def.rewards : null);
    if (reward) txt(rewardText(reward), 60, y + 60, 11, 800, GOLD, 'left', 'middle');
    bar(60, y + 76, 250, 8, v.state.goal ? v.state.progress / v.state.goal : 0, color);
    txt(
      t('events.progress', { a: v.state.progress, b: v.state.goal }),
      320,
      y + 80,
      11,
      800,
      '#5A4E45',
      'left',
      'middle'
    );
    const sub = v.claimable
      ? t('events.ended')
      : v.def
        ? t('events.ends', { t: formatCountdown(timeLeft(v.def, now)) })
        : '';
    txt(sub, 428, y + 20, 11, 700, v.claimable ? '#2FB36B' : '#8A8378', 'right', 'middle');
    if (v.claimable)
      button(344, y + 40, 84, 34, t('events.claim'), null, {
        size: 13,
        primary: true,
        onTap: () => {
          sfx.ui();
          claimEvent(v.id);
        },
      });
    else if (v.def && v.def.type === 'boss' && !v.state.done)
      button(330, y + 40, 98, 34, t('events.playBoss'), null, {
        size: 12,
        tone: '#E5484D',
        onTap: () => {
          sfx.ui();
          startBoss(v.id);
        },
      });
    y += 100;
  }
  const season = seasonSummary();
  if (!season || !season.def) return;
  const def = season.def;
  y = Math.max(y + 6, 150);
  txt(def.name, 40, y + 12, 18, 800, '#2A2320', 'left', 'middle');
  txt(t('events.ends', { t: formatCountdown(timeLeft(def, now)) }), 428, y + 12, 11, 700, '#8A8378', 'right', 'middle');
  txt(
    t('events.points', { p: season.points, t: season.tier, n: season.tiers }),
    40,
    y + 34,
    12,
    700,
    '#5A4E45',
    'left',
    'middle'
  );
  const per = def.pointsPerTier;
  bar(40, y + 48, 260, 8, season.tier >= season.tiers ? 1 : (season.points % per) / per, GOLD);
  txt(
    season.tier >= season.tiers ? t('events.maxTier') : t('events.pointsToNext', { n: season.next }),
    428,
    y + 52,
    11,
    800,
    '#5A4E45',
    'right',
    'middle'
  );
  // Tier grid: 10 per row, free reward on top, premium below.
  const cols = 10,
    cw = 40,
    ch = 66,
    gx = 40,
    gy = y + 66;
  const claimedF = S.season.claimedFree,
    claimedP = S.season.claimedPremium;
  def.tiers.forEach((tier, i) => {
    const n = i + 1,
      col = i % cols,
      row = Math.floor(i / cols);
    const x = gx + col * cw,
      cy = gy + row * (ch + 8);
    const reached = n <= season.tier;
    const freeDone = claimedF.includes(n),
      premDone = claimedP.includes(n);
    const canFree = reached && !freeDone,
      canPrem = reached && !premDone && S.season.premium;
    ctx.fillStyle = reached ? '#FFFDF7' : '#F1EBDD';
    rrect(x + 1, cy, cw - 2, ch, 6);
    ctx.fill();
    if (canFree || canPrem) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      rrect(x + 1, cy, cw - 2, ch, 6);
      ctx.stroke();
    }
    txt(String(n), x + cw / 2, cy + 9, 9, 800, reached ? '#2A2320' : '#B9B2A5', 'center', 'middle');
    rewardIcon(x + 10, cy + 26, tier.free, 13, !reached || freeDone);
    if (freeDone) txt('✓', x + cw - 8, cy + 26, 10, 800, '#2FB36B', 'center', 'middle'); // i18n-ignore
    ctx.fillStyle = S.season.premium ? 'rgba(106,76,147,.12)' : 'rgba(42,35,32,.06)';
    rrect(x + 3, cy + 40, cw - 6, 22, 4);
    ctx.fill();
    rewardIcon(x + 10, cy + 51, tier.premium, 13, !reached || premDone || !S.season.premium);
    if (premDone) txt('✓', x + cw - 8, cy + 51, 10, 800, '#2FB36B', 'center', 'middle'); // i18n-ignore
    if (canFree || canPrem)
      G.buttons.push({
        x,
        y: cy,
        w: cw,
        h: ch,
        onTap: () => {
          sfx.ui();
          if (canFree) claimTier(n, 'free');
          if (canPrem) claimTier(n, 'premium');
        },
      });
  });
  const rows = Math.ceil(def.tiers.length / cols);
  const by = gy + rows * (ch + 8) + 4;
  txt(t('events.free'), 40, by + 8, 11, 800, '#5A4E45', 'left', 'middle');
  txt(t('events.premium'), 40, by + 24, 11, 800, '#6A4C93', 'left', 'middle');
  button(
    250,
    by,
    180,
    40,
    season.claimable ? t('events.claimAll', { n: season.claimable }) : t('events.nothingToClaim'),
    null,
    {
      size: 13,
      primary: season.claimable > 0,
      tone: '#B9B2A5',
      disabled: season.claimable === 0,
      onTap: () => {
        sfx.ui();
        claimAllTiers();
      },
    }
  );
  button(
    40,
    by + 48,
    390,
    40,
    S.season.premium ? t('events.premiumOwned') : t('events.unlockPremium'),
    S.season.premium ? null : isDemoStore() ? t('events.demoPrice', { price: priceOf('season') }) : priceOf('season'),
    {
      size: 13,
      tone: S.season.premium ? '#B9B2A5' : '#6A4C93',
      disabled: S.season.premium,
      onTap: () => {
        sfx.ui();
        buyProduct('season');
      },
    }
  );
}
