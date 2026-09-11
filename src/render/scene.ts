/* The play scene: background, decor, belt, kitchen, seats, grid and effects. */

import { reducedMotion } from '../anim/motion';
import { particles } from '../anim/particles';
import { backgroundSvg } from '../art/background';
import { DECOR_ART, SLOT_BOX } from '../art/decor';
import { activeTheme } from '../data/theme-state';
import { decorOf } from '../data/themes';
import { sprite } from '../art/svg';
import { COLORS, DINER_R, H, KITCHEN, SEAT_Y, W } from '../data/constants';
import { BELT } from '../engine/belt';
import { G, cur } from '../engine/state';
import { t } from '../i18n';
import { S } from '../meta/save';
import { ctx } from './canvas';
import { drawDiner } from './diner';
import { drawPlate } from './plate';
import { coinIcon, glyph, rrect, textW, txt, UI, wood } from './primitives';

const INK = '#2A1F1A';

export function drawBg(): void {
  const th = activeTheme(),
    P = th.palette;
  const img = sprite('bg:' + th.id, () => backgroundSvg(th), W, H);
  if (img) {
    ctx.drawImage(img, 0, 0, W, H);
    return;
  }
  // Flat fallback in the restaurant's colours until the layered background has decoded.
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P.headerDark;
  ctx.fillRect(0, 0, W, 76);
  const g = ctx.createLinearGradient(0, 424, 0, 566);
  g.addColorStop(0, P.counterTop);
  g.addColorStop(1, P.counterBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 424, W, 142);
  ctx.fillStyle = P.floor;
  ctx.fillRect(0, 566, W, H - 566);
}

function drawFish(x: number, y: number, w: number, gt: number): void {
  ctx.save();
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

/** The active restaurant's owned decor, each piece in its slot: hanging pieces swing, the band sways. */
export function drawDecor(): void {
  const gt = G.gt,
    th = activeTheme();
  for (const d of decorOf(th.id)) {
    if (!S.decor.includes(d.id) || d.slot === 'sign') continue;
    const art = DECOR_ART[d.id];
    if (!art) continue;
    const img = sprite('decor:' + d.id, art.svg, art.w, art.h);
    if (!img) continue;
    const box = SLOT_BOX[d.slot];
    if (d.slot === 'hang') {
      for (const x of [18, 462]) {
        const sw = Math.sin(gt * 1.3 + x) * 3;
        ctx.save();
        ctx.translate(x + sw, box.y);
        ctx.rotate(sw * 0.025);
        // The warm glow behind the lantern: a radial gradient that breathes with the lantern pulse.
        const glow = ctx.createRadialGradient(0, 38, 4, 0, 38, 60);
        glow.addColorStop(0, `rgba(255,179,92,${0.5 + G.glowPulse * 0.2})`);
        glow.addColorStop(1, 'rgba(255,179,92,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 38, 60, 0, 7);
        ctx.fill();
        ctx.drawImage(img, -box.w / 2, 0, box.w, box.h);
        ctx.restore();
      }
    } else if (d.slot === 'band') {
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.transform(1, 0, Math.sin(gt * 1.6) * 0.03, 1, 0, 0);
      ctx.drawImage(img, 0, 0, box.w, box.h);
      ctx.restore();
    } else ctx.drawImage(img, box.x, box.y, box.w, box.h);
    if (d.id === 'tank') drawFish(box.x, box.y, box.w, gt);
  }
}

/** The belt as a conveyor: a dark rubber track with a chevron tread that scrolls with the plates, steel side rails
    with highlights, rollers at the corners, and a warm reflection of the lanterns on the top rail. */
function drawConveyor(
  b: typeof BELT,
  P: { beltRail: string; beltTrack: string; beltDash: string; glow: string },
  phase: number
): void {
  const x = b.cx - b.w / 2,
    y = b.cy - b.h / 2;
  ctx.save();
  // Occlusion under the whole belt.
  ctx.strokeStyle = 'rgba(42,31,26,.22)';
  ctx.lineWidth = 44;
  rrect(x, y + 4, b.w, b.h, b.r);
  ctx.stroke();
  // Rails: chocolate edge, steel, a bright line on the outer top edge.
  ctx.lineWidth = 40;
  ctx.strokeStyle = INK;
  rrect(x, y, b.w, b.h, b.r);
  ctx.stroke();
  ctx.lineWidth = 36;
  ctx.strokeStyle = P.beltRail;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  rrect(x - 17, y - 17, b.w + 34, b.h + 34, b.r + 17);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,31,26,.35)';
  rrect(x + 15, y + 15, b.w - 30, b.h - 30, Math.max(4, b.r - 15));
  ctx.stroke();
  // Rubber track.
  ctx.lineWidth = 26;
  ctx.strokeStyle = P.beltTrack;
  rrect(x, y, b.w, b.h, b.r);
  ctx.stroke();
  // Chevron tread: short angled strokes along the path, scrolling with the plates.
  ctx.lineWidth = 2;
  ctx.strokeStyle = P.beltDash;
  ctx.lineCap = 'round';
  const step = 16 / b.total;
  const off = phase % step;
  for (let t = -off; t < 1; t += step) {
    const tt = ((t % 1) + 1) % 1;
    const p = b.pointAt(tt),
      q = b.pointAt((tt + 0.004) % 1);
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(2, 0);
    ctx.lineTo(-4, 8);
    ctx.stroke();
    ctx.restore();
  }
  // Rollers at the four corners.
  ctx.lineWidth = 2;
  // Rollers sit on the track at the middle of each corner arc.
  const d = b.r * Math.SQRT1_2;
  for (const [cx, cy] of [
    [x + b.r - d, y + b.r - d],
    [x + b.w - b.r + d, y + b.r - d],
    [x + b.w - b.r + d, y + b.h - b.r + d],
    [x + b.r - d, y + b.h - b.r + d],
  ]) {
    ctx.fillStyle = P.beltRail;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 2.2, 0, 7);
    ctx.fill();
  }
  // The lanterns' warm reflection on the top rail.
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = P.glow;
  ctx.globalAlpha = 0.28 + G.glowPulse * 0.12;
  ctx.beginPath();
  ctx.moveTo(x + b.r + 10, y - 12);
  ctx.lineTo(x + b.w - b.r - 10, y - 12);
  ctx.stroke();
  ctx.restore();
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
  const P = activeTheme().palette;
  drawConveyor(b, P, L.beltPhase);
  txt(
    t('hud.belt', { a: L.belt.length, b: L.beltCap }),
    405,
    decorOf(activeTheme().id).some((d) => d.slot === 'band' && S.decor.includes(d.id)) ? 248 : 212,
    13,
    800,
    L.belt.length >= L.beltCap - 1 ? '#E5484D' : '#8A8378',
    'right',
    'middle'
  );
  if (L.rushT > 0 || L.reversed) {
    const rush = L.rushT > 0;
    const pulse = reducedMotion() ? 1 : 0.8 + 0.2 * Math.sin(gt * 8);
    ctx.save();
    ctx.globalAlpha = pulse;
    txt(
      rush ? t('hud.rush', { s: Math.ceil(L.rushT) }) : t('hud.reverse'),
      240,
      205,
      16,
      800,
      rush ? '#E5484D' : '#3E7BFA',
      'center',
      'middle'
    );
    if (rush && L.reversed) txt(t('hud.reverse'), 240, 226, 13, 800, '#3E7BFA', 'center', 'middle');
    ctx.restore();
  } else {
    // The sign slot: a glowing house sign when the restaurant's sign piece is owned, else the plain brand.
    const sign = decorOf(activeTheme().id).find((d) => d.slot === 'sign' && S.decor.includes(d.id));
    if (sign) {
      const glow = sign.id === 'neon' ? '#FF3FA4' : P.accent;
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 18 + Math.sin(gt * 6) * 4;
      txt(t('app.brand'), 240, 268, 30, 800, glow, 'center', 'middle');
      ctx.shadowBlur = 0;
      txt(t('app.brand'), 240, 268, 30, 800, 'rgba(255,255,255,.75)', 'center', 'middle');
      ctx.restore();
    } else txt(t('app.brand'), 240, 205, 15, 800, P.brand, 'center', 'middle');
  }
}

