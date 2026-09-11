/* Canvas primitives in the izakaya language: text in Baloo 2 with chocolate on cream and rice white on red or
   indigo, the lacquer tray that every card sits on, ink stamps, paper slips, the coin bowl, the little lantern.
   Geometry is unchanged from the flat kit: every caller's positions still hold. */

import { GOLD, H, W, type GlyphType } from '../data/constants';
import { isRTL } from '../i18n';
import { ctx } from './canvas';

export const FONT = '"Baloo 2","Trebuchet MS",sans-serif';
/** The palette the chrome is allowed to use (docs/style-guide.md). */
export const UI = {
  lacquer: '#C8323B',
  lacquerDark: '#8F1F27',
  rice: '#FFF8EA',
  cream: '#F5E9D2',
  indigo: '#1E2A5A',
  indigoDark: '#121A3A',
  wood: '#B9773E',
  woodDark: '#7A4A22',
  bamboo: '#9CB46B',
  gold: GOLD,
  ink: '#2A1F1A',
  glow: '#FFB35C',
  muted: '#8A8378',
  body: '#5A4E45',
};

export function rrect(x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

type Ctx2 = CanvasRenderingContext2D & { letterSpacing?: string };

export function txt(
  s: string | number,
  x: number,
  y: number,
  size: number,
  weight?: number,
  color?: string,
  align?: CanvasTextAlign,
  base?: CanvasTextBaseline,
  spacing?: string
): void {
  const c = ctx as Ctx2;
  c.font = `${weight || 700} ${size}px ${FONT}`;
  c.direction = isRTL() ? 'rtl' : 'ltr';
  if ('letterSpacing' in c) c.letterSpacing = spacing || '0px';
  c.fillStyle = color || UI.ink;
  c.textAlign = align || 'left';
  c.textBaseline = base || 'alphabetic';
  c.fillText(String(s), x, y);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

export function textW(s: string | number, size: number, weight?: number): number {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  return ctx.measureText(String(s)).width;
}

export function inRect(x: number, y: number, b: { x: number; y: number; w: number; h: number }): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f),
    g = Math.round(((n >> 8) & 255) * f),
    b = Math.round((n & 255) * f);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

/** Mix a hex colour toward white (t > 0) or black (t < 0). */
export function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const m = t >= 0 ? v + (255 - v) * t : v * (1 + t);
    return Math.max(0, Math.min(255, Math.round(m)));
  };
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

export function glyph(x: number, y: number, type: GlyphType, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (type) {
    case 'circle':
      ctx.arc(0, 0, s * 0.55, 0, 7);
      break;
    case 'square':
      ctx.rect(-s * 0.48, -s * 0.48, s * 0.96, s * 0.96);
      break;
    case 'triangle':
      ctx.moveTo(0, -s * 0.62);
      ctx.lineTo(s * 0.6, s * 0.45);
      ctx.lineTo(-s * 0.6, s * 0.45);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -s * 0.68);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(0, s * 0.68);
      ctx.lineTo(-s * 0.5, 0);
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          rr = i % 2 ? s * 0.3 : s * 0.68;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      break;
    case 'hex':
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
      }
      ctx.closePath();
      break;
    case 'heart':
      ctx.moveTo(0, s * 0.62);
      ctx.bezierCurveTo(-s * 0.95, -s * 0.05, -s * 0.48, -s * 0.75, 0, -s * 0.28);
      ctx.bezierCurveTo(s * 0.48, -s * 0.75, s * 0.95, -s * 0.05, 0, s * 0.62);
      break;
  }
  ctx.fill();
  ctx.restore();
}

/** A gold coin: outlined, a rim, a highlight. */
export function coinIcon(x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, 7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, -0.7, 0, 7);
  ctx.fill();
  ctx.restore();
}

