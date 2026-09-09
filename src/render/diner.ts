import { reducedMotion } from '../anim/motion';
import { characterSvg, type DinerSpriteState } from '../art/characters';
import { sprite } from '../art/svg';
import { COLORS, GOLD } from '../data/constants';
import { activeTheme } from '../data/theme-state';
import { isLocked } from '../engine/rules';
import { G, cur } from '../engine/state';
import type { Diner, ExprType } from '../engine/types';
import { easeBack } from '../engine/util';
import { t } from '../i18n';
import { S } from '../meta/save';
import { fillPattern } from './patterns';
import { ctx } from './canvas';
import { drawDinerProcedural } from './diner-fallback';
import { drawPlate } from './plate';
import { glyph, rrect, txt } from './primitives';

export type DinerMode = 'grid' | 'seat' | 'free';

/** Sprite box per unit of body radius: the body is 36 units of a 100 unit box. */
export const SPRITE_BOX = 100 / 36;

function spriteState(d: Diner, expr: ExprType, blink: boolean): DinerSpriteState {
  if (d.state === 'walking') return 'walk';
  if (expr === 'chew') return Math.floor(G.gt * 12) % 2 ? 'idle' : 'chew';
  if (expr === 'happy') return 'happy';
  if (expr === 'grumpy') return 'grumpy';
  return blink ? 'blink' : 'idle';
}

/** Draw a character sprite centred on the origin with body radius r. Returns false if not decoded yet. */
export function drawCharacter(color: number, state: DinerSpriteState, vip: boolean, r: number, dim = false): boolean {
  const box = Math.round(r * SPRITE_BOX);
  const outfit = activeTheme().outfit;
  const img = sprite(
    `c${color}:${state}:${outfit}${vip ? ':v' : ''}${dim ? ':d' : ''}`,
    () => characterSvg(color, state, vip, dim, outfit),
    box,
    box
  );
  if (!img) return false;
  ctx.drawImage(img, -box / 2, -box * 0.56, box, box);
  return true;
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
  const reduced = reducedMotion();
  let bob = 0;
  if (!reduced) {
    if (mode === 'grid' && !d.bumping) bob = Math.sin(gt * 2.2 + d.id) * 1.4;
    if (d.state === 'leaving') bob = -Math.abs(Math.sin(d.leaveT * 14)) * 7;
  }
  ctx.save();
  ctx.globalAlpha = d.alpha;
  ctx.translate(d.x, d.y + bob);
  if (d.shake > 0 && !reduced) {
    const w = Math.sin(gt * 55) * 6 * d.shake;
    ctx.translate(w * (d.shakeX || 0), w * (d.shakeY || 0));
    ctx.rotate(w * 0.02);
  }
  ctx.scale(sc, sc);
  if (mode === 'grid' && d.movable) {
    ctx.strokeStyle = `rgba(255,255,255,${reduced ? 0.85 : 0.5 + 0.4 * Math.sin(L.elapsed * 5)})`;
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
  const dimmed = (mode === 'grid' && !d.movable) || d.waiting;
  const state = spriteState(d, expr, blink);
  ctx.save();
  // Lean and squash are set by the tween manager; scale around the body's base so squash reads as weight.
  if (d.lean) ctx.rotate(d.lean);
  if (state === 'walk' && !reduced) ctx.rotate(Math.sin(gt * 18) * 0.06);
  if (d.sx !== 1 || d.sy !== 1) {
    ctx.translate(0, r);
    ctx.scale(d.sx, d.sy);
    ctx.translate(0, -r);
  }
  if (!drawCharacter(d.color, state, d.vip, r, dimmed)) drawDinerProcedural(d.color, r, expr, blink, dimmed);
  if (S.colorblind) fillPattern(ctx, d.color, () => ctx.arc(0, 0, r * 0.92, 0, 7));
  ctx.restore();
  // Colour badge with the shape glyph: the accessibility cue, always drawn.
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(-r * 0.7, -r * 0.7, r * 0.32, 0, 7);
  ctx.fill();
  glyph(-r * 0.7, -r * 0.7, col.glyph, r * 0.4, col.hex);
  if (mode === 'grid') {
    const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d.dir];
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(42,35,32,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 1.02, 0);
    ctx.lineTo(r * 0.62, -r * 0.34);
    ctx.lineTo(r * 0.72, 0);
    ctx.lineTo(r * 0.62, r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#2A2320';
    ctx.beginPath();
    ctx.arc(r * 0.66, r * 0.66, r * 0.36, 0, 7);
    ctx.fill();
    txt(d.need, r * 0.66, r * 0.7, r * 0.62, 800, '#fff', 'center', 'middle');
    if (d.seq && d.seq.length) drawTicket(d, r);
    if (d.lockColor >= 0 && isLocked(d)) {
      ctx.fillStyle = 'rgba(42,35,32,.92)';
      rrect(-r * 0.5, -r * 1.35, r, r * 0.62, r * 0.12);
      ctx.fill();
      ctx.strokeStyle = '#FFF7E8';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 1.35, r * 0.16, Math.PI, 0);
      ctx.stroke();
      glyph(r * 0.18, -r * 1.04, COLORS[d.lockColor].glyph, r * 0.38, COLORS[d.lockColor].hex);
    }
    if (d.ice > 0) {
      ctx.fillStyle = 'rgba(160,215,255,.55)';
      rrect(-r * 1.05, -r * 1.15, r * 2.1, r * 2.2, r * 0.35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      rrect(-r * 1.05, -r * 1.15, r * 2.1, r * 2.2, r * 0.35);
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
    if (d.waiting)
      txt('…', 0, 0, 18, 800, '#8A8378', 'center', 'middle'); // i18n-ignore
    else if (d.seq && d.seq.length) {
      // Ticket guest: the colours still to come, in order, the next one ringed.
      const left = d.seq.slice(d.seq.length - Math.max(0, d.need));
      const step = Math.min(13, 52 / Math.max(1, left.length));
      const x0 = (-(left.length - 1) * step) / 2;
      left.forEach((c, i) => {
        drawPlate(x0 + i * step, 0, { color: c }, 5.5);
        if (i === 0) {
          ctx.strokeStyle = '#2A2320';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x0, 0, 7.5, 0, 7);
          ctx.stroke();
        }
      });
    } else {
      drawPlate(-13, 0, { color: d.color, vip: d.vip }, 9);
      txt('×' + Math.max(0, d.need), 14, 1, 16, 800, '#2A2320', 'center', 'middle');
    }
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
    txt(t('hud.paid'), 0, 1, 17, 800, '#E5484D', 'center', 'middle');
    ctx.restore();
  }
}

/** Ticket above a picky guest's head: the ticket number and the colour sequence. Origin at the diner. */
export function drawTicket(d: { seq?: number[]; picky?: number }, r: number): void {
  const seq = d.seq || [];
  const dot = r * 0.15,
    step = r * 0.34;
  const w = r * 0.55 + seq.length * step + r * 0.2,
    h = r * 0.5;
  const x = -w / 2,
    y = -r * 1.38;
  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = '#2A2320';
  ctx.lineWidth = 1;
  rrect(x, y, w, h, r * 0.1);
  ctx.fill();
  ctx.stroke();
  txt(String((d.picky ?? 0) + 1), x + r * 0.3, y + h / 2 + 0.5, r * 0.36, 800, '#2A2320', 'center', 'middle');
  seq.forEach((c, i) => {
    ctx.fillStyle = COLORS[c].hex;
    ctx.beginPath();
    ctx.arc(x + r * 0.62 + i * step + dot, y + h / 2, dot, 0, 7);
    ctx.fill();
  });
}