let steamAt = 0;

/** Plates ride the belt; on the corners they wobble a little, and every few seconds a hot one lets off steam. */
export function drawPlatesOnBelt(): void {
  const L = cur(),
    b = BELT,
    gt = G.gt,
    reduced = reducedMotion();
  const onBelt = L.belt.filter((p) => p.state === 'belt');
  if (!reduced && gt - steamAt > 2.6 && onBelt.length) {
    steamAt = gt;
    const hot = onBelt.filter((p) => !p.covered)[Math.floor(gt * 7) % Math.max(1, onBelt.length)];
    if (hot) {
      const q = b.pointAt(hot.t);
      particles.emit('steam', q.x + 2, q.y - 14, 3);
    }
  }
  for (const p of onBelt) {
    const q = b.pointAt(p.t);
    const corner = Math.abs(q.x - b.cx) > b.w / 2 - b.r - 1 && Math.abs(q.y - b.cy) > b.h / 2 - b.r - 1;
    if (corner && !reduced) {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(Math.sin(gt * 14 + p.t * 40) * 0.07);
      drawPlate(0, 0, p, 15, { timer: p.timer, timerMax: 1.6 / L.speed });
      ctx.restore();
    } else drawPlate(q.x, q.y, p, 15, { timer: p.timer, timerMax: 1.6 / L.speed });
  }
}

