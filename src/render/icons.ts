import { COLORS, GOLD } from '../data/constants';
import { makeDiner } from '../engine/rules';
import { G } from '../engine/state';
import type { BoosterKind, MechKind } from '../engine/types';
import { ctx } from './canvas';
import { drawCharacter, drawDiner } from './diner';
import { drawDinerProcedural } from './diner-fallback';
import { drawPlate } from './plate';
import { glyph, rrect } from './primitives';

export function drawBoosterIcon(kind: BoosterKind, r: number, dis: boolean): void {
  const fg = dis ? 'rgba(255,255,255,.8)' : '#FFF7E8';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'vip') {
    ctx.fillStyle = dis ? '#9A9388' : '#7A4B22';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.58, r * 0.26, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.34);
    ctx.lineTo(-r * 0.5, r * 0.72);
    ctx.moveTo(r * 0.38, r * 0.34);
    ctx.lineTo(r * 0.5, r * 0.72);
    ctx.moveTo(0, r * 0.44);
    ctx.lineTo(0, r * 0.74);
    ctx.stroke();
    ctx.fillStyle = dis ? '#D6CFC2' : GOLD;
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, -r * 0.02);
    ctx.lineTo(-r * 0.32, -r * 0.52);
    ctx.lineTo(-r * 0.13, -r * 0.24);
    ctx.lineTo(0, -r * 0.66);
    ctx.lineTo(r * 0.13, -r * 0.24);
    ctx.lineTo(r * 0.32, -r * 0.52);
    ctx.lineTo(r * 0.44, -r * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dis ? '#B9B2A5' : '#E5484D';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.07, 0, 7);
    ctx.fill();
  } else if (kind === 'takeout') {
    ctx.strokeStyle = '#D9A066';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.15);
    ctx.lineTo(r * 0.5, -r * 0.74);
    ctx.moveTo(r * 0.24, -r * 0.12);
    ctx.lineTo(r * 0.64, -r * 0.66);
    ctx.stroke();
    ctx.fillStyle = fg;
    rrect(-r * 0.52, -r * 0.22, r * 1.04, r * 0.82, 3);
    ctx.fill();
    ctx.fillStyle = dis ? '#B9B2A5' : '#E5484D';
    ctx.fillRect(-r * 0.52, r * 0.1, r * 1.04, r * 0.15);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 0.22, r * 0.3, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = dis ? '#9A9388' : '#3A302A';
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 0.22, r * 0.06, 0, 7);
    ctx.fill();
  } else {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, r * 0.06, r * 0.7, Math.PI * 1.15, Math.PI * 0.35, false);
    ctx.stroke();
    const a = Math.PI * 0.35,
      ex = Math.cos(a) * r * 0.7,
      ey = r * 0.06 + Math.sin(a) * r * 0.7,
      tx = -Math.sin(a),
      ty = Math.cos(a);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(ex + tx * r * 0.26, ey + ty * r * 0.26);
    ctx.lineTo(ex - ty * r * 0.2 - tx * r * 0.06, ey + tx * r * 0.2 - ty * r * 0.06);
    ctx.lineTo(ex + ty * r * 0.2 - tx * r * 0.06, ey - tx * r * 0.2 - ty * r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, r * 0.06, r * 0.38, 0, 7);
    ctx.fill();
    ctx.strokeStyle = dis ? '#B9B2A5' : '#E5484D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, r * 0.06, r * 0.26, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Animated icon for a mechanic intro card. */
