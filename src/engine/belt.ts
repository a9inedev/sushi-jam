/* The conveyor belt is a rounded rectangle traversed clockwise from the top centre. t in [0,1). */

interface LineSeg {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
  start: number;
}
interface ArcSeg {
  type: 'arc';
  cx: number;
  cy: number;
  a1: number;
  a2: number;
  len: number;
  start: number;
}
type Seg = LineSeg | ArcSeg;

export interface BeltPath {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
  total: number;
  pointAt(t: number): { x: number; y: number };
  /** Belt parameter of a point on the bottom straight at screen x (where the seats are). */
  tOfBottomX(x: number): number;
}

export function makePath(cx: number, cy: number, w: number, h: number, r: number): BeltPath {
  const hw = w / 2,
    hh = h / 2;
  const segs: Seg[] = [
    { type: 'line', x1: cx, y1: cy - hh, x2: cx + hw - r, y2: cy - hh, len: 0, start: 0 },
    { type: 'arc', cx: cx + hw - r, cy: cy - hh + r, a1: -Math.PI / 2, a2: 0, len: 0, start: 0 },
    { type: 'line', x1: cx + hw, y1: cy - hh + r, x2: cx + hw, y2: cy + hh - r, len: 0, start: 0 },
    { type: 'arc', cx: cx + hw - r, cy: cy + hh - r, a1: 0, a2: Math.PI / 2, len: 0, start: 0 },
    { type: 'line', x1: cx + hw - r, y1: cy + hh, x2: cx - hw + r, y2: cy + hh, len: 0, start: 0 },
    { type: 'arc', cx: cx - hw + r, cy: cy + hh - r, a1: Math.PI / 2, a2: Math.PI, len: 0, start: 0 },
    { type: 'line', x1: cx - hw, y1: cy + hh - r, x2: cx - hw, y2: cy - hh + r, len: 0, start: 0 },
    { type: 'arc', cx: cx - hw + r, cy: cy - hh + r, a1: Math.PI, a2: 1.5 * Math.PI, len: 0, start: 0 },
    { type: 'line', x1: cx - hw + r, y1: cy - hh, x2: cx, y2: cy - hh, len: 0, start: 0 },
  ];
  let total = 0;
  for (const s of segs) {
    s.len = s.type === 'line' ? Math.hypot(s.x2 - s.x1, s.y2 - s.y1) : r * Math.abs(s.a2 - s.a1);
    s.start = total;
    total += s.len;
  }
  const bottom = segs[4] as LineSeg;
  const first = segs[0] as LineSeg;
  return {
    cx,
    cy,
    w,
    h,
    r,
    total,
    pointAt(t) {
      const d = (((t % 1) + 1) % 1) * total;
      for (const s of segs) {
        if (d <= s.start + s.len + 1e-6) {
          const u = Math.max(0, Math.min(1, (d - s.start) / s.len));
          if (s.type === 'line') return { x: s.x1 + (s.x2 - s.x1) * u, y: s.y1 + (s.y2 - s.y1) * u };
          const a = s.a1 + (s.a2 - s.a1) * u;
          return { x: s.cx + r * Math.cos(a), y: s.cy + r * Math.sin(a) };
        }
      }
      return { x: first.x1, y: first.y1 };
    },
    tOfBottomX(x) {
      const u = (bottom.x1 - x) / (bottom.x1 - bottom.x2);
      return (bottom.start + u * bottom.len) / total;
    },
  };
}

export const BELT = makePath(240, 290, 400, 240, 70);
