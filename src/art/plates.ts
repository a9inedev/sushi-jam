/* Sushi per plate colour, as SVG in a 100x100 box centred on (50,52), drawn to be recognisable at 30 px and
   delicious at 90 px. Every piece: a chocolate outline, a wet highlight top-left, a translucent lighter edge
   along the top, and a small occlusion shadow so it sits in the dish. The plate itself is plate-base.ts. */

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

const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const SHADOW = `<ellipse cx="52" cy="78" rx="30" ry="6" fill="${INK}" opacity=".18"/>`;

/** The rice: a cream oval with grain, lit top-left, outlined. */
const RICE =
  `<ellipse cx="50" cy="64" rx="31" ry="16" fill="#FFF8EA" ${O}/>` +
  `<ellipse cx="50" cy="64" rx="27" ry="12" fill="#F5E9D2" opacity=".6"/>` +
  `<g fill="#FFFFFF" opacity=".9"><ellipse cx="34" cy="66" rx="3" ry="1.8" transform="rotate(-20 34 66)"/><ellipse cx="44" cy="72" rx="3" ry="1.8" transform="rotate(15 44 72)"/><ellipse cx="58" cy="73" rx="3" ry="1.8" transform="rotate(-10 58 73)"/><ellipse cx="68" cy="66" rx="3" ry="1.8" transform="rotate(25 68 66)"/><ellipse cx="52" cy="66" rx="2.6" ry="1.6"/></g>` +
  `<path d="M24 60 Q34 52 48 52" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`;

/** The slab of fish over the rice: outline, body, translucent top edge, wet highlight. */
function slab(fill: string, edge: string, extra = ''): string {
  return (
    `<path d="M14 54 Q17 33 50 32 Q83 33 87 54 Q85 65 50 64 Q15 65 14 54 Z" fill="${fill}" ${O}/>` +
    `<path d="M20 44 Q34 36 50 36 Q66 36 80 44" fill="none" stroke="${edge}" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>` +
    extra +
    `<ellipse cx="34" cy="42" rx="9" ry="4" fill="#fff" opacity=".6" transform="rotate(-12 34 42)"/>`
  );
}

