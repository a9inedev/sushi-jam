import { PLATE_BOX, plateBaseSvg } from '../art/plate-base';
import { foodSvg } from '../art/plates';
import { sprite } from '../art/svg';
import { COLORS, GOLD } from '../data/constants';
import type { PlateLike } from '../engine/types';
import { S } from '../meta/save';
import { ctx } from './canvas';
import { fillPattern } from './patterns';
import { glyph, txt } from './primitives';

export interface PlateDrawOpts {
  timer?: number;
  timerMax?: number;
  showHidden?: boolean;
}

/** The sushi for a colour, centred on the origin, sized to sit inside a plate of radius r. */
export function drawFood(color: number, r: number): boolean {
  const box = Math.round(r * 1.7);
  const img = sprite(`f${color}`, () => foodSvg(color), box, box);
  if (!img) return false;
  ctx.drawImage(img, -box / 2, -box * 0.52, box, box);
  return true;
}

/** The ceramic plate with rim, shadow and VIP or double variants, from a cached sprite. */
function drawPlateBase(p: PlateLike, r: number): boolean {
  const box = Math.round(r * PLATE_BOX);
  const img = sprite(
    `p${p.color}${p.vip ? 'v' : ''}${p.double ? 'd' : ''}`,
    () => plateBaseSvg(p.color, !!p.vip, !!p.double),
    box,
    box
  );
  if (!img) return false;
  ctx.drawImage(img, -box / 2, -box / 2, box, box);
  return true;
}

export function drawPlate(x: number, y: number, p: PlateLike, r: number, opts: PlateDrawOpts = {}): void {
  const col = COLORS[p.color];
  ctx.save();
  ctx.translate(x, y);
  if (drawPlateBase(p, r)) {
    if (S.colorblind)
      fillPattern(ctx, p.color, () => {
        ctx.arc(0, 0, r * 0.98, 0, 7);
        ctx.arc(0, 0, r * 0.7, 0, 7, true);
      });
    drawPlateTop(p, r, opts);
    ctx.restore();
    return;
  }
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
  // Inner plate lip: a soft ring that sells the ceramic.
  ctx.lineWidth = r * 0.06;
  ctx.strokeStyle = 'rgba(42,35,32,.08)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, 7);
  ctx.stroke();
  if (p.vip) {
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, 7);
    ctx.stroke();
  }
  drawPlateTop(p, r, opts);
  ctx.restore();
}

/** Everything on top of the ceramic: cloche, food, glyph badge, wasabi timer. Origin at the plate centre. */
function drawPlateTop(p: PlateLike, r: number, opts: PlateDrawOpts): void {
  const col = COLORS[p.color];
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
    if (!drawFood(p.color, r)) {
      ctx.fillStyle = '#F1EAD6';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.5, r * 0.28, 0, 0, 7);
      ctx.fill();
      glyph(0, -r * 0.06, col.glyph, r * 0.72, col.hex);
    }
    // Shape glyph badge on the rim: the colour-blind cue, always drawn.
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = col.hex;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(-r * 0.62, -r * 0.62, r * 0.3, 0, 7);
    ctx.fill();
    ctx.stroke();
    glyph(-r * 0.62, -r * 0.62, col.glyph, r * 0.38, col.hex);
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
}
