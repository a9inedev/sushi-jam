import { clocheSvg, flagSvg, PLATE_BOX, plateBaseSvg } from '../art/plate-base';
import { foodSvg } from '../art/plates';
import { sprite } from '../art/svg';
import { COLORS, GOLD } from '../data/constants';
import type { PlateLike } from '../engine/types';
import { S } from '../meta/save';
import { ctx } from './canvas';
import { fillPattern } from './patterns';
import { glyph, rrect, txt } from './primitives';

export interface PlateDrawOpts {
  timer?: number;
  timerMax?: number;
  showHidden?: boolean;
}

const INK = '#2A1F1A';

/** The sushi for a colour, centred on the origin, sized to sit inside a plate of radius r. */
export function drawFood(color: number, r: number): boolean {
  const box = Math.round(r * 1.7);
  const img = sprite(`f${color}`, () => foodSvg(color), box, box);
  if (!img) return false;
  ctx.drawImage(img, -box / 2, -box * 0.54, box, box);
  return true;
}

/** The ceramic plate with rim, shadow and the VIP, double and special variants, from a cached sprite. */
function drawPlateBase(p: PlateLike, r: number): boolean {
  const box = Math.round(r * PLATE_BOX);
  const img = sprite(
    `p${p.color}${p.vip ? 'v' : ''}${p.double ? 'd' : ''}${p.special ? 's' : ''}`,
    () => plateBaseSvg(p.color, !!p.vip, !!p.double, !!p.special),
    box,
    box
  );
  if (!img) return false;
  // The double-decker's plate sits higher in its box; keep the dish centred on the origin.
  ctx.drawImage(img, -box / 2, -box / 2 + (p.double ? box * 0.1 : 0), box, box);
  return true;
}

function drawSprite(key: string, svg: () => string, r: number, dy = 0): boolean {
  const box = Math.round(r * PLATE_BOX);
  const img = sprite(key, svg, box, box);
  if (!img) return false;
  ctx.drawImage(img, -box / 2, -box / 2 + dy, box, box);
  return true;
}

export function drawPlate(x: number, y: number, p: PlateLike, r: number, opts: PlateDrawOpts = {}): void {
  const col = COLORS[p.color];
  ctx.save();
  ctx.translate(x, y);
  if (drawPlateBase(p, r)) {
    if (S.colorblind)
      fillPattern(ctx, p.color, () => {
        ctx.ellipse(0, 0, r * 0.98, r * 0.88, 0, 0, 7);
        ctx.ellipse(0, 0, r * 0.7, r * 0.62, 0, 0, 7, true);
      });
    drawPlateTop(p, r, opts);
    ctx.restore();
    return;
  }
  // Procedural fallback until the sprite has decoded: the same ellipse, flat.
  if (p.double) {
    ctx.fillStyle = '#8F1F27';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 1.05, r * 0.35, 0, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(42,31,26,.22)';
  ctx.beginPath();
  ctx.ellipse(r * 0.08, r * 0.3, r, r * 0.3, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = p.vip ? '#1A1412' : '#FFF8EA';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.9, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = r * 0.26;
  ctx.strokeStyle = p.vip ? GOLD : col.hex;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.84, r * 0.74, 0, 0, 7);
  ctx.stroke();
  drawPlateTop(p, r, opts);
  ctx.restore();
}

/** The glyph as an embossed stamp on the rim: rice white disc, inner shade, chocolate edge, glyph in the rim colour. */
function drawStamp(cx: number, cy: number, r: number, color: number): void {
  const col = COLORS[color];
  ctx.fillStyle = '#FFF8EA';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,31,26,.18)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.03, r * 0.22, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  glyph(cx, cy, col.glyph, r * 0.36, col.hex);
}

/** Everything on top of the ceramic: cloche, food, glyph stamp, flag, wasabi ring. Origin at the plate centre. */
function drawPlateTop(p: PlateLike, r: number, opts: PlateDrawOpts): void {
  const col = COLORS[p.color];
  if (p.special) {
    // Chef's special: the four-colour rim is in the sprite; a gold flag says anyone may take it.
    if (!drawSprite('flag', flagSvg, r, -r * 0.35)) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(r * 0.5, -r * 0.55);
      ctx.lineTo(0, -r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (p.covered && p.revealed === false && !opts.showHidden) {
    if (!drawSprite('cloche', clocheSvg, r, -r * 0.1)) {
      ctx.fillStyle = '#C9CDD6';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.78, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    if (!drawFood(p.color, r)) {
      ctx.fillStyle = '#F5E9D2';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.5, r * 0.28, 0, 0, 7);
      ctx.fill();
      glyph(0, -r * 0.06, col.glyph, r * 0.72, col.hex);
    }
    // Shape glyph stamp on the rim: the colour-blind cue, always drawn.
    drawStamp(-r * 0.62, -r * 0.6, r, p.color);
    if (p.covered && opts.showHidden) {
      ctx.fillStyle = 'rgba(138,143,156,.92)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(r * 0.62, -r * 0.6, r * 0.3, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r * 0.62, -r * 0.56, r * 0.16, Math.PI, 0);
      ctx.stroke();
    }
  }
  if (p.owner != null && p.owner >= 0) {
    // Named plate: the ticket number on a paper tag.
    ctx.fillStyle = '#F5E9D2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    rrect(r * 0.3, -r * 0.95, r * 0.7, r * 0.55, r * 0.08);
    ctx.fill();
    ctx.stroke();
    txt(String(p.owner + 1), r * 0.65, -r * 0.66, r * 0.42, 800, INK, 'center', 'middle');
  }
  if (p.wasabi) {
    ctx.fillStyle = '#5DBB3F';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r * 0.64, r * 0.62, r * 0.34, 0, 7);
    ctx.fill();
    ctx.stroke();
    txt('!', r * 0.64, r * 0.66, r * 0.5, 800, '#FFF8EA', 'center', 'middle');
    if (opts.timer != null && opts.timerMax) {
      // The timer ring glows: a soft green halo under a crisp arc that turns red when time is short.
      const frac = Math.max(0, opts.timer / opts.timerMax);
      const hot = frac < 0.3;
      ctx.save();
      ctx.shadowColor = hot ? 'rgba(229,72,77,.8)' : 'rgba(93,187,63,.8)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = hot ? '#E5484D' : '#7BE05A';
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 4, r * 0.9 + 4, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    }
  }
}
