import { GOLD, H, W, type GlyphType } from '../data/constants';
import { ctx } from './canvas';

export const FONT = '"Baloo 2","Trebuchet MS",sans-serif';

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

export function txt(
  s: string | number,
  x: number,
  y: number,
  size: number,
  weight?: number,
  color?: string,
  align?: CanvasTextAlign,
  base?: CanvasTextBaseline
): void {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = color || '#000';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = base || 'alphabetic';
  ctx.fillText(String(s), x, y);
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

export function coinIcon(x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, 7);
  ctx.stroke();
  ctx.restore();
}

export function card(x: number, y: number, w: number, h: number, headColor: string, title: string): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFF9EE';
  rrect(x, y, w, h, 20);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = headColor;
  rrect(x, y, w, 64, 20);
  ctx.fill();
  ctx.fillStyle = '#FFF9EE';
  ctx.fillRect(x, y + 44, w, 20);
  txt(title, x + w / 2, y + 32, 26, 800, '#fff', 'center', 'middle');
}

export function dim(a?: number): void {
  ctx.fillStyle = `rgba(20,15,10,${a == null ? 0.62 : a})`;
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
