/* The ceramic plate as a sprite: disc, coloured rim, inner lip, optional VIP ring and double-decker stack,
   with a soft shadow baked in so the belt never needs a canvas shadow blur per plate. Plate radius is 38
   units of the 100 unit box, so a plate of radius r draws in a box of r * 100 / 38. */

import { COLORS, GOLD } from '../data/constants';

const HEAD = 'http://www.w3.org/2000/svg';
export const PLATE_BOX = 100 / 38;

export function plateBaseSvg(color: number, vip = false, double = false): string {
  const hex = (COLORS[color] || COLORS[0]).hex;
  const disc = (cy: number) =>
    `<circle cx="50" cy="${cy}" r="38" fill="#FFFDF7"/><circle cx="50" cy="${cy}" r="32" fill="none" stroke="${hex}" stroke-width="10.6"/>`;
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">` +
    `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>` +
    `<ellipse cx="50" cy="${double ? 66 : 55}" rx="38" ry="${double ? 10 : 8}" fill="#000" opacity=".22" filter="url(#sh)"/>` +
    (double
      ? `<circle cx="50" cy="60.6" r="38" fill="#E8E0CC"/><circle cx="50" cy="60.6" r="32" fill="none" stroke="${hex}" stroke-width="8.4"/>`
      : '') +
    disc(50) +
    `<circle cx="50" cy="50" r="25" fill="none" stroke="#2A2320" stroke-opacity=".08" stroke-width="2.3"/>` +
    (vip ? `<circle cx="50" cy="50" r="19" fill="none" stroke="${GOLD}" stroke-width="3.8"/>` : '') +
    `</svg>`
  );
}
