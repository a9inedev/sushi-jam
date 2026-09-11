/* The ceramic plate as a sprite, seen from above and a little in front: a rice-white ellipse with a coloured
   glaze rim, a chocolate outline, a specular arc on the rim, an occlusion shadow baked in. Variants: the VIP
   plate on a black lacquer base with a gold rim, the double-decker on a two-tier lacquer stand, the chef's
   special with a four-colour rim. The plate's horizontal radius is 40 units of the 100 unit box, so a plate of
   radius r draws in a box of r * 100 / 40. */

import { COLORS, GOLD } from '../data/constants';
import { INK, darken, lighten } from './color';

const HEAD = 'http://www.w3.org/2000/svg';
export const PLATE_BOX = 100 / 40;
export const RICE_WHITE = '#FFF8EA';
const LACQUER = '#1A1412';

export interface PlateVariant {
  vip?: boolean;
  double?: boolean;
  special?: boolean;
}

/** The shadow every plate sits on. */
function occlusion(cy: number, ry: number, op = 0.26): string {
  return `<ellipse cx="53" cy="${cy}" rx="40" ry="${ry}" fill="${INK}" opacity="${op}" filter="url(#sh)"/>`;
}

/** The dish: ceramic body, glaze rim, inner lip, specular and rim light. cy is the centre line. */
function dish(cy: number, rimStroke: string, ceramic = RICE_WHITE): string {
  return (
    `<ellipse cx="50" cy="${cy}" rx="40" ry="36" fill="${ceramic}" stroke="${INK}" stroke-width="6"/>` +
    `<ellipse cx="50" cy="${cy}" rx="33.5" ry="29.5" fill="none" ${rimStroke} stroke-width="10.4"/>` +
    `<ellipse cx="50" cy="${cy}" rx="25" ry="21" fill="none" stroke="${INK}" stroke-opacity=".12" stroke-width="2"/>` +
    // Ceramic dip: a soft shade at the bottom of the well so the food sits in a dish, not on a disc.
    `<ellipse cx="50" cy="${cy + 5}" rx="22" ry="15" fill="${INK}" opacity=".05"/>` +
    // Specular arc on the top-left of the rim and a rim light on the top-right.
    `<path d="M22 ${cy - 16} Q32 ${cy - 30} 48 ${cy - 31}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3.2" stroke-linecap="round"/>` +
    `<path d="M62 ${cy - 30} Q76 ${cy - 26} 82 ${cy - 14}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2.4" stroke-linecap="round"/>`
  );
}

/** Four rim segments for the chef's special: any ordinary diner may take it. */
function specialRim(cy: number): string {
  const rx = 33.5,
    ry = 29.5;
  let out = '';
  for (let i = 0; i < 4; i++) {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 2,
      a1 = a0 + Math.PI / 2;
    const x0 = (50 + Math.cos(a0) * rx).toFixed(1),
      y0 = (cy + Math.sin(a0) * ry).toFixed(1),
      x1 = (50 + Math.cos(a1) * rx).toFixed(1),
      y1 = (cy + Math.sin(a1) * ry).toFixed(1);
    out += `<path d="M${x0} ${y0} A${rx} ${ry} 0 0 1 ${x1} ${y1}" fill="none" stroke="${COLORS[i].hex}" stroke-width="10.4"/>`;
  }
  return out;
}

export function plateBaseSvg(color: number, vip = false, double = false, special = false): string {
  const hex = (COLORS[color] || COLORS[0]).hex;
  const defs =
    `<defs><filter id="sh" x="-20%" y="-30%" width="140%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter>` +
    `<radialGradient id="lq" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${lighten(LACQUER, 0.3)}"/><stop offset=".55" stop-color="${LACQUER}"/><stop offset="1" stop-color="#000"/></radialGradient>` +
    `<radialGradient id="rd" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${lighten('#8F1F27', 0.2)}"/><stop offset=".6" stop-color="#8F1F27"/><stop offset="1" stop-color="${darken('#8F1F27', 0.3)}"/></radialGradient></defs>`;
  const rim = special ? '' : `stroke="${vip ? GOLD : hex}"`;
  let body = '';
  if (double) {
    // Two-tier lacquer stand: a wide foot, a stem, and the plate on top.
    body +=
      occlusion(78, 11, 0.3) +
      `<ellipse cx="50" cy="72" rx="42" ry="14" fill="url(#rd)" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M14 70 Q50 84 86 70" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>` +
      `<path d="M24 62 Q36 52 50 53 Q64 52 76 62" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>` +
      `<rect x="44" y="52" width="12" height="16" rx="3" fill="#8F1F27" stroke="${INK}" stroke-width="4"/>`;
  } else body += occlusion(vip ? 64 : 62, 12);
  const cy = double ? 40 : 50;
  if (vip) {
    // Black lacquer base with a glossy top-left, then the ceramic on it with a gold rim.
    body +=
      `<ellipse cx="50" cy="${cy + 6}" rx="44" ry="38" fill="url(#lq)" stroke="${INK}" stroke-width="6"/>` +
      `<ellipse cx="36" cy="${cy - 16}" rx="12" ry="6" fill="#fff" opacity=".22" transform="rotate(-25 36 ${cy - 16})"/>` +
      `<ellipse cx="50" cy="${cy + 6}" rx="40" ry="34" fill="none" stroke="${GOLD}" stroke-width="2"/>`;
  }
  body += dish(cy, rim, vip ? '#FFFBF1' : RICE_WHITE);
  if (special)
    body = body.replace(`fill="none" ${rim} stroke-width="10.4"/>`, `fill="none" stroke="none"/>`) + specialRim(cy);
  if (vip)
    body += `<ellipse cx="50" cy="${cy}" rx="33.5" ry="29.5" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width="1.5"/>`;
  return `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">${defs}${body}</svg>`;
}

/** The covered plate's cloche: brushed steel dome, a reflection stripe, a knob. Drawn over the plate. */
export function clocheSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">` +
    `<defs><linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F5F9"/><stop offset=".45" stop-color="#C9CFD8"/><stop offset=".7" stop-color="#8E97A6"/><stop offset="1" stop-color="#6B7484"/></linearGradient>` +
    `<filter id="sh" x="-20%" y="-30%" width="140%" height="180%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>` +
    `<ellipse cx="53" cy="66" rx="36" ry="9" fill="${INK}" opacity=".22" filter="url(#sh)"/>` +
    `<path d="M14 58 Q14 20 50 18 Q86 20 86 58 Z" fill="url(#st)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M26 44 Q34 26 50 24" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M22 52 Q26 40 34 34" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M62 24 Q76 30 80 46" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/>` +
    `<rect x="10" y="56" width="80" height="8" rx="4" fill="#B8BFCB" stroke="${INK}" stroke-width="5"/>` +
    `<circle cx="50" cy="16" r="6.5" fill="#E9B949" stroke="${INK}" stroke-width="4"/><circle cx="48" cy="14" r="2" fill="#fff" opacity=".7"/>` +
    `</svg>`
  );
}

/** The chef's special flag: a gold pennant on a stick, planted at the plate's centre. */
export function flagSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">` +
    `<rect x="47" y="30" width="6" height="42" rx="3" fill="#7A4A22" stroke="${INK}" stroke-width="4"/>` +
    `<path d="M53 30 L86 40 L53 52 Z" fill="${GOLD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M57 36 L74 41" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="50" cy="28" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="4"/>` +
    `</svg>`
  );
}
