/* Small colour helpers shared by the SVG art builders. Pure. */

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** Linear mix of two hex colours, t in [0,1] toward b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a),
    [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export const lighten = (hex: string, t: number): string => mix(hex, '#FFFFFF', t);
export const darken = (hex: string, t: number): string => mix(hex, '#000000', t);

/** The style guide's ink colour, used for soft outlines and features. */
export const INK = '#2A1F1A';
