/* The reminders opt-in card and the Reminders rows of the settings screen. */

import { sfx } from '../audio/audio';
import { G, runPending, type Screen } from '../engine/state';
import { t } from '../i18n';
import { declinePrompt, notify, notifyAvailable, optIn, setEnabled, setType } from '../meta/notify';
import { S } from '../meta/save';
import { notifyBackend } from '../platform/notifications';
import { ctx } from '../render/canvas';
import { card, rrect, txt, wrapText } from '../render/primitives';
import { button } from './buttons';

function bell(x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = '#F2B705';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, y + r * 0.5);
  ctx.quadraticCurveTo(x - r * 0.9, y - r * 0.9, x, y - r * 0.9);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 0.9, x + r * 0.9, y + r * 0.5);
  ctx.lineTo(x + r * 1.1, y + r * 0.7);
  ctx.lineTo(x - r * 1.1, y + r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#E5484D';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.85, r * 0.22, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.95, r * 0.14, 0, 7);
  ctx.fill();
  ctx.restore();
}

/** The one-time prompt, shown after level 10. Both answers close it and continue the win flow. */
export function drawNotifyPrompt(_sc: Screen): void {
  const close = () => {
    G.screen = null;
    runPending();
  };
  card(60, 230, 360, 440, '#3E7BFA', t('notify.title'));
  bell(240, 330, 34);
  const end = wrapText(t('notify.body'), 240, 400, 300, 14, '#5A4E45');
  txt(t('notify.settingsHint'), 240, Math.max(end + 16, 470), 12, 700, '#8A8378', 'center', 'middle');
  button(90, 530, 300, 52, t('notify.yes'), null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      close();
      void optIn();
    },
  });
  button(90, 596, 300, 44, t('notify.no'), null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      declinePrompt();
      close();
    },
  });
}

function toggle(y: number, label: string, sub: string | null, on: boolean, dim: boolean, onTap: () => void): void {
  G.buttons.push({ x: 80, y: y - 26, w: 320, h: 52, onTap });
  txt(label, 92, sub ? y - 6 : y, 17, 800, dim ? '#B9B2A5' : '#2A2320', 'left', 'middle');
  if (sub) txt(sub, 92, y + 14, 11, 700, '#8A8378', 'left', 'middle');
  const px = 330,
    pw = 64,
    ph = 30;
  ctx.save();
  ctx.fillStyle = on ? '#2FB36B' : '#B9B2A5';
  if (dim) ctx.globalAlpha = 0.5;
  rrect(px, y - ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(on ? px + pw - ph / 2 : px + ph / 2, y, ph / 2 - 4, 0, 7);
  ctx.fill();
  ctx.restore();
}

/** The Reminders tab of the settings screen: the master switch and one switch per type, from y down. */
export function drawReminderRows(y: number): void {
  const available = notifyAvailable();
  const blocked = notify.permission === 'denied';
  const on = S.notif.enabled && notify.permission === 'granted';
  const hint = !available
    ? t('settings.notifyWeb')
    : blocked
      ? t('settings.notifyBlocked')
      : notifyBackend.kind === 'web'
        ? t('settings.notifyWeb')
        : t('settings.notifySub');
  toggle(y, t('settings.notifyAll'), hint, on, !available || blocked, () => {
    sfx.ui();
    if (!available || blocked) return;
    void setEnabled(!S.notif.enabled);
  });
  const rows: ['daily' | 'streak' | 'event', boolean, string, string][] = [
    ['daily', S.notif.daily, t('settings.notifyDaily'), t('settings.notifyDailySub')],
    ['streak', S.notif.streak, t('settings.notifyStreak'), t('settings.notifyStreakSub')],
    ['event', S.notif.events, t('settings.notifyEvents'), t('settings.notifyEventsSub')],
  ];
  rows.forEach(([type, val, label, sub], i) =>
    toggle(y + 76 + i * 66, label, sub, on && val, !on, () => {
      sfx.ui();
      if (!on) return;
      void setType(type, !val);
    })
  );
  wrapText(t('settings.notifyFooter'), 240, y + 290, 300, 12, '#8A8378');
}
