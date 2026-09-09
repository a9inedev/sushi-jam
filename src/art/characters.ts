/* The seven diners as layered SVG: shadow, feet (walk), body, highlight, cheeks, face (per state), prop.
   All coordinates live in a 100x100 box; the body centre is (50,56) with radius 36, so a sprite drawn in a
   box of r*100/36 puts a body of radius r at the origin when the box top is at -0.56*box. */

import { COLORS } from '../data/constants';
import type { OutfitId } from '../data/themes';
import { darken, INK, lighten } from './color';

export type DinerSpriteState = 'idle' | 'blink' | 'happy' | 'chew' | 'grumpy' | 'walk';
export const SPRITE_STATES: DinerSpriteState[] = ['idle', 'blink', 'happy', 'chew', 'grumpy', 'walk'];

export type BodyShape = 'circle' | 'squircle' | 'egg';

export interface CharacterDef {
  id: string;
  name: string;
  color: number;
  shape: BodyShape;
  prop: string;
  personality: string;
}

/** One character per plate colour. Silhouette and prop are what make them readable at 40 px. */
export const CHARACTERS: CharacterDef[] = [
  { id: 'salmon', name: 'Sal', color: 0, shape: 'circle', prop: 'bandana knot', personality: 'cheerful regular' },
  { id: 'tuna', name: 'Tobi', color: 1, shape: 'squircle', prop: 'square glasses', personality: 'bookish critic' },
  { id: 'tamago', name: 'Tama', color: 2, shape: 'circle', prop: 'straw hat', personality: 'sleepy farmer' },
  { id: 'cucumber', name: 'Kyu', color: 3, shape: 'egg', prop: 'leaf sprout', personality: 'health nut' },
  { id: 'eggplant', name: 'Nasu', color: 4, shape: 'circle', prop: 'top hat', personality: 'fancy gourmet' },
  { id: 'shrimp', name: 'Ebi', color: 5, shape: 'circle', prop: 'antennae and scarf', personality: 'jittery tourist' },
  { id: 'wasabi', name: 'Wasa', color: 6, shape: 'circle', prop: 'headphones', personality: 'chill DJ' },
];

const HEAD = 'http://www.w3.org/2000/svg';

function body(shape: BodyShape): string {
  const s = `fill="url(#g)" stroke="${INK}" stroke-opacity=".5" stroke-width="4.5"`;
  if (shape === 'squircle') return `<rect x="14" y="20" width="72" height="72" rx="24" ${s}/>`;
  if (shape === 'egg') return `<ellipse cx="50" cy="57" rx="33" ry="39" ${s}/>`;
  return `<circle cx="50" cy="56" r="36" ${s}/>`;
}

function eyesOpen(pupilDy = 0): string {
  return (
    `<ellipse cx="39" cy="50" rx="8" ry="9" fill="#fff"/><ellipse cx="61" cy="50" rx="8" ry="9" fill="#fff"/>` +
    `<circle cx="40.5" cy="${52 + pupilDy}" r="4" fill="${INK}"/><circle cx="62.5" cy="${52 + pupilDy}" r="4" fill="${INK}"/>` +
    `<circle cx="39" cy="${49.5 + pupilDy}" r="1.5" fill="#fff"/><circle cx="61" cy="${49.5 + pupilDy}" r="1.5" fill="#fff"/>`
  );
}

const stroke = `fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"`;

function face(state: DinerSpriteState, base: string): string {
  switch (state) {
    case 'blink':
      return `<path d="M31 51 Q39 57 47 51" ${stroke}/><path d="M53 51 Q61 57 69 51" ${stroke}/><path d="M42 68 Q50 75 58 68" ${stroke}/>`;
    case 'happy':
      return (
        `<path d="M31 53 Q39 44 47 53" ${stroke}/><path d="M53 53 Q61 44 69 53" ${stroke}/>` +
        `<path d="M36 64 Q50 86 64 64 Z" fill="#5A1C1C"/><ellipse cx="50" cy="75" rx="7" ry="4" fill="#F06B7A"/>`
      );
    case 'chew':
      return (
        eyesOpen() +
        `<ellipse cx="30" cy="66" rx="9" ry="6" fill="#fff" opacity=".28"/><ellipse cx="70" cy="66" rx="9" ry="6" fill="#fff" opacity=".28"/>` +
        `<ellipse cx="50" cy="70" rx="6" ry="6.5" fill="#5A1C1C"/>`
      );
    case 'grumpy':
      return (
        eyesOpen(1.5) +
        `<path d="M30 41 Q38 48 47 46" fill="${base}" stroke="none"/><path d="M70 41 Q62 48 53 46" fill="${base}" stroke="none"/>` +
        `<path d="M30 40 L46 46" ${stroke}/><path d="M70 40 L54 46" ${stroke}/><path d="M42 72 Q50 66 58 72" ${stroke}/>`
      );
    case 'walk':
      return eyesOpen(-1) + `<path d="M43 68 Q50 73 57 68" ${stroke}/>`;
    default:
      return eyesOpen() + `<path d="M42 68 Q50 75 58 68" ${stroke}/>`;
  }
}

