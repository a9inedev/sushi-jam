/* Immediate-mode buttons: drawing a button also registers its hit box for this frame. */

import { sfx } from '../audio/audio';
import { GOLD, W } from '../data/constants';
import { COST } from '../data/products';
import { useBooster } from '../engine/rules';
import { closeScreen, G } from '../engine/state';
import type { BoosterKind } from '../engine/types';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { drawBoosterIcon, drawHudIcon } from '../render/icons';
import { coinIcon, rrect, textW, txt } from '../render/primitives';

export interface ButtonOpts {
  primary?: boolean;
  disabled?: boolean;
  tone?: string;
  active?: boolean;
  size?: number;
  color?: string;
  onTap?: () => void;
}

const noop = () => {};

export function button(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | null,
  opt: ButtonOpts = {}
): void {
  G.buttons.push({ x, y, w, h, onTap: opt.disabled ? noop : opt.onTap || noop });
  ctx.save();
  ctx.fillStyle = opt.disabled ? '#B9B2A5' : opt.primary ? '#E5484D' : opt.tone || '#3B3F4A';
  rrect(x, y, w, h, Math.min(12, h / 2));
  ctx.fill();
  if (opt.active) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    rrect(x, y, w, h, Math.min(12, h / 2));
    ctx.stroke();
  }
  txt(
    label,
    x + w / 2,
    y + (sub ? h * 0.38 : h / 2),
    opt.size || (sub ? 15 : 17),
    800,
    opt.color || '#fff',
    'center',
    'middle'
  );
  if (sub) txt(sub, x + w / 2, y + h * 0.74, 12, 700, 'rgba(255,255,255,.85)', 'center', 'middle');
  ctx.restore();
}

export function badge(label: string, x: number, y: number, color: string): number {
  const w = textW(label, 13, 800) + 26;
  ctx.fillStyle = color;
  rrect(x, y, w, 24, 7);
  ctx.fill();
  txt(label, x + w / 2, y + 13, 13, 800, '#fff', 'center', 'middle');
  return w;
}

export function iconBtn(
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'map' | 'shop',
  label: string,
  onTap: () => void
): void {
  button(x, y, w, h, '', null, { tone: 'rgba(42,35,32,.85)', onTap });
  drawHudIcon(kind, x + w / 2, y + 16);
  txt(label, x + w / 2, y + h - 9, 11, 800, '#FFF7E8', 'center', 'middle');
}

/** Close button for full-height cards. By default returns to the screen that opened this one, if any. */
export function closeBtn(onTap?: () => void): void {
  button(W - 62, 92, 42, 42, '✕', null, {
    tone: '#4A4540',
    onTap:
      onTap ||
      (() => {
        sfx.ui();
        const back = G.screen && G.screen.back;
        if (back) G.screen = back;
        else closeScreen();
      }),
  });
}

export function boosterButton(
  x: number,
  y: number,
  kind: BoosterKind,
  tone: string,
  dis: boolean,
  active: boolean,
  used: boolean
): void {
  const r = 21,
    gt = G.gt;
  G.buttons.push({ x: x - 34, y: y - 28, w: 68, h: 70, onTap: dis ? noop : () => useBooster(kind) });
  ctx.save();
  if (active) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 5 + Math.sin(gt * 6) * 1.5, 0, 7);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = dis ? '#B9B2A5' : tone;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.5, 0, 7);
  ctx.fill();
  ctx.translate(x, y);
  drawBoosterIcon(kind, r * 0.9, dis);
  ctx.translate(-x, -y);
  const inv = S.inv[kind] || 0;
  if (inv > 0 && !used) {
    ctx.fillStyle = '#2A2320';
    ctx.beginPath();
    ctx.arc(x + r * 0.78, y - r * 0.78, 9, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#FFF7E8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(inv, x + r * 0.78, y - r * 0.78 + 1, 11, 800, '#fff', 'center', 'middle');
  }
  const ly = y + r + 12;
  if (used) txt('opened', x, ly, 11, 800, '#8A8378', 'center', 'middle');
  else if (inv > 0) txt('free', x, ly, 12, 800, dis ? '#8A8378' : '#2FB36B', 'center', 'middle');
  else {
    const w = textW(COST[kind], 12, 800) + 14;
    coinIcon(x - w / 2 + 5, ly, 5);
    txt(
      COST[kind],
      x - w / 2 + 14,
      ly + 1,
      12,
      800,
      dis ? '#8A8378' : S.coins >= COST[kind] ? '#2A2320' : '#E5484D',
      'left',
      'middle'
    );
  }
  ctx.restore();
}
