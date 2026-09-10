/* Leaderboards and the player profile: the Ranks tab of the map (weekly levels, rush best, sign-in, the
   offline queue's state), the Profile screen (name, diner avatar, bests, share), and the share button the
   win cards carry. */

import { sfx } from '../audio/audio';
import { COLORS, GOLD } from '../data/constants';
import { BOARD_ROWS, type BoardId } from '../data/leaderboards';
import { G, type Screen } from '../engine/state';
import { t } from '../i18n';
import { backendInfo, board, flushQueue, isOffline, lb, pendingCount, showNative, signIn } from '../meta/leaderboards';
import { S, save } from '../meta/save';
import { playerName, shareCard, type ShareKind } from '../meta/share';
import { ctx } from '../render/canvas';
import { drawCharacter } from '../render/diner';
import { card, rrect, txt, wrapText } from '../render/primitives';
import { button, closeBtn } from './buttons';
import { openTextField } from './textfield';

export const NAME_MAX = 16;

function avatar(x: number, y: number, r: number, color: number, ring: string | null = null): void {
  ctx.save();
  ctx.translate(x, y);
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, 7);
    ctx.stroke();
  }
  if (!drawCharacter(color, 'happy', false, r)) {
    ctx.fillStyle = COLORS[color]?.hex || COLORS[0].hex;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/** What the player would brag about: the last cleared level, else the rush best. */
export function bestShare(): ShareKind {
  const levels = Math.max(0, S.best - 1);
  if (levels < 1 && S.rushBest > 0) return { type: 'rush', score: S.rushBest };
  return { type: 'level', n: Math.max(1, levels) };
}

/** A round share button, used in the card headers. */
export function drawShareBtn(x: number, y: number, kind: ShareKind): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,253,247,.92)';
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#2A2320';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x - 6, y + 7);
  ctx.lineTo(x + 6, y + 7);
  ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x - 4, y - 4);
  ctx.lineTo(x, y - 8);
  ctx.lineTo(x + 4, y - 4);
  ctx.stroke();
  ctx.restore();
  G.buttons.push({
    x: x - 20,
    y: y - 20,
    w: 40,
    h: 40,
    onTap: () => {
      sfx.ui();
      void shareCard(kind);
    },
  });
}

function openProfile(back: Screen | null): void {
  sfx.ui();
  G.screen = { type: 'profile', t: 0, back };
}

/** The Ranks tab, inside the map card. */
export function drawRanksTab(sc: Screen): void {
  const info = backendInfo();
  const native = info.kind === 'native';
  // Profile row.
  ctx.fillStyle = '#FFFDF7';
  rrect(50, 212, 380, 50, 12);
  ctx.fill();
  avatar(82, 240, 13, S.profile.avatar);
  txt(playerName(), 106, 229, 15, 800, '#2A2320', 'left', 'middle');
  txt(t('ranks.streak', { n: S.bestStreak }), 106, 248, 11, 700, '#8A8378', 'left', 'middle');
  G.buttons.push({ x: 50, y: 212, w: 280, h: 50, onTap: () => openProfile(sc) });
  button(340, 219, 80, 36, t('profile.edit'), null, { size: 12, tone: '#148F82', onTap: () => openProfile(sc) });
  // Board chips.
  const which: BoardId = sc.board || 'weekly';
  (['weekly', 'rush'] as BoardId[]).forEach((id, i) =>
    button(50 + i * 195, 274, 185, 36, t('ranks.' + id), null, {
      size: 12,
      tone: which === id ? '#6A4C93' : '#B9B2A5',
      onTap: () => {
        sfx.ui();
        sc.board = id;
      },
    })
  );
  const y0 = 322;
  if (native && !lb.signedIn) {
    txt(t('ranks.signedOut'), 240, y0 + 60, 13, 700, '#5A4E45', 'center', 'middle');
    button(100, y0 + 96, 280, 46, t('ranks.signIn', { service: info.service }), null, {
      primary: true,
      onTap: () => {
        sfx.ui();
        void signIn();
      },
    });
  } else {
    const v = board(which);
    const rows = v.entries.slice(0, BOARD_ROWS);
    if (v.me && !rows.some((e) => e.me) && rows.length) rows.push(v.me);
    if (!rows.length) {
      const msg = v.loading ? t('ranks.loading') : v.error ? t('ranks.error') : t('ranks.empty');
      txt(msg, 240, y0 + 60, 13, 700, v.error ? '#E5484D' : '#8A8378', 'center', 'middle');
      if (v.error && !v.loading)
        button(170, y0 + 90, 140, 38, t('ranks.retry'), null, {
          size: 12,
          tone: '#3B3F4A',
          onTap: () => {
            sfx.ui();
            board(which, true);
          },
        });
    }
    rows.forEach((r, i) => {
      const y = y0 + i * 44;
      ctx.fillStyle = r.me ? '#FFF0D6' : i % 2 ? '#FFFDF7' : '#F7F0E0';
      rrect(50, y, 380, 40, 10);
      ctx.fill();
      txt(t('ranks.rank', { n: r.rank }), 66, y + 21, 15, 800, r.rank <= 3 ? GOLD : '#8A8378', 'left', 'middle');
      txt(r.me ? t('map.you') : r.name || t('profile.anon'), 110, y + 21, 16, 800, '#2A2320', 'left', 'middle');
      txt(String(r.score), 414, y + 21, 17, 800, r.me ? '#E5484D' : '#2A2320', 'right', 'middle');
    });
  }
  // Queue and network state.
  const pending = pendingCount();
  let y = 700;
  if (pending > 0) {
    txt(t('ranks.pending', { n: pending }), 60, y, 12, 800, '#E25E12', 'left', 'middle');
    button(330, y - 17, 90, 34, t('ranks.retry'), null, {
      size: 12,
      tone: '#3B3F4A',
      onTap: () => {
        sfx.ui();
        void flushQueue(true);
      },
    });
    y += 30;
  }
  if (isOffline()) {
    txt(t('ranks.offline'), 240, y, 11, 700, '#8A8378', 'center', 'middle');
  }
  if (native) {
    button(90, 740, 300, 42, t('ranks.open', { service: info.service }), null, {
      size: 13,
      tone: '#3B3F4A',
      onTap: () => {
        sfx.ui();
        showNative(which);
      },
    });
  } else {
    wrapText(t('ranks.local'), 240, 748, 360, 11, '#8A8378');
  }
  txt(t('ranks.weeklyNote'), 240, 812, 11, 700, '#B9B2A5', 'center', 'middle');
}