/** Lacquer surface: a gradient lit from the top, a base shade, a top highlight line and a chocolate edge. */
export function lacquer(x: number, y: number, w: number, h: number, r: number, color: string, pressed = false): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, tint(color, pressed ? -0.1 : 0.16));
  g.addColorStop(0.55, pressed ? tint(color, -0.18) : color);
  g.addColorStop(1, tint(color, pressed ? -0.32 : -0.22));
  ctx.fillStyle = g;
  rrect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!pressed) {
    ctx.strokeStyle = 'rgba(255,255,255,.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y + 3);
    ctx.lineTo(x + w - r, y + 3);
    ctx.stroke();
  }
}

/** Wood surface: matte, two grain lines, a lit top edge, a chocolate edge. */
export function wood(x: number, y: number, w: number, h: number, r: number, color = UI.wood, pressed = false): void {
  ctx.fillStyle = pressed ? tint(color, -0.18) : color;
  rrect(x, y, w, h, r);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(42,31,26,.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.35);
  ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.28, x + w, y + h * 0.4);
  ctx.moveTo(x, y + h * 0.72);
  ctx.quadraticCurveTo(x + w * 0.55, y + h * 0.8, x + w, y + h * 0.66);
  ctx.stroke();
  if (!pressed) {
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x, y, w, 3);
  }
  ctx.restore();
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  rrect(x, y, w, h, r);
  ctx.stroke();
}

/** Paper surface: cream, a faint fold line, a soft edge. */
export function paper(x: number, y: number, w: number, h: number, r: number, color = UI.cream, pressed = false): void {
  ctx.fillStyle = pressed ? tint(color, -0.08) : color;
  rrect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,31,26,.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,31,26,.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y + h * 0.62);
  ctx.lineTo(x + w * 0.88, y + h * 0.6);
  ctx.stroke();
}

/** A card: a lacquer tray with a cream paper inset and a red lacquer header strip with a wood-block texture,
    cast on the counter with a drop shadow. The head colour is the strip's lacquer. Same geometry as before. */
export function card(x: number, y: number, w: number, h: number, headColor: string, title: string): void {
  ctx.save();
  ctx.shadowColor = 'rgba(18,26,58,.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = UI.woodDark;
  rrect(x, y, w, h, 20);
  ctx.fill();
  ctx.restore();
  // Tray edge: chocolate outline and a rounded highlight along the top-left.
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2.5;
  rrect(x, y, w, h, 20);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  rrect(x + 3, y + 3, w - 6, h - 6, 17);
  ctx.stroke();
  // Paper inset.
  ctx.fillStyle = UI.rice;
  rrect(x + 8, y + 8, w - 16, h - 16, 14);
  ctx.fill();
  // Header strip: lacquer with a subtle wood-block texture.
  ctx.save();
  rrect(x + 8, y + 8, w - 16, 56, 14);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y + 8, 0, y + 64);
  g.addColorStop(0, tint(headColor, 0.14));
  g.addColorStop(0.6, headColor);
  g.addColorStop(1, tint(headColor, -0.2));
  ctx.fillStyle = g;
  ctx.fillRect(x + 8, y + 8, w - 16, 56);
  ctx.strokeStyle = 'rgba(42,31,26,.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 16 + i * 9);
    ctx.bezierCurveTo(
      x + w * 0.3,
      y + 12 + i * 9 + (i % 2) * 4,
      x + w * 0.7,
      y + 20 + i * 9 - (i % 3) * 3,
      x + w - 8,
      y + 16 + i * 9
    );
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(x + 8, y + 10, w - 16, 2.5);
  ctx.restore();
  ctx.fillStyle = UI.rice;
  ctx.fillRect(x + 8, y + 52, w - 16, 14);
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 64);
  ctx.lineTo(x + w - 8, y + 64);
  ctx.stroke();
  txt(title, x + w / 2, y + 36, 26, 800, UI.rice, 'center', 'middle');
}

