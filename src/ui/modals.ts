/* Settings, Pause and Confirm. All of them freeze the level while open. */

import { applyMotion, systemReducedMotion } from '../anim/motion';
import { applyVolumes, sfx } from '../audio/audio';
import { logStat, newLevel } from '../engine/rules';
import { closeScreen, cur, G, toast, type Screen } from '../engine/state';
import { backupInfo, clearSave, cloudProvider, restoreFromBackup, S, save } from '../meta/save';
import { haptic, isNative, platform } from '../platform/native';
import { ctx } from '../render/canvas';
import { card, rrect, txt, wrapText } from '../render/primitives';
import { button } from './buttons';

function toggleRow(y: number, label: string, sub: string | null, on: boolean, onTap: () => void): void {
  G.buttons.push({ x: 80, y: y - 28, w: 320, h: 56, onTap });
  txt(label, 92, sub ? y - 6 : y, 19, 800, '#2A2320', 'left', 'middle');
  if (sub) txt(sub, 92, y + 15, 12, 700, '#8A8378', 'left', 'middle');
  const px = 330,
    pw = 64,
    ph = 32;
  ctx.save();
  ctx.fillStyle = on ? '#2FB36B' : '#B9B2A5';
  rrect(px, y - ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(on ? px + pw - ph / 2 : px + ph / 2, y, ph / 2 - 4, 0, 7);
  ctx.fill();
  txt(on ? 'ON' : 'OFF', on ? px + 20 : px + pw - 20, y + 1, 11, 800, '#fff', 'center', 'middle');
  ctx.restore();
}

/** A horizontal slider row. The whole row is the hit box; press or drag sets the value. */
function sliderRow(y: number, label: string, value: number, onChange: (v: number) => void): void {
  const tx = 186,
    tw = 170;
  const set = (x: number) => onChange(Math.max(0, Math.min(1, (x - tx) / tw)));
  G.buttons.push({ x: 80, y: y - 22, w: 320, h: 44, onTap: () => {}, onDrag: (x) => set(x) });
  txt(label, 92, y + 1, 16, 800, '#2A2320', 'left', 'middle');
  ctx.save();
  ctx.fillStyle = '#E4D6B4';
  rrect(tx, y - 4, tw, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#2FB36B';
  rrect(tx, y - 4, Math.max(8, tw * value), 8, 4);
  ctx.fill();
  const kx = tx + tw * value;
  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = '#2A2320';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(kx, y, 11, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  txt(Math.round(value * 100) + '%', 396, y + 1, 12, 700, '#8A8378', 'right', 'middle');
}

function hapticsHint(): string {
  if (isNative) return 'Vibration on seat, grab, jam and clear';
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
    return 'Vibration where this browser allows it';
  return 'Not available in this browser';
}

function ago(ts: number): string {
  if (!ts) return 'earlier';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
}

export function drawSettings(sc: Screen): void {
  card(60, 120, 360, 740, '#3B3F4A', 'Settings');
  toggleRow(218, 'Sound', 'Master switch for music and effects', S.sound, () => {
    S.sound = !S.sound;
    save();
    applyVolumes();
    if (S.sound) sfx.ui();
  });
  const vol = (key: 'volMusic' | 'volSfx' | 'volUi') => (v: number) => {
    S[key] = Math.round(v * 20) / 20;
    applyVolumes();
    save();
  };
  sliderRow(270, 'Music', S.volMusic, vol('volMusic'));
  sliderRow(314, 'Effects', S.volSfx, vol('volSfx'));
  sliderRow(358, 'Interface', S.volUi, vol('volUi'));
  toggleRow(416, 'Haptics', hapticsHint(), S.haptics, () => {
    S.haptics = !S.haptics;
    save();
    sfx.ui();
    if (S.haptics) haptic('medium');
  });
  toggleRow(
    482,
    'Reduce motion',
    systemReducedMotion() ? 'On because of your system setting' : 'Fewer bounces, shakes and particles',
    S.reduceMotion || systemReducedMotion(),
    () => {
      S.reduceMotion = !S.reduceMotion;
      save();
      applyMotion();
      sfx.ui();
    }
  );
  const c = cloudProvider();
  txt(
    c ? c.label + ' cloud save · not connected yet' : 'Cloud save arrives with the mobile apps',
    240,
    536,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
  const bak = backupInfo();
  button(
    100,
    560,
    280,
    44,
    'Restore progress',
    bak
      ? `Backup · level ${bak.level} · ${bak.coins.toLocaleString()} coins · ${ago(bak.savedAt)}`
      : 'No backup copy yet',
    {
      tone: '#148F82',
      disabled: !bak,
      onTap: () => {
        sfx.ui();
        if (!bak) return;
        G.screen = {
          type: 'confirm',
          t: 0,
          back: sc,
          title: 'Restore progress?',
          text:
            `Replace level ${S.level} with ${S.coins.toLocaleString()} coins by the backup from ${ago(bak.savedAt)}: ` +
            `level ${bak.level} with ${bak.coins.toLocaleString()} coins.`,
          yes: 'Restore',
          onYes: () => {
            if (restoreFromBackup()) {
              G.screen = null;
              newLevel(S.level);
              toast('Progress restored from backup', 2.4);
            } else {
              G.screen = sc;
              toast('The backup could not be read', 2);
            }
          },
        };
      },
    }
  );
  button(100, 616, 280, 44, 'Reset progress', 'Deletes level, coins, decor, boosters and stats', {
    tone: '#E5484D',
    onTap: () => {
      sfx.ui();
      G.screen = {
        type: 'confirm',
        t: 0,
        back: sc,
        title: 'Reset all progress?',
        text: 'Level, coins, decor, boosters and the stats log will be deleted. This cannot be undone.',
        yes: 'Reset',
        danger: true,
        onYes: () => {
          clearSave();
          location.reload();
        },
      };
    },
  });
  txt(
    'Sushi Jam v' + __APP_VERSION__ + ' · ' + (isNative ? platform : 'web'),
    240,
    700,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
  button(150, 722, 180, 46, 'Done', null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      G.screen = sc.back || null;
    },
  });
}

export function drawConfirm(sc: Screen): void {
  card(60, 280, 360, 300, sc.danger ? '#E5484D' : '#3B3F4A', sc.title || 'Are you sure?');
  wrapText(sc.text || '', 240, 372, 300, 15, '#5A4E45');
  button(100, 470, 130, 48, sc.yes || 'Yes', null, {
    primary: !!sc.danger,
    tone: '#148F82',
    onTap: () => {
      sfx.ui();
      if (sc.onYes) sc.onYes();
    },
  });
  button(250, 470, 130, 48, 'Cancel', null, {
    tone: '#6B6560',
    onTap: () => {
      sfx.ui();
      G.screen = sc.back || null;
    },
  });
}

export function drawPause(sc: Screen): void {
  const L = cur();
  card(60, 250, 360, 380, '#6A4C93', 'Paused');
  txt('Level ' + L.n, 240, 330, 22, 800, '#2A2320', 'center', 'middle');
  button(100, 360, 280, 52, 'Resume', null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      closeScreen();
    },
  });
  button(100, 424, 280, 44, 'Restart level', null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      if (L.status === 'play' && L.stat.taps > 0) logStat('restart');
      closeScreen();
      newLevel(L.n);
    },
  });
  button(100, 480, 280, 44, 'Settings', null, {
    tone: '#4A4540',
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'settings', t: 0, back: sc };
    },
  });
  button(100, 536, 280, 44, 'Map', null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'map', tab: 'path', t: 0, back: sc };
    },
  });
}
