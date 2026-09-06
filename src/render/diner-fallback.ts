/* Procedural diner body and face, kept as the fallback for the frames before a sprite has decoded and for
   environments where SVG images cannot be rasterised. Draws in a coordinate space centred on the body. */

import { COLORS } from '../data/constants';
import { G } from '../engine/state';
import type { ExprType } from '../engine/types';
import { ctx } from './canvas';
import { shade } from './primitives';

function face(r: number, expr: ExprType, blink: boolean): void {
  const gt = G.gt;
  const eyeH = blink ? 0.05 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.08, r * 0.17, r * 0.17 * eyeH + 0.5, 0, 0, 7);
  ctx.ellipse(r * 0.3, -r * 0.08, r * 0.17, r * 0.17 * eyeH + 0.5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#2A2320';
  ctx.strokeStyle = '#2A2320';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.09;
  if (expr === 'happy') {
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.02, r * 0.12, Math.PI, 0);
    ctx.arc(r * 0.3, -r * 0.02, r * 0.12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#5A1C1C';
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.26, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#F06B7A';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.36, r * 0.14, r * 0.07, 0, 0, 7);
    ctx.fill();
    return;
  }
  if (!blink) {
    ctx.beginPath();
    ctx.arc(-r * 0.27, -r * 0.06, r * 0.08, 0, 7);
    ctx.arc(r * 0.33, -r * 0.06, r * 0.08, 0, 7);
    ctx.fill();
  }
  if (expr === 'chew') {
    const w = 1 + Math.sin(gt * 40) * 0.4;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.24, r * 0.14 * w, (r * 0.09) / w, 0, 0, 7);
    ctx.fill();
    return;
  }
  if (expr === 'grumpy') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, -r * 0.38);
    ctx.lineTo(-r * 0.14, -r * 0.26);
    ctx.moveTo(r * 0.48, -r * 0.38);
    ctx.lineTo(r * 0.14, -r * 0.26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.3);
    ctx.lineTo(r * 0.2, r * 0.26);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

export function drawDinerProcedural(color: number, r: number, expr: ExprType, blink: boolean, dimmed: boolean): void {
  const col = COLORS[color];
  ctx.shadowColor = 'rgba(0,0,0,.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = dimmed ? shade(col.hex, 0.78) : col.hex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.36, 0, 7);
  ctx.fill();
  face(r, expr, blink);
}
