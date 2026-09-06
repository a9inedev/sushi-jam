/* The play scene: background, decor, belt, kitchen, seats, grid and effects. */

import { reducedMotion } from '../anim/motion';
import { particles } from '../anim/particles';
import { backgroundSvg, bonsaiSvg, lanternSvg, norenSvg, tankSvg } from '../art/background';
import { sprite } from '../art/svg';
import { COLORS, DINER_R, H, KITCHEN, W } from '../data/constants';
import { BELT } from '../engine/belt';
import { G, cur } from '../engine/state';
import { S } from '../meta/save';
import { ctx } from './canvas';
import { drawDiner } from './diner';
import { drawPlate } from './plate';
import { coinIcon, rrect, textW, txt } from './primitives';

export function drawBg(): void {
  const img = sprite('bg', backgroundSvg, W, H);
  if (img) {
    ctx.drawImage(img, 0, 0, W, H);
    return;
  }
  // Flat fallback until the layered background has decoded.
  ctx.fillStyle = '#FBF3E4';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2B2622';
  ctx.fillRect(0, 0, W, 76);
  const g = ctx.createLinearGradient(0, 424, 0, 566);
  g.addColorStop(0, '#C9924F');
  g.addColorStop(1, '#A86F35');
  ctx.fillStyle = g;
  ctx.fillRect(0, 424, W, 142);
  ctx.strokeStyle = 'rgba(80,40,10,.16)';
  ctx.lineWidth = 1;
  for (let y = 438; y < 566; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#EFE4C8';
  ctx.fillRect(0, 566, W, H - 566);
}

export function drawDecor(): void {
  const gt = G.gt;
  const has = (id: string) => S.decor.includes(id);
  const lantern = has('lantern') ? sprite('lantern', lanternSvg, 48, 72) : null;
  const noren = has('noren') ? sprite('noren', norenSvg, 320, 44) : null;
  const bonsai = has('plant') ? sprite('bonsai', bonsaiSvg, 64, 64) : null;
  const tank = has('tank') ? sprite('tank', tankSvg, 92, 52) : null;
  if (lantern)
    for (const x of [18, 462]) {
      const sw = Math.sin(gt * 1.3 + x) * 3;
      ctx.save();
      ctx.translate(x + sw, 80);
      ctx.rotate(sw * 0.025);
      ctx.drawImage(lantern, -24, 0, 48, 72);
      ctx.restore();
    }
  else if (has('lantern'))
    for (const x of [18, 462]) {
      ctx.save();
      ctx.strokeStyle = '#5A4E45';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 76);
      ctx.lineTo(x, 96);
      ctx.stroke();
      const sw = Math.sin(gt * 1.3 + x) * 3;
      ctx.translate(x + sw, 118);
      ctx.fillStyle = '#E5484D';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 22, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 16 * Math.abs(i ? 0.55 : 0.05) + 1, 22, 0, 0, 7);
        ctx.stroke();
      }
      ctx.fillStyle = '#F2B705';
      ctx.fillRect(-7, -26, 14, 5);
      ctx.fillRect(-7, 21, 14, 5);
      ctx.restore();
    }
  if (noren) {
    ctx.save();
    ctx.translate(80, 192);
    ctx.transform(1, 0, Math.sin(gt * 1.6) * 0.03, 1, 0, 0);
    ctx.drawImage(noren, 0, 0, 320, 44);
    ctx.restore();
  } else if (has('noren')) {
    ctx.save();
    const y0 = 196;
    for (let i = 0; i < 6; i++) {
      const x = 84 + i * 52,
        wob = Math.sin(gt * 1.6 + i) * 2;
      ctx.fillStyle = i % 2 ? '#26336B' : '#2E3F82';
      rrect(x + wob, y0, 46, 34, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6 + wob, y0 + 22);
      ctx.quadraticCurveTo(x + 16 + wob, y0 + 12, x + 24 + wob, y0 + 22);
      ctx.quadraticCurveTo(x + 32 + wob, y0 + 32, x + 40 + wob, y0 + 22);
      ctx.stroke();
    }
    ctx.fillStyle = '#5A4E45';
    ctx.fillRect(80, 192, 320, 4);
    ctx.restore();
  }
  if (bonsai) ctx.drawImage(bonsai, 60, 314, 64, 64);
  else if (has('plant')) {
    ctx.save();
    ctx.translate(92, 372);
    ctx.fillStyle = '#7A4B22';
    rrect(-18, -6, 36, 12, 3);
    ctx.fill();
    ctx.strokeStyle = '#5A3A1E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(6, -24, -4, -36);
    ctx.stroke();
    ctx.fillStyle = '#2FB36B';
    for (const [x, y, r] of [
      [-10, -30, 11],
      [6, -40, 10],
      [-2, -48, 8],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r * 0.8, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }
  if (has('tank')) {
    ctx.save();
    const x = 322,
      y = 328,
      w = 92,
      h = 52;
    if (tank) ctx.drawImage(tank, x, y, w, h);
    else {
      ctx.fillStyle = 'rgba(93,182,240,.35)';
      rrect(x, y, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = '#5A4E45';
      ctx.lineWidth = 3;
      rrect(x, y, w, h, 6);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const fx0 = x + 14 + ((gt * (18 + i * 7) + i * 40) % (w - 28)),
        fy = y + 14 + i * 13 + Math.sin(gt * 3 + i) * 3,
        dir = Math.floor((gt * (18 + i * 7) + i * 40) / (w - 28)) % 2 ? -1 : 1;
      ctx.fillStyle = ['#F5843B', '#E5484D', '#F2B705'][i];
      ctx.beginPath();
      ctx.ellipse(fx0, fy, 7, 4, 0, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx0 - 7 * dir, fy);
      ctx.lineTo(fx0 - 12 * dir, fy - 4);
      ctx.lineTo(fx0 - 12 * dir, fy + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawBelt(): void {
  const L = cur(),
    b = BELT,
    gt = G.gt;
  if (L.tension > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(229,72,77,${0.55 * L.tension * (0.7 + 0.3 * Math.sin(L.elapsed * 8))})`;
    ctx.lineWidth = 50;
    rrect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h, b.r);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.lineWidth = 38;
  ctx.strokeStyle = '#33373F';
  rrect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h, b.r);
  ctx.stroke();
  ctx.lineWidth = 30;
  ctx.strokeStyle = '#4A4F5C';
  ctx.stroke();
  ctx.setLineDash([14, 18]);
  ctx.lineDashOffset = -L.elapsed * L.speed * b.total;
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#5B6170';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  txt(
    'BELT ' + L.belt.length + ' / ' + L.beltCap,
    405,
    S.decor.includes('noren') ? 248 : 212,
    13,
    800,
    L.belt.length >= L.beltCap - 1 ? '#E5484D' : '#8A8378',
    'right',
    'middle'
  );
  if (S.decor.includes('neon')) {
    ctx.save();
    ctx.shadowColor = '#FF3FA4';
    ctx.shadowBlur = 18 + Math.sin(gt * 6) * 4;
    txt('SUSHI JAM', 240, 268, 30, 800, '#FF6BBE', 'center', 'middle');
    ctx.shadowBlur = 0;
    txt('SUSHI JAM', 240, 268, 30, 800, 'rgba(255,255,255,.75)', 'center', 'middle');
    ctx.restore();
  } else txt('SUSHI JAM', 240, 205, 15, 800, 'rgba(60,50,40,.28)', 'center', 'middle');
}

export function drawPlatesOnBelt(): void {
  const L = cur();
  for (const p of L.belt) {
    if (p.state !== 'belt') continue;
    const q = BELT.pointAt(p.t);
    drawPlate(q.x, q.y, p, 15, { timer: p.timer, timerMax: 1.6 / L.speed });
  }
}

export function drawKitchen(): void {
  const L = cur(),
    k = KITCHEN;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#3A302A';
  rrect(k.x, k.y, k.w, k.h, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#E5484D';
  rrect(k.x, k.y, k.w, 20, 12);
  ctx.fill();
  ctx.fillStyle = '#3A302A';
  ctx.fillRect(k.x, k.y + 12, k.w, 10);
  txt('KITCHEN · NEXT UP', k.x + 12, k.y + 11, 12, 800, '#fff', 'left', 'middle');
  const vis = L.kitchen.slice(0, L.visibleNext);
  vis.forEach((p, i) => drawPlate(k.x + 30 + i * 34, k.y + 46, p, 12, { showHidden: true }));
  for (let i = vis.length; i < 3 && i < L.kitchen.length; i++) {
    ctx.fillStyle = '#5A4E45';
    ctx.beginPath();
    ctx.arc(k.x + 30 + i * 34, k.y + 46, 12, 0, 7);
    ctx.fill();
    txt('?', k.x + 30 + i * 34, k.y + 47, 15, 800, '#B8ACA0', 'center', 'middle');
  }
  txt(L.kitchen.length + ' plates left', k.x + k.w - 14, k.y + 46, 14, 800, '#FFF7E8', 'right', 'middle');
  ctx.restore();
}

export function drawSeats(): void {
  const L = cur();
  const reduced = reducedMotion();
  const sh = L.seatShake > 0 && !reduced ? Math.sin(L.elapsed * 60) * 4 * L.seatShake : 0;
  for (const s of L.seats) {
    // The stool compresses when someone lands on it, then springs back.
    const press = reduced ? 0 : s.press;
    ctx.save();
    ctx.translate(sh, 0);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 22, 22 + press * 3, 7, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#7A4B22';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 14 + press * 2, 20 + press * 3, 9 - press * 3, 0, 0, 7);
    ctx.fill();
    if (!s.diner) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, DINER_R + 2, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  for (const s of L.seats)
    if (s.diner && s.diner.state === 'seated') {
      const press = reduced ? 0 : s.press;
      ctx.save();
      ctx.translate(0, press * 3);
      drawDiner(s.diner, DINER_R, 'seat');
      ctx.restore();
    }
  for (const p of L.belt) {
    if (!p.arc) continue;
    if (p.state === 'grab') {
      const a = p.arc,
        u = a.u,
        x = a.x0 + (a.x1 - a.x0) * u,
        y = a.y0 + (a.y1 - a.y0) * u - Math.sin(u * Math.PI) * 26;
      drawPlate(x, y, p, 15 * (1 - u * 0.6));
    } else if (p.state === 'landed') {
      ctx.save();
      ctx.translate(p.arc.x1, p.arc.y1 + 4);
      ctx.scale(p.sx, p.sy);
      drawPlate(0, -4, p, 6);
      ctx.restore();
    }
  }
}

export function drawGrid(): void {
  const L = cur();
  const gw = L.cols * L.cell,
    gh = L.rows * L.cell;
  ctx.save();
  ctx.fillStyle = '#E4D6B4';
  rrect(L.gx - 8, L.gy - 8, gw + 16, gh + 16, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,95,60,.18)';
  ctx.lineWidth = 1;
  for (let c = 1; c < L.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(L.gx + c * L.cell, L.gy);
    ctx.lineTo(L.gx + c * L.cell, L.gy + gh);
    ctx.stroke();
  }
  for (let r = 1; r < L.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(L.gx, L.gy + r * L.cell);
    ctx.lineTo(L.gx + gw, L.gy + r * L.cell);
    ctx.stroke();
  }
  ctx.restore();
  const r = L.cell * 0.36;
  for (const d of L.diners) if (d.state === 'grid') drawDiner(d, r, 'grid');
}

export function drawFloating(): void {
  for (const d of cur().diners)
    if (d.state === 'walking' || d.state === 'paying' || d.state === 'leaving') drawDiner(d, DINER_R, 'free');
}

/** Every live particle except confetti, which the win overlay draws above the dim. */
export function drawParticles(): void {
  ctx.save();
  particles.draw(ctx, coinIcon, 'confetti');
  ctx.restore();
}

export function drawConfetti(): void {
  ctx.save();
  particles.draw(ctx, coinIcon, null, 'confetti');
  ctx.restore();
}

export function drawToasts(): void {
  let y = 300;
  for (const t of G.toasts) {
    if (t.t < 0) continue;
    const a = Math.min(1, t.t * 4, (t.dur - t.t) * 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    const w = textW(t.text, 15, 800) + 30;
    ctx.fillStyle = 'rgba(42,35,32,.9)';
    rrect(240 - w / 2, y - 15, w, 30, 15);
    ctx.fill();
    txt(t.text, 240, y + 1, 15, 800, '#fff', 'center', 'middle');
    ctx.restore();
    y += 36;
  }
}

export { COLORS };
