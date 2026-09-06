import { COLORS, GOLD } from '../data/constants';
import type { PlateLike } from '../engine/types';
import { ctx } from './canvas';
import { glyph, txt } from './primitives';

export interface PlateDrawOpts {
  timer?: number;
  timerMax?: number;
  showHidden?: boolean;
}

export function drawPlate(x: number, y: number, p: PlateLike, r: number, opts: PlateDrawOpts = {}): void {
  const col = COLORS[p.color];
  ctx.save();
  ctx.translate(x, y);
  if (p.double) {
    ctx.fillStyle = '#E8E0CC';
    ctx.beginPath();
    ctx.arc(0, r * 0.28, r, 0, 7);
    ctx.fill();
    ctx.lineWidth = r * 0.22;
    ctx.strokeStyle = col.hex;
    ctx.beginPath();
    ctx.arc(0, r * 0.28, r - r * 0.16, 0, 7);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = col.hex;
  ctx.beginPath();
  ctx.arc(0, 0, r - r * 0.16, 0, 7);
  ctx.stroke();
  if (p.vip) {
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, 7);
    ctx.stroke();
  }
  if (p.covered && p.revealed === false && !opts.showHidden) {
    ctx.fillStyle = '#C9CDD6';
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.78, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#EDF0F5';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.2, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#8A8F9C';
    ctx.beginPath();
    ctx.arc(0, -r * 0.68, r * 0.12, 0, 7);
    ctx.fill();
  } else {
    ctx.fillStyle = '#F1EAD6';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r * 0.5, r * 0.28, 0, 0, 7);
    ctx.fill();
    glyph(0, -r * 0.06, col.glyph, r * 0.72, col.hex);
    if (p.covered && opts.showHidden) {
      ctx.fillStyle = 'rgba(138,143,156,.9)';
      ctx.beginPath();
      ctx.arc(r * 0.62, -r * 0.62, r * 0.3, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r * 0.62, -r * 0.58, r * 0.16, Math.PI, 0);
      ctx.stroke();
    }
  }
  if (p.wasabi) {
    ctx.fillStyle = '#5DBB3F';
    ctx.beginPath();
    ctx.arc(r * 0.66, r * 0.66, r * 0.34, 0, 7);
    ctx.fill();
    txt('!', r * 0.66, r * 0.7, r * 0.5, 800, '#fff', 'center', 'middle');
    if (opts.timer != null && opts.timerMax) {
      const frac = Math.max(0, opts.timer / opts.timerMax);
      ctx.lineWidth = 3;
      ctx.strokeStyle = frac < 0.3 ? '#E5484D' : '#5DBB3F';
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
    }
  }
  ctx.restore();
}