/** The lanterns light the top of nearby sprites: a warm overlay that breathes with the glow pulse. */
export function drawLanternLight(): void {
  const P = activeTheme().palette;
  const th = activeTheme();
  const lit = decorOf(th.id).some((d) => d.slot === 'hang' && S.decor.includes(d.id));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const spots: [number, number, number][] = [[240, 108, 150]];
  if (lit) spots.push([18, 120, 120], [462, 120, 120]);
  for (const [x, y, r] of spots) {
    const g = ctx.createRadialGradient(x, y, 6, x, y, r);
    g.addColorStop(0, `rgba(255,179,92,${0.22 + G.glowPulse * 0.12})`);
    g.addColorStop(1, 'rgba(255,179,92,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  void P;
}

export function drawKitchen(): void {
  const L = cur(),
    k = KITCHEN;
  ctx.save();
  ctx.shadowColor = 'rgba(18,26,58,.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  wood(k.x, k.y, k.w, k.h, 12, UI.woodDark);
  ctx.shadowColor = 'transparent';
  // Warm light inside the hatch.
  const warm = ctx.createRadialGradient(k.x + k.w / 2, k.y + 40, 6, k.x + k.w / 2, k.y + 40, k.w * 0.6);
  warm.addColorStop(0, 'rgba(255,179,92,.42)');
  warm.addColorStop(1, 'rgba(255,179,92,0)');
  ctx.fillStyle = warm;
  rrect(k.x + 3, k.y + 3, k.w - 6, k.h - 6, 10);
  ctx.fill();
  // The ledge the next-up plates sit on.
  ctx.fillStyle = UI.wood;
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 1.5;
  rrect(k.x + 12, k.y + 54, 110, 8, 3);
  ctx.fill();
  ctx.stroke();
  // Red noren valance across the top with scalloped panels.
  ctx.fillStyle = UI.lacquer;
  rrect(k.x, k.y, k.w, 22, 12);
  ctx.fill();
  ctx.fillRect(k.x, k.y + 12, k.w, 10);
  ctx.fillStyle = UI.lacquerDark;
  for (let x = k.x + 8; x < k.x + k.w - 8; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, k.y + 22);
    ctx.quadraticCurveTo(x + 12, k.y + 30, x + 24, k.y + 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(k.x + 8, k.y + 2, k.w - 16, 2);
  txt(t('hud.kitchen'), k.x + 12, k.y + 11, 12, 800, UI.rice, 'left', 'middle', '-0.3px');
  const vis = L.kitchen.slice(0, L.visibleNext);
  vis.forEach((p, i) => drawPlate(k.x + 30 + i * 34, k.y + 46, p, 12, { showHidden: true }));
  for (let i = vis.length; i < 3 && i < L.kitchen.length; i++) {
    ctx.fillStyle = 'rgba(42,31,26,.55)';
    ctx.strokeStyle = UI.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(k.x + 30 + i * 34, k.y + 46, 12, 0, 7);
    ctx.fill();
    ctx.stroke();
    txt('?', k.x + 30 + i * 34, k.y + 47, 15, 800, UI.cream, 'center', 'middle');
  }
  txt(t('hud.platesLeft', { n: L.kitchen.length }), k.x + k.w - 14, k.y + 46, 14, 800, UI.rice, 'right', 'middle');
  ctx.restore();
}

export function drawSeats(): void {
  const L = cur();
  const reduced = reducedMotion();
  const sh = L.seatShake > 0 && !reduced ? Math.sin(L.elapsed * 60) * 4 * L.seatShake : 0;
  // Chained pair: a chain drawn between the two stools, the back stool one step behind.
  const front = L.seats[0],
    back = L.seats[1];
  if (front && back && back.chain === 2) {
    ctx.save();
    ctx.translate(sh, 0);
    ctx.strokeStyle = '#8A8378';
    ctx.lineWidth = 3;
    const y = SEAT_Y + 16;
    for (let i = 0; i < 4; i++) {
      const x = front.x + 18 + ((back.x - front.x - 36) * (i + 0.5)) / 4;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4.5, i % 2 ? Math.PI / 2 : 0, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
  }
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
    if (s.reserved >= 0) {
      // Reserved: a table card with the colour's glyph on a little stand beside the stool.
      const col = COLORS[s.reserved];
      ctx.fillStyle = '#5A4E45';
      ctx.fillRect(s.x + 24, s.y - 6, 2, 22);
      ctx.fillStyle = '#FFFDF7';
      ctx.strokeStyle = col.hex;
      ctx.lineWidth = 2;
      rrect(s.x + 14, s.y - 22, 22, 18, 4);
      ctx.fill();
      ctx.stroke();
      glyph(s.x + 25, s.y - 13, col.glyph, 10, col.hex);
    }
    if (s.chain === 2) {
      ctx.fillStyle = 'rgba(42,35,32,.55)';
      txt(t('hud.waitSeat'), s.x, s.y + 30, 9, 800, '#FFF7E8', 'center', 'middle');
    }
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
  const P = activeTheme().palette;
  ctx.fillStyle = P.gridMat;
  rrect(L.gx - 8, L.gy - 8, gw + 16, gh + 16, 14);
  ctx.fill();
  ctx.strokeStyle = P.gridLine;
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
    ctx.fillStyle = 'rgba(18,26,58,.92)';
    rrect(240 - w / 2, y - 15, w, 30, 15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,234,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(t.text, 240, y + 1, 15, 800, UI.rice, 'center', 'middle');
    ctx.restore();
    y += 36;
  }
}

export { COLORS };
