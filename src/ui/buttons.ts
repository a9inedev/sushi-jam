/* Immediate-mode buttons in the izakaya language: drawing a button also registers its hit box for this frame.
   Primary buttons are red lacquer chips, tinted ones are lacquer in their tone, plain ones are wood, and a
   caller can ask for paper. Every button has hover (lighter), pressed (darker, 2 px down, the frame after the
   tap) and disabled (muted, no highlight) states. Hit boxes never move; only the paint does. */

import { sfx } from '../audio/audio';
import { GOLD, W } from '../data/constants';
import { COST } from '../data/products';
import { useBooster } from '../engine/rules';
import { closeScreen, G } from '../engine/state';
import type { BoosterKind } from '../engine/types';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { drawBoosterIcon, drawHudIcon } from '../render/icons';
import { coinIcon, inRect, lacquer, paper, rrect, textW, tint, txt, UI, wood } from '../render/primitives';

export interface ButtonOpts {
  primary?: boolean;
  disabled?: boolean;
  tone?: string;
  /** Material: lacquer (default for primary and toned buttons), wood (default otherwise) or paper. */
  kind?: 'lacquer' | 'wood' | 'paper';
  active?: boolean;
  size?: number;
  color?: string;
  onTap?: () => void;
}

const noop = () => {};

/** Pressed: the pointer is down on the box, or the box was tapped within the last few frames. */
function pressState(x: number, y: number, w: number, h: number): { pressed: boolean; hover: boolean } {
  const p = G.pointer;
  const box = { x, y, w, h };
  const over = p.x >= 0 && inRect(p.x, p.y, box);
  const flashed =
    G.pressed &&
    G.pressed.x === x &&
    G.pressed.y === y &&
    G.pressed.w === w &&
    G.pressed.h === h &&
    G.gt < G.pressed.until;
  return { pressed: (over && p.down) || !!flashed, hover: over && !p.down && p.hover };
}

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
  const { pressed, hover } = opt.disabled ? { pressed: false, hover: false } : pressState(x, y, w, h);
  const r = Math.min(12, h / 2);
  const dy = pressed ? 2 : 0;
  const kind = opt.kind || (opt.primary || opt.tone ? 'lacquer' : 'wood');
  const base = opt.primary ? UI.lacquer : opt.tone || UI.wood;
  ctx.save();
  if (!pressed && !opt.disabled) {
    ctx.fillStyle = 'rgba(42,31,26,.28)';
    rrect(x + 1, y + 3, w, h, r);
    ctx.fill();
  }
  if (opt.disabled) {
    ctx.fillStyle = '#B9B2A5';
    rrect(x, y + dy, w, h, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,31,26,.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (kind === 'paper') paper(x, y + dy, w, h, r, hover ? tint(UI.cream, 0.3) : UI.cream, pressed);
  else if (kind === 'wood') wood(x, y + dy, w, h, r, hover ? tint(base, 0.1) : base, pressed);
  else lacquer(x, y + dy, w, h, r, hover ? tint(base, 0.1) : base, pressed);
  if (opt.active) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    rrect(x, y + dy, w, h, r);
    ctx.stroke();
  }
  const fg = opt.color || (opt.disabled ? 'rgba(255,248,234,.85)' : kind === 'paper' ? UI.ink : UI.rice);
  txt(label, x + w / 2, y + dy + (sub ? h * 0.38 : h / 2), opt.size || (sub ? 15 : 17), 800, fg, 'center', 'middle');
  if (sub)
    txt(
      sub,
      x + w / 2,
      y + dy + h * 0.74,
      12,
      700,
      kind === 'paper' ? UI.body : 'rgba(255,248,234,.85)',
      'center',
      'middle'
    );
  ctx.restore();
}

/** A badge as an ink stamp on a solid disc of its colour. */
export function badge(label: string, x: number, y: number, color: string): number {
  const w = textW(label, 13, 800) + 26;
  ctx.save();
  ctx.fillStyle = color;
  rrect(x, y, w, 24, 7);
  ctx.fill();
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,234,.45)';
  ctx.lineWidth = 1;
  rrect(x + 3, y + 3, w - 6, 18, 5);
  ctx.stroke();
  txt(label, x + w / 2, y + 13, 13, 800, UI.rice, 'center', 'middle', '-0.5px');
  ctx.restore();
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
  button(x, y, w, h, '', null, { tone: UI.indigoDark, onTap });
  drawHudIcon(kind, x + w / 2, y + 16);
  txt(label, x + w / 2, y + h - 9, 11, 800, UI.rice, 'center', 'middle');
}

/** Close button for full-height cards. By default returns to the screen that opened this one, if any. */
export function closeBtn(onTap?: () => void): void {
  button(W - 62, 92, 42, 42, '✕', null, {
    tone: UI.indigoDark,
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

/** A booster: a lacquer disc with a chocolate outline and the icon, a paper price label under it. */
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
  const { pressed } = dis ? { pressed: false } : pressState(x - 34, y - 28, 68, 70);
  const dy = pressed ? 2 : 0;
  ctx.save();
  if (active) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 5 + Math.sin(gt * 6) * 1.5, 0, 7);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(42,31,26,.3)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + r + 2, r * 1.05, r * 0.3, 0, 0, 7);
  ctx.fill();
  const base = dis ? '#B9B2A5' : tone;
  const g = ctx.createRadialGradient(x - r * 0.35, y + dy - r * 0.4, r * 0.2, x, y + dy, r * 1.1);
  g.addColorStop(0, tint(base, dis ? 0 : 0.35));
  g.addColorStop(0.6, base);
  g.addColorStop(1, tint(base, -0.3));
  ctx.fillStyle = g;
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y + dy, r, 0, 7);
  ctx.fill();
  ctx.stroke();
  if (!dis) {
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y + dy - r * 0.45, r * 0.42, r * 0.22, -0.6, 0, 7);
    ctx.fill();
  }
  ctx.translate(x, y + dy);
  drawBoosterIcon(kind, r * 0.9, dis);
  ctx.translate(-x, -(y + dy));
  const inv = S.inv[kind] || 0;
  if (inv > 0 && !used) {
    ctx.fillStyle = UI.ink;
    ctx.beginPath();
    ctx.arc(x + r * 0.78, y - r * 0.78, 9, 0, 7);
    ctx.fill();
    ctx.strokeStyle = UI.rice;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(inv, x + r * 0.78, y - r * 0.78 + 1, 11, 800, UI.rice, 'center', 'middle');
  }
  // The paper price label, tied under the disc.
  const ly = y + r + 12;
  const label = used ? 'opened' : inv > 0 ? 'free' : String(COST[kind]);
  const lw = (inv > 0 || used ? textW(label, 11, 800) : textW(label, 12, 800) + 12) + 14;
  paper(x - lw / 2, ly - 9, lw, 18, 4, dis ? '#E6DFD0' : UI.cream);
  ctx.fillStyle = UI.ink;
  ctx.beginPath();
  ctx.arc(x - lw / 2 + 5, ly, 1.6, 0, 7);
  ctx.fill();
  if (used) txt(label, x + 2, ly + 1, 11, 800, UI.muted, 'center', 'middle');
  else if (inv > 0) txt(label, x + 2, ly + 1, 11, 800, dis ? UI.muted : '#2FB36B', 'center', 'middle');
  else {
    coinIcon(x - lw / 2 + 15, ly, 4.5);
    txt(
      label,
      x - lw / 2 + 23,
      ly + 1,
      12,
      800,
      dis ? UI.muted : S.coins >= COST[kind] ? UI.ink : UI.lacquer,
      'left',
      'middle'
    );
  }
  ctx.restore();
}