export function drawMechIcon(kind: MechKind, x: number, y: number): void {
  const gt = G.gt;
  ctx.save();
  ctx.translate(x, y);
  const wob = Math.sin(gt * 3) * 3;
  if (kind === 'wasabi') drawPlate(0, wob, { color: 3, wasabi: true }, 26, { timer: (gt * 0.7) % 1, timerMax: 1 });
  else if (kind === 'covered') drawPlate(0, wob, { color: 0, covered: true, revealed: Math.sin(gt * 2) > 0 }, 26);
  else if (kind === 'vip') drawPlate(0, wob, { color: 4, vip: true }, 26);
  else if (kind === 'double') drawPlate(0, wob, { color: 1, double: true }, 26);
  else if (kind === 'special') drawPlate(0, wob, { color: 0, special: true }, 26);
  else if (kind === 'chain') {
    // Two stools joined by a chain; the back one waits.
    for (const x of [-30, 30]) {
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.beginPath();
      ctx.ellipse(x, 22, 22, 7, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#7A4B22';
      ctx.beginPath();
      ctx.ellipse(x, 14, 20, 9, 0, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = '#8A8378';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-12 + i * 12, 14, 7, 4.5, i % 2 ? Math.PI / 2 : 0, 0, 7);
      ctx.stroke();
    }
    if (!drawCharacter(2, 'idle', false, 15)) drawDinerProcedural(2, 15, 'idle', false, false);
    ctx.save();
    ctx.translate(30, wob * 0.3);
    if (!drawCharacter(4, 'idle', false, 15, true)) drawDinerProcedural(4, 15, 'idle', false, true);
    ctx.restore();
  } else if (kind === 'rush') {
    // A clock running fast, with speed lines.
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = '#2A2320';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(8, 0, 26, 0, 7);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(8 + Math.cos(a) * 21, Math.sin(a) * 21);
      ctx.lineTo(8 + Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.stroke();
    }
    const hand = gt * 5;
    ctx.strokeStyle = '#E5484D';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8 + Math.cos(hand) * 18, Math.sin(hand) * 18);
    ctx.stroke();
    ctx.strokeStyle = '#2A2320';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8 + Math.cos(hand / 12) * 12, Math.sin(hand / 12) * 12);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(42,35,32,.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-42 + ((gt * 40) % 8), -12 + i * 12);
      ctx.lineTo(-26 + ((gt * 40) % 8), -12 + i * 12);
      ctx.stroke();
    }
  } else if (kind === 'reserved') {
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath();
    ctx.ellipse(-8, 24, 24, 8, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#7A4B22';
    ctx.beginPath();
    ctx.ellipse(-8, 16, 22, 10, 0, 0, 7);
    ctx.fill();
    const col = COLORS[1];
    ctx.fillStyle = '#5A4E45';
    ctx.fillRect(22, -4, 3, 26);
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = col.hex;
    ctx.lineWidth = 3;
    rrect(8, -28, 32, 26, 6);
    ctx.fill();
    ctx.stroke();
    glyph(24, -15, col.glyph, 14, col.hex);
    if (!drawCharacter(1, 'happy', false, 15)) drawDinerProcedural(1, 15, 'happy', false, false);
  } else if (kind === 'reverse') {
    ctx.save();
    ctx.rotate(-gt * 2);
    ctx.strokeStyle = '#3E7BFA';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const off of [0, Math.PI]) {
      ctx.beginPath();
      ctx.arc(0, 0, 24, off + 0.3, off + Math.PI - 0.4);
      ctx.stroke();
      const a = off + Math.PI - 0.4;
      const ex = Math.cos(a) * 24,
        ey = Math.sin(a) * 24;
      ctx.fillStyle = '#3E7BFA';
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a + Math.PI / 2) * 9, ey + Math.sin(a + Math.PI / 2) * 9);
      ctx.lineTo(
        ex + Math.cos(a) * 8 - Math.cos(a + Math.PI / 2) * 2,
        ey + Math.sin(a) * 8 - Math.sin(a + Math.PI / 2) * 2
      );
      ctx.lineTo(
        ex - Math.cos(a) * 8 - Math.cos(a + Math.PI / 2) * 2,
        ey - Math.sin(a) * 8 - Math.sin(a + Math.PI / 2) * 2
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawPlate(0, 0, { color: 3 }, 11);
  } else if (kind === 'picky') {
    const fake = makeDiner(
      { r: 0, c: 0, dir: 2, id: 0, color: 2, need: 3, vip: false, lockColor: -1, ice: 0, seq: [2, 0, 4], picky: 0 },
      0,
      wob
    );
    fake.movable = true;
    drawDiner(fake, 24, 'grid');
  } else {
    const fake = makeDiner(
      {
        r: 0,
        c: 0,
        dir: 1,
        id: 0,
        color: kind === 'lock' ? 5 : 6,
        need: 3,
        vip: false,
        lockColor: kind === 'lock' ? 0 : -1,
        ice: kind === 'frozen' ? 2 - (Math.floor(gt) % 3) : 0,
      },
      0,
      wob
    );
    fake.blinkAt = 1e9;
    fake.iceMax = 3;
    drawDiner(fake, 26, 'grid');
  }
  ctx.restore();
}

/** Small line icons used on the HUD buttons. */
export function drawHudIcon(kind: 'map' | 'shop', cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#FFF7E8';
  ctx.fillStyle = '#FFF7E8';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'map') {
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 7);
    ctx.lineTo(cx - 12, cy - 5);
    ctx.lineTo(cx - 4, cy - 8);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.lineTo(cx + 12, cy - 7);
    ctx.lineTo(cx + 12, cy + 5);
    ctx.lineTo(cx + 4, cy + 8);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 8);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.moveTo(cx + 4, cy - 4);
    ctx.lineTo(cx + 4, cy + 8);
    ctx.stroke();
  }
  if (kind === 'shop') {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 3);
    ctx.lineTo(cx + 10, cy - 3);
    ctx.lineTo(cx + 8, cy + 9);
    ctx.lineTo(cx - 8, cy + 9);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 5, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}
