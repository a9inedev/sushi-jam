/* Settings and Pause. Both freeze the level while open. */

import { setRumble, sfx } from '../audio/audio';
import { GOLD } from '../data/constants';
import { logStat, newLevel } from '../engine/rules';
import { closeScreen, cur, G, type Screen } from '../engine/state';
import { haptic, isNative, platform } from '../platform/native';
import { S, save } from '../meta/save';
import { ctx } from '../render/canvas';
import { card, rrect, txt } from '../render/primitives';
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

function hapticsHint(): string {
  if (isNative) return 'Vibration on seat, grab, jam and clear';
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
    return 'Vibration where this browser allows it';
  return 'Not available in this browser';
}

export function drawSettings(sc: Screen): void {
  card(60, 230, 360, 420, '#3B3F4A', 'Settings');
  toggleRow(330, 'Sound', 'Effects and belt rumble', S.sound, () => {
    S.sound = !S.sound;
    save();
    if (S.sound) sfx.tap();
    else setRumble(0);
  });
  toggleRow(396, 'Haptics', hapticsHint(), S.haptics, () => {
    S.haptics = !S.haptics;
    save();
    sfx.tap();
    if (S.haptics) haptic('medium');
  });
  txt(
    'Sushi Jam v' + __APP_VERSION__ + ' · ' + (isNative ? platform : 'web'),
    240,
    556,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
  button(150, 584, 180, 46, 'Done', null, {
    primary: true,
    onTap: () => {
      sfx.tap();
      G.screen = sc.back || null;
    },
  });
}

export function drawPause(sc: Screen): void {
  const L = cur();
  card(60, 250, 360, 380, '#6A4C93', 'Paused');
  txt('Level ' + L.n, 240, 330, 22, 800, '#2A2320', 'center', 'middle');
  ctx.fillStyle = GOLD;
  button(100, 360, 280, 52, 'Resume', null, {
    primary: true,
    onTap: () => {
      sfx.tap();
      closeScreen();
    },
  });
  button(100, 424, 280, 44, 'Restart level', null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.tap();
      if (L.status === 'play' && L.stat.taps > 0) logStat('restart');
      closeScreen();
      newLevel(L.n);
    },
  });
  button(100, 480, 280, 44, 'Settings', null, {
    tone: '#4A4540',
    onTap: () => {
      sfx.tap();
      G.screen = { type: 'settings', t: 0, back: sc };
    },
  });
  button(100, 536, 280, 44, 'Map', null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.tap();
      G.screen = { type: 'map', tab: 'path', t: 0, back: sc };
    },
  });
}
