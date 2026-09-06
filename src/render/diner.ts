import { COLORS, GOLD } from '../data/constants';
import { isLocked } from '../engine/rules';
import { G, cur } from '../engine/state';
import type { Diner, ExprType } from '../engine/types';
import { easeBack } from '../engine/util';
import { ctx } from './canvas';
import { drawPlate } from './plate';
import { glyph, rrect, shade, txt } from './primitives';

export type DinerMode = 'grid' | 'seat' | 'free';

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

export function drawDiner(d: Diner, r: number, mode: DinerMode): void {
  const L = cur(),
    gt = G.gt;
  const col = COLORS[d.color],
    sc = (d.scale || 1) * (1 + d.bump * 0.12);
  const expr: ExprType =
    d.expr.until > gt ? d.expr.type : mode === 'seat' && L.elapsed - d.waitSince > 1 / L.speed ? 'grumpy' : 'idle';
  if (gt > d.blinkAt + 0.13) d.blinkAt = gt + 2 + Math.random() * 3.5;
  const blink = gt > d.blinkAt && expr !== 'happy';
  let bob = 0;
  if (mode === 'grid' && !d.bumping) bob = Math.sin(gt * 2.2 + d.id) * 1.4;
  if (d.state === 'leaving') bob = -Math.abs(Math.sin(d.leaveT * 14)) * 7;
  ctx.save();
  ctx.globalAlpha = d.alpha;
  ctx.translate(d.x, d.y + bob);
  if (d.shake > 0) {
    const w = Math.sin(gt * 55) * 6 * d.shake;
    ctx.translate(w * (d.shakeX || 0), w * (d.shakeY || 0));
    ctx.rotate(w * 0.02);
  }
  ctx.scale(sc, sc);
  if (mode === 'grid' && d.movable) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(L.elapsed * 5)})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, 7);
    ctx.stroke();
  }
  if (d.vip) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 1.5, 0, 7);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(0,0,0,.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = mode === 'grid' && !d.movable ? shade(col.hex, 0.78) : col.hex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.36, 0, 7);
  ctx.fill();
  face(r, expr, blink);
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.62, r * 0.34, 0, 7);
  ctx.fill();
  glyph(-r * 0.62, -r * 0.62, col.glyph, r * 0.42, col.hex);
  if (d.vip) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, -r * 0.82);
    ctx.lineTo(-r * 0.22, -r * 1.12);
    ctx.lineTo(-r * 0.05, -r * 0.9);
    ctx.lineTo(r * 0.12, -r * 1.16);
    ctx.lineTo(r * 0.3, -r * 0.9);
    ctx.lineTo(r * 0.46, -r * 1.12);
    ctx.lineTo(r * 0.56, -r * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  if (mode === 'grid') {
    const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d.dir];
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(r * 0.98, 0);
    ctx.lineTo(r * 0.6, -r * 0.32);
    ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(r * 0.6, r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2A2320';
    ctx.beginPath();
    ctx.arc(r * 0.62, r * 0.62, r * 0.36, 0, 7);
    ctx.fill();
    txt(d.need, r * 0.62, r * 0.66, r * 0.62, 800, '#fff', 'center', 'middle');
    if (d.lockColor >= 0 && isLocked(d)) {
      ctx.fillStyle = 'rgba(42,35,32,.92)';
      rrect(-r * 0.5, -r * 1.25, r, r * 0.62, r * 0.12);
      ctx.fill();
      ctx.strokeStyle = '#FFF7E8';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 1.25, r * 0.16, Math.PI, 0);
      ctx.stroke();
      glyph(r * 0.18, -r * 0.94, COLORS[d.lockColor].glyph, r * 0.38, COLORS[d.lockColor].hex);
    }
    if (d.ice > 0) {
      ctx.fillStyle = 'rgba(160,215,255,.55)';
      rrect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1, r * 0.35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      rrect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1, r * 0.35);
      ctx.stroke();
      const cracks = (d.iceMax || 3) - d.ice;
      ctx.strokeStyle = 'rgba(40,80,120,.7)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < cracks; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.8 + i * r * 0.5, -r * 0.9);
        ctx.lineTo(-r * 0.3 + i * r * 0.4, -r * 0.1);
        ctx.lineTo(-r * 0.6 + i * r * 0.6, r * 0.9);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  if (mode === 'seat' && d.state === 'seated') {
    const bx = d.x,
      by = d.y + r + 18,
      ps = 1 + d.bubblePop * 0.3;
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.translate(bx, by);
    ctx.scale(ps, ps);
    ctx.fillStyle = '#FFFDF7';
    rrect(-30, -14, 60, 28, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(6, -14);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();
    drawPlate(-13, 0, { color: d.color, vip: d.vip }, 9);
    txt('×' + Math.max(0, d.need), 14, 1, 16, 800, '#2A2320', 'center', 'middle');
    ctx.restore();
    if (expr === 'grumpy') {
      ctx.save();
      ctx.fillStyle = '#5DB6F0';
      ctx.beginPath();
      ctx.moveTo(d.x + r * 0.85, d.y - r * 0.95);
      ctx.quadraticCurveTo(d.x + r * 1.15, d.y - r * 0.4, d.x + r * 0.85, d.y - r * 0.3);
      ctx.quadraticCurveTo(d.x + r * 0.55, d.y - r * 0.4, d.x + r * 0.85, d.y - r * 0.95);
      ctx.fill();
      ctx.restore();
    }
  }
  if (d.state === 'paying' && d.paidT >= 0) {
    const u = Math.min(1, d.paidT / 0.25),
      s = easeBack(u);
    ctx.save();
    ctx.translate(d.x, d.y - r - 22);
    ctx.rotate(-0.18);
    ctx.scale(s, s);
    ctx.strokeStyle = '#E5484D';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255,253,247,.9)';
    rrect(-30, -12, 60, 24, 4);
    ctx.fill();
    ctx.stroke();
    txt('PAID', 0, 1, 17, 800, '#E5484D', 'center', 'middle');
    ctx.restore();
  }
}
