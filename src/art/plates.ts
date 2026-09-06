/* Sushi per plate colour, as SVG in a 100x100 box centred on (50,52). The plate disc, rim, glyph badge and
   mechanic overlays stay canvas-drawn on top and underneath; this is only the food. */

import { COLORS } from '../data/constants';
import { INK } from './color';

const HEAD = 'http://www.w3.org/2000/svg';

export interface SushiDef {
  id: string;
  name: string;
  color: number;
}

export const SUSHI: SushiDef[] = [
  { id: 'salmon', name: 'Salmon nigiri', color: 0 },
  { id: 'tuna', name: 'Tuna nigiri', color: 1 },
  { id: 'tamago', name: 'Tamago nigiri', color: 2 },
  { id: 'cucumber', name: 'Cucumber maki', color: 3 },
  { id: 'eggplant', name: 'Grilled eggplant nigiri', color: 4 },
  { id: 'shrimp', name: 'Ebi nigiri', color: 5 },
  { id: 'wasabi', name: 'Wasabi mound', color: 6 },
];

const RICE =
  `<ellipse cx="50" cy="63" rx="31" ry="17" fill="#FFFBF0" stroke="#E3D8BC" stroke-width="2.5"/>` +
  `<g fill="#EFE5CC"><circle cx="32" cy="66" r="2"/><circle cx="42" cy="73" r="2"/><circle cx="58" cy="74" r="2"/><circle cx="70" cy="66" r="2"/><circle cx="50" cy="69" r="1.6"/></g>`;

function nigiri(topping: string): string {
  return RICE + topping;
}

function food(color: number): string {
  switch (color) {
    case 0: // salmon
      return nigiri(
        `<path d="M15 54 Q18 34 50 33 Q82 34 86 54 Q84 66 50 64 Q16 66 15 54 Z" fill="#FF7A55" stroke="#D9503A" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<path d="M28 42 L36 60 M44 38 L50 60 M60 38 L66 58" stroke="#FFD6C4" stroke-width="3.5" stroke-linecap="round" opacity=".85"/>`
      );
    case 1: // tuna
      return nigiri(
        `<path d="M15 54 Q18 34 50 33 Q82 34 86 54 Q84 66 50 64 Q16 66 15 54 Z" fill="#C6394B" stroke="#8E1F30" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<path d="M26 44 Q50 38 74 44" fill="none" stroke="#F08A96" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
          `<path d="M30 54 Q50 49 70 54" fill="none" stroke="#F08A96" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`
      );
    case 2: // tamago
      return nigiri(
        `<rect x="17" y="34" width="66" height="30" rx="7" fill="#FFD447" stroke="#D9A000" stroke-width="2.5"/>` +
          `<path d="M22 42 L78 42 M22 50 L78 50" stroke="#F2B705" stroke-width="2" opacity=".8"/>` +
          `<rect x="43" y="30" width="14" height="40" rx="2" fill="${INK}" opacity=".9"/>`
      );
    case 3: // cucumber maki, cross-section
      return (
        `<circle cx="50" cy="54" r="32" fill="#1E2A22" stroke="#111" stroke-width="2"/>` +
        `<circle cx="50" cy="54" r="25" fill="#FFFBF0"/>` +
        `<g fill="#EFE5CC"><circle cx="36" cy="46" r="2.2"/><circle cx="62" cy="44" r="2.2"/><circle cx="34" cy="62" r="2.2"/><circle cx="66" cy="63" r="2.2"/><circle cx="50" cy="34" r="2"/><circle cx="50" cy="74" r="2"/></g>` +
        `<circle cx="50" cy="54" r="10.5" fill="#7BCB4B" stroke="#4E9E2F" stroke-width="3"/>` +
        `<g fill="#CFEFB2"><circle cx="46" cy="52" r="1.8"/><circle cx="54" cy="52" r="1.8"/><circle cx="50" cy="58" r="1.8"/></g>`
      );
    case 4: // eggplant
      return nigiri(
        `<path d="M16 54 Q18 36 50 35 Q82 36 85 54 Q83 65 50 63 Q17 65 16 54 Z" fill="#8E5BE0" stroke="#5B33A8" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<path d="M24 46 Q50 40 76 46" fill="none" stroke="#C9A9FF" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>` +
          `<path d="M14 52 L8 44 L18 46 Z" fill="#3F8F3A"/>`
      );
    case 5: // shrimp
      return nigiri(
        `<path d="M14 58 Q14 36 34 34 Q56 32 76 38 Q92 44 90 56 Q88 64 78 62 Q60 60 50 62 Q32 66 14 58 Z" fill="#FF9A5C" stroke="#D96A2E" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<path d="M30 38 L26 60 M44 35 L40 62 M58 35 L54 62" stroke="#FFE1CF" stroke-width="4" stroke-linecap="round" opacity=".9"/>` +
          `<path d="M76 38 Q96 30 98 44 Q96 52 90 56" fill="#F5843B" stroke="#D96A2E" stroke-width="2"/>`
      );
    case 6: // wasabi
      return (
        `<ellipse cx="50" cy="76" rx="30" ry="6" fill="#000" opacity=".12"/>` +
        `<path d="M22 70 Q20 44 40 46 Q46 30 58 38 Q80 30 78 54 Q88 68 66 74 Q44 80 22 70 Z" fill="#7BC142" stroke="#4E9E2F" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<path d="M34 58 Q40 46 52 48" fill="none" stroke="#B7E28A" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>` +
        `<ellipse cx="66" cy="36" rx="9" ry="4.5" fill="#5DBB57" stroke="#2F7A2B" stroke-width="2" transform="rotate(-35 66 36)"/>`
      );
    default:
      return '';
  }
}

export function foodSvg(color: number): string {
  if (!COLORS[color]) return '';
  return `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">${food(color)}</svg>`;
}