/** An ink stamp: a rounded outline in the colour, slightly rotated, the label inside. Returns the width. */
export function stamp(label: string, x: number, y: number, color: string, size = 13, rotate = -0.04): number {
  const w = textW(label, size, 800) + 22;
  ctx.save();
  ctx.translate(x + w / 2, y + 12);
  ctx.rotate(rotate);
  ctx.fillStyle = 'rgba(255,248,234,.85)';
  rrect(-w / 2, -12, w, 24, 6);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  rrect(-w / 2 + 3, -9, w - 6, 18, 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  txt(label, 0, 1, size, 800, color, 'center', 'middle', '-0.5px');
  ctx.restore();
  return w;
}

/** A paper order slip with a metal clip, for the HUD level label. */
export function orderSlip(x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.025);
  ctx.fillStyle = 'rgba(42,31,26,.28)';
  rrect(-w / 2 + 2, -h / 2 + 3, w, h, 4);
  ctx.fill();
  paper(-w / 2, -h / 2, w, h, 4, UI.cream);
  // Clip.
  ctx.fillStyle = '#9AA3AD';
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 1.5;
  rrect(-w / 2 + 10, -h / 2 - 6, 22, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(-w / 2 + 12, -h / 2 - 5, 18, 2);
  ctx.restore();
}

/** A lacquer coin bowl with gold coins peeking over the rim. */
export function coinBowl(x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(42,31,26,.3)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + r * 0.9, r * 1.2, r * 0.32, 0, 0, 7);
  ctx.fill();
  coinIcon(x - r * 0.35, y - r * 0.2, r * 0.55);
  coinIcon(x + r * 0.4, y - r * 0.3, r * 0.55);
  coinIcon(x, y - r * 0.5, r * 0.55);
  const g = ctx.createLinearGradient(0, y, 0, y + r);
  g.addColorStop(0, tint(UI.lacquer, 0.12));
  g.addColorStop(1, UI.lacquerDark);
  ctx.fillStyle = g;
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.9, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = tint(UI.lacquer, 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.3, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.5, y + r * 0.25, r * 0.28, r * 0.1, -0.4, 0, 7);
  ctx.fill();
  ctx.restore();
}

/** A small paper lantern; glow 0..1 sets how brightly it burns. */
export function lanternIcon(x: number, y: number, r: number, glow: number): void {
  ctx.save();
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.4);
    g.addColorStop(0, `rgba(255,179,92,${0.55 * glow})`);
    g.addColorStop(1, 'rgba(255,179,92,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = UI.ink;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - r * 0.4, y - r * 1.25, r * 0.8, r * 0.3);
  ctx.strokeRect(x - r * 0.4, y - r * 1.25, r * 0.8, r * 0.3);
  ctx.fillRect(x - r * 0.4, y + r * 0.95, r * 0.8, r * 0.3);
  ctx.strokeRect(x - r * 0.4, y + r * 0.95, r * 0.8, r * 0.3);
  const body = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r * 1.1);
  body.addColorStop(0, tint(UI.glow, 0.2 * glow));
  body.addColorStop(0.5, tint(UI.lacquer, 0.25 * glow));
  body.addColorStop(1, UI.lacquerDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.85, r, 0, 0, 7);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,31,26,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y - r * 0.35);
  ctx.lineTo(x + r * 0.8, y - r * 0.35);
  ctx.moveTo(x - r * 0.8, y + r * 0.35);
  ctx.lineTo(x + r * 0.8, y + r * 0.35);
  ctx.stroke();
  ctx.restore();
}

export function dim(a?: number): void {
  ctx.fillStyle = `rgba(18,26,58,${a == null ? 0.62 : a})`;
  ctx.fillRect(0, 0, W, H);
}

export function wrapText(text: string, x: number, y: number, maxW: number, size: number, color: string): number {
  const words = text.split(' ');
  let line = '',
    yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (textW(test, size, 700) > maxW && line) {
      txt(line, x, yy, size, 700, color, 'center', 'middle');
      line = w;
      yy += size + 6;
    } else line = test;
  }
  if (line) txt(line, x, yy, size, 700, color, 'center', 'middle');
  return yy + size + 6;
}