function editName(): void {
  sfx.ui();
  openTextField({
    value: S.profile.name,
    maxLength: NAME_MAX,
    placeholder: t('profile.anon'),
    box: { x: 70, y: 282, w: 230, h: 36 },
    onDone: (v) => {
      if (v === null) return;
      S.profile.name = v.trim().slice(0, NAME_MAX);
      save();
    },
  });
}

/** The Profile screen. */
export function drawProfileScreen(sc: Screen): void {
  const info = backendInfo();
  card(30, 80, 420, 760, '#148F82', t('profile.title'));
  closeBtn(() => {
    sfx.ui();
    G.screen = sc.back || null;
  });
  avatar(240, 205, 40, S.profile.avatar);
  // Name.
  txt(t('profile.name'), 70, 268, 11, 800, '#8A8378', 'left', 'middle');
  ctx.fillStyle = '#FFFDF7';
  rrect(70, 282, 230, 36, 10);
  ctx.fill();
  txt(playerName(), 84, 300, 16, 800, S.profile.name.trim() ? '#2A2320' : '#B9B2A5', 'left', 'middle');
  G.buttons.push({ x: 70, y: 282, w: 230, h: 36, onTap: editName });
  button(310, 282, 100, 36, t('profile.edit'), null, { size: 12, tone: '#148F82', onTap: editName });
  // Avatar picker.
  txt(t('profile.avatar'), 70, 346, 11, 800, '#8A8378', 'left', 'middle');
  COLORS.forEach((_, i) => {
    const x = 84 + i * 52,
      y = 386;
    avatar(x, y, 14, i, S.profile.avatar === i ? GOLD : null);
    G.buttons.push({
      x: x - 24,
      y: y - 24,
      w: 48,
      h: 48,
      onTap: () => {
        sfx.ui();
        S.profile.avatar = i;
        save();
      },
    });
  });
  // Bests.
  const stats: [string, number][] = [
    [t('profile.bestStreak'), S.bestStreak],
    [t('profile.levels'), Math.max(0, S.best - 1)],
    [t('profile.weekly'), S.weekly],
    [t('profile.rushBest'), S.rushBest],
  ];
  stats.forEach(([label, value], i) => {
    const x = 50 + (i % 2) * 195,
      y = 440 + Math.floor(i / 2) * 72;
    ctx.fillStyle = '#FFFDF7';
    rrect(x, y, 185, 64, 12);
    ctx.fill();
    txt(label, x + 14, y + 18, 11, 800, '#8A8378', 'left', 'middle');
    txt(String(value), x + 14, y + 42, 22, 800, '#2A2320', 'left', 'middle');
  });
  // Service.
  if (info.kind === 'native') {
    if (lb.signedIn) {
      txt(
        t('profile.signedInAs', { name: lb.player?.name || t('profile.anon') }),
        240,
        612,
        13,
        700,
        '#5A4E45',
        'center',
        'middle'
      );
      txt(info.service, 240, 632, 11, 700, '#8A8378', 'center', 'middle');
    } else
      button(100, 596, 280, 44, t('ranks.signIn', { service: info.service }), null, {
        primary: true,
        onTap: () => {
          sfx.ui();
          void signIn();
        },
      });
  } else {
    wrapText(t('ranks.local'), 240, 608, 360, 11, '#8A8378');
  }
  button(60, 680, 360, 50, t('profile.share'), null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      void shareCard(bestShare());
    },
  });
  txt(t('share.tagline'), 240, 760, 12, 700, '#B9B2A5', 'center', 'middle');
}