function prop(c: CharacterDef, base: string): string {
  const dark = darken(base, 0.35);
  switch (c.id) {
    case 'salmon':
      return (
        `<path d="M16 44 Q50 4 84 44 Q50 30 16 44 Z" fill="#FFF7E8" stroke="${INK}" stroke-opacity=".35" stroke-width="2"/>` +
        `<circle cx="34" cy="31" r="2.4" fill="${dark}"/><circle cx="50" cy="25" r="2.4" fill="${dark}"/><circle cx="64" cy="30" r="2.4" fill="${dark}"/>` +
        `<path d="M76 22 L94 10 L90 26 Z" fill="${dark}"/><path d="M76 22 L96 26 L86 34 Z" fill="${dark}"/><circle cx="76" cy="22" r="5.5" fill="${dark}" stroke="${INK}" stroke-opacity=".5" stroke-width="2"/>`
      );
    case 'tuna':
      return (
        `<rect x="26" y="40" width="20" height="18" rx="5" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="3.5"/>` +
        `<rect x="54" y="40" width="20" height="18" rx="5" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="3.5"/>` +
        `<path d="M46 48 L54 48 M26 47 L17 43 M74 47 L83 43" ${stroke}/>`
      );
    case 'tamago':
      return (
        `<path d="M14 46 L86 46 Q50 58 14 46 Z" fill="#000" opacity=".18"/>` +
        `<path d="M50 3 L5 46 L95 46 Z" fill="#D9B36A" stroke="${INK}" stroke-opacity=".5" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M50 3 L30 46 M50 3 L70 46 M50 3 L50 46" stroke="#B8924C" stroke-width="2" opacity=".7"/>` +
        `<path d="M9 42 L91 42" stroke="#9E7A3A" stroke-width="3"/>`
      );
    case 'cucumber':
      return (
        `<path d="M50 20 Q52 10 50 2" fill="none" stroke="#3F8F3A" stroke-width="4" stroke-linecap="round"/>` +
        `<ellipse cx="39" cy="11" rx="12" ry="6.5" fill="#5DBB57" stroke="#2F7A2B" stroke-width="2.5" transform="rotate(-30 39 11)"/>` +
        `<ellipse cx="61" cy="11" rx="12" ry="6.5" fill="#7BD170" stroke="#2F7A2B" stroke-width="2.5" transform="rotate(30 61 11)"/>`
      );
    case 'eggplant':
      return (
        `<rect x="16" y="24" width="68" height="9" rx="4.5" fill="${INK}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>` +
        `<rect x="27" y="0" width="46" height="30" rx="4" fill="${INK}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>` +
        `<rect x="27" y="19" width="46" height="7" fill="${lighten(base, 0.2)}"/>`
      );
    case 'shrimp':
      return (
        `<path d="M40 22 Q30 2 10 8" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M60 22 Q70 2 90 8" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>` +
        `<circle cx="10" cy="8" r="3.5" fill="${dark}"/><circle cx="90" cy="8" r="3.5" fill="${dark}"/>` +
        `<path d="M20 74 Q50 94 80 74 Q50 82 20 74 Z" fill="#FFF7E8" stroke="${INK}" stroke-opacity=".4" stroke-width="2.5"/>` +
        `<path d="M32 78 Q50 86 68 78" fill="none" stroke="#E5484D" stroke-width="3"/>`
      );
    case 'wasabi':
      return (
        `<path d="M17 52 Q50 4 83 52" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
        `<rect x="8" y="44" width="14" height="22" rx="6" fill="${INK}" stroke="${lighten(base, 0.2)}" stroke-width="2.5"/>` +
        `<rect x="78" y="44" width="14" height="22" rx="6" fill="${INK}" stroke="${lighten(base, 0.2)}" stroke-width="2.5"/>`
      );
    default:
      return '';
  }
}

const CROWN =
  `<path d="M30 32 L36 12 L46 25 L50 7 L54 25 L64 12 L70 32 Z" fill="#F2B705" stroke="#B8860B" stroke-width="3" stroke-linejoin="round"/>` +
  `<circle cx="50" cy="25" r="2.6" fill="#E5484D"/><circle cx="39" cy="27" r="2.2" fill="#3E7BFA"/><circle cx="61" cy="27" r="2.2" fill="#2FB36B"/>`;

const FEET = `<ellipse cx="38" cy="92" rx="8" ry="4.5" fill="${INK}" opacity=".75"/><ellipse cx="63" cy="93" rx="8" ry="4.5" fill="${INK}" opacity=".75"/>`;

/** Restaurant outfits sit on the body below the face, so they never fight a character's prop. */
export function outfitSvg(outfit: OutfitId): string {
  switch (outfit) {
    case 'bowtie':
      return (
        `<path d="M36 70 L50 76 L36 82 Z" fill="#E5484D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M64 70 L50 76 L64 82 Z" fill="#E5484D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="50" cy="76" r="3.5" fill="#B3202A"/>`
      );
    case 'tuxedo':
      return (
        `<path d="M38 66 L50 80 L62 66 L58 66 L50 74 L42 66 Z" fill="#FFF7E8" stroke="${INK}" stroke-width="1.5"/>` +
        `<path d="M40 72 L50 77 L40 82 Z" fill="${INK}"/><path d="M60 72 L50 77 L60 82 Z" fill="${INK}"/>` +
        `<circle cx="50" cy="77" r="2.6" fill="#F2B705"/>`
      );
    case 'yukata':
      return (
        `<path d="M28 60 L50 84 L72 60" fill="none" stroke="#3A5FA8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M30 61 L50 83" fill="none" stroke="#FFF7E8" stroke-width="2.5"/>` +
        `<rect x="33" y="84" width="34" height="6" rx="2" fill="#E5484D"/>`
      );
    case 'suit':
      return (
        `<path d="M26 72 Q50 94 74 72" fill="none" stroke="#C9D3E0" stroke-width="6" stroke-linecap="round"/>` +
        `<path d="M26 72 Q50 94 74 72" fill="none" stroke="#8A97A8" stroke-width="2"/>` +
        `<circle cx="40" cy="81" r="3" fill="#6EE7FF"/><circle cx="60" cy="81" r="3" fill="#2FB36B"/>`
      );
    default:
      return '';
  }
}