function food(color: number): string {
  switch (color) {
    case 0: // salmon: orange-pink with white fat stripes
      return (
        SHADOW +
        RICE +
        slab(
          '#FF7A55',
          '#FFC2A8',
          `<path d="M28 40 L36 60 M45 37 L50 61 M62 37 L67 59" stroke="#FFE3D6" stroke-width="4" stroke-linecap="round" opacity=".9"/>`
        )
      );
    case 1: // tuna: deep red with a lighter grain
      return (
        SHADOW +
        RICE +
        slab(
          '#C6394B',
          '#F08A96',
          `<path d="M26 46 Q50 40 74 46" fill="none" stroke="#E86E7C" stroke-width="3" stroke-linecap="round" opacity=".75"/>` +
            `<path d="M30 55 Q50 50 70 55" fill="none" stroke="#E86E7C" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`
        )
      );
    case 2: // tamago: a yellow block with a nori belt
      return (
        SHADOW +
        RICE +
        `<rect x="16" y="32" width="68" height="32" rx="8" fill="#FFD447" ${O}/>` +
        `<path d="M22 42 L78 42 M22 51 L78 51" stroke="#E7A800" stroke-width="2.5" stroke-opacity=".8"/>` +
        `<path d="M22 37 Q40 34 60 35" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>` +
        `<rect x="42" y="27" width="16" height="42" rx="3" fill="#1E2A22" ${O}/>` +
        `<path d="M46 31 L46 64" stroke="#3E5A48" stroke-width="2" stroke-opacity=".8"/>` +
        `<ellipse cx="30" cy="38" rx="7" ry="3.5" fill="#fff" opacity=".55" transform="rotate(-12 30 38)"/>`
      );
    case 3: // cucumber maki: a cut roll, rice and a green centre
      return (
        `<ellipse cx="52" cy="82" rx="32" ry="6" fill="${INK}" opacity=".18"/>` +
        `<circle cx="50" cy="54" r="33" fill="#1E2A22" ${O}/>` +
        `<circle cx="50" cy="54" r="26" fill="#FFF8EA"/>` +
        `<circle cx="50" cy="54" r="26" fill="none" stroke="#F5E9D2" stroke-width="3"/>` +
        `<g fill="#fff" opacity=".9"><ellipse cx="36" cy="46" rx="3" ry="1.8" transform="rotate(-30 36 46)"/><ellipse cx="62" cy="44" rx="3" ry="1.8" transform="rotate(20 62 44)"/><ellipse cx="34" cy="62" rx="3" ry="1.8" transform="rotate(30 34 62)"/><ellipse cx="66" cy="63" rx="3" ry="1.8" transform="rotate(-20 66 63)"/><ellipse cx="50" cy="33" rx="3" ry="1.8"/><ellipse cx="50" cy="75" rx="3" ry="1.8"/></g>` +
        `<circle cx="50" cy="54" r="11" fill="#7BCB4B" stroke="${INK}" stroke-width="4"/>` +
        `<circle cx="50" cy="54" r="6" fill="#CFEFB2"/><circle cx="50" cy="54" r="2.2" fill="#4E9E2F"/>` +
        `<path d="M24 40 Q32 27 46 24" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3.5" stroke-linecap="round"/>` +
        `<ellipse cx="42" cy="46" rx="4" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 42 46)"/>`
      );
    case 4: // grilled eggplant: glossy purple with a torch mark and a calyx
      return (
        SHADOW +
        RICE +
        slab(
          '#8E5BE0',
          '#C9A9FF',
          `<path d="M40 46 Q52 42 66 50" fill="none" stroke="#3F2A6E" stroke-width="5" stroke-linecap="round" opacity=".55"/>` +
            `<path d="M46 47 Q54 45 62 49" fill="none" stroke="#2A1F1A" stroke-width="2" stroke-linecap="round" opacity=".5"/>`
        ) +
        `<path d="M15 52 L5 42 L19 45 Z" fill="#3F8F3A" ${O}/>`
      );
    case 5: // shrimp: curled tail, red stripes
      return (
        SHADOW +
        RICE +
        `<path d="M13 58 Q13 35 34 33 Q56 31 76 37 Q92 43 90 56 Q88 64 78 62 Q60 60 50 62 Q32 66 13 58 Z" fill="#FF9A5C" ${O}/>` +
        `<path d="M30 37 L26 60 M44 34 L40 62 M58 34 L54 62" stroke="#E5484D" stroke-width="4" stroke-linecap="round" opacity=".55"/>` +
        `<path d="M32 36 L28 58 M46 33 L42 60" stroke="#FFE1CF" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>` +
        `<path d="M76 38 Q96 28 98 44 Q97 54 88 57" fill="#F5843B" ${O}/>` +
        `<path d="M84 36 Q92 34 94 42" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>` +
        `<path d="M20 44 Q36 36 54 36" fill="none" stroke="#FFD2BC" stroke-opacity=".8" stroke-width="3.5" stroke-linecap="round"/>` +
        `<ellipse cx="30" cy="42" rx="8" ry="3.5" fill="#fff" opacity=".6" transform="rotate(-10 30 42)"/>`
      );
    case 6: // wasabi: a green mound with a leaf
      return (
        `<ellipse cx="52" cy="78" rx="30" ry="6" fill="${INK}" opacity=".18"/>` +
        `<path d="M22 70 Q20 44 40 46 Q46 30 58 38 Q80 30 78 54 Q88 68 66 74 Q44 80 22 70 Z" fill="#7BC142" ${O}/>` +
        `<path d="M30 60 Q36 48 50 48" fill="none" stroke="#B7E28A" stroke-width="4" stroke-linecap="round" opacity=".85"/>` +
        `<ellipse cx="38" cy="54" rx="6" ry="3" fill="#fff" opacity=".45" transform="rotate(-20 38 54)"/>` +
        `<path d="M58 40 Q66 26 84 28 Q80 42 64 44 Z" fill="#5DBB57" ${O}/><path d="M62 41 L80 30" stroke="#2F7A2B" stroke-width="2" stroke-linecap="round"/>`
      );
    default:
      return '';
  }
}

export function foodSvg(color: number): string {
  if (!COLORS[color]) return '';
  return `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">${food(color)}</svg>`;
}
