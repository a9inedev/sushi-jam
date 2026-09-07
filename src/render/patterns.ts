/* Colour-blind pattern fills: one tile per plate colour, drawn in translucent ink over a clipped shape so the
   seven colours can also be told apart by texture. Tiles are built once and cached as canvas patterns. */

const cache: (CanvasPattern | null | undefined)[] = [];

export const PATTERN_NAMES = ['dots', 'vertical', 'diagonal', 'crosshatch', 'horizontal', 'checker', 'rings'];

function tile(i: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.strokeStyle = g.fillStyle = 'rgba(42,35,32,.34)';
  g.lineWidth = 2;
  g.lineCap = 'round';
  switch (i % 7) {
    case 0:
      g.beginPath();
      g.arc(6, 6, 2.2, 0, 7);
      g.fill();
      break;
    case 1:
      g.fillRect(5, 0, 2.5, 12);
      break;
    case 2:
      g.beginPath();
      g.moveTo(-2, 14);
      g.lineTo(14, -2);
      g.stroke();
      break;
    case 3:
      g.beginPath();
      g.moveTo(-2, 14);
      g.lineTo(14, -2);
      g.moveTo(-2, -2);
      g.lineTo(14, 14);
      g.stroke();
      break;
    case 4:
      g.fillRect(0, 5, 12, 2.5);
      break;
    case 5:
      g.fillStyle = 'rgba(42,35,32,.22)';
      g.fillRect(0, 0, 6, 6);
      g.fillRect(6, 6, 6, 6);
      break;
    default:
      g.beginPath();
      g.arc(6, 6, 3.8, 0, 7);
      g.stroke();
      break;
  }
  return c;
}

export function colourPattern(ctx: CanvasRenderingContext2D, i: number): CanvasPattern | null {
  if (cache[i] !== undefined) return cache[i] as CanvasPattern | null;
  try {
    cache[i] = ctx.createPattern(tile(i), 'repeat');
  } catch {
    cache[i] = null;
  }
  return cache[i] as CanvasPattern | null;
}

/** Fill the shape built by `path` (in the current transform) with the colour's pattern. */
export function fillPattern(ctx: CanvasRenderingContext2D, i: number, path: () => void): void {
  const p = colourPattern(ctx, i);
  if (!p) return;
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  ctx.fillStyle = p;
  ctx.fillRect(-300, -300, 600, 600);
  ctx.restore();
}