/** dim: the non-movable look, every colour scaled to 72 percent so the movable diners pop. */
export function characterSvg(
  color: number,
  state: DinerSpriteState,
  vip = false,
  dim = false,
  outfit: OutfitId = 'none'
): string {
  const c = CHARACTERS[color] || CHARACTERS[0];
  const base = COLORS[color].hex;
  const hi = lighten(base, 0.34),
    lo = darken(base, 0.2);
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">` +
    `<defs><radialGradient id="g" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/></radialGradient><filter id="dim" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.72 0 0 0 0 0 0.72 0 0 0 0 0 0.72 0 0 0 0 0 1 0"/></filter></defs>` +
    `<ellipse cx="50" cy="94" rx="30" ry="5.5" fill="#000" opacity=".16"/>` +
    (dim ? '<g filter="url(#dim)">' : '<g>') +
    (state === 'walk' ? FEET : '') +
    body(c.shape) +
    `<ellipse cx="34" cy="37" rx="12" ry="7.5" fill="#fff" opacity=".22" transform="rotate(-22 34 37)"/>` +
    `<ellipse cx="31" cy="62" rx="6" ry="3.8" fill="#fff" opacity=".2"/><ellipse cx="69" cy="62" rx="6" ry="3.8" fill="#fff" opacity=".2"/>` +
    face(state, base) +
    outfitSvg(outfit) +
    (vip ? CROWN : prop(c, base)) +
    `</g></svg>`
  );
}
