/* The seven diners as layered SVG: shadow, feet (walk), body, rim light, highlight, cheeks, face, outfit, prop,
   gold trim. All coordinates live in a 100x100 box; the body centre is (50,56) with radius 36, so a sprite drawn
   in a box of r*100/36 puts a body of radius r at the origin when the box top is at -0.56*box. Two views: the
   front for the grid and the walk, and a three-quarter back view for diners seated at the counter, so they
   face the belt; the visible eye and cheek still carry the expression. */

import { COLORS } from '../data/constants';
import type { OutfitId } from '../data/themes';
import { darken, INK, lighten } from './color';

export type DinerSpriteState = 'idle' | 'blink' | 'happy' | 'chew' | 'grumpy' | 'walk';
export const SPRITE_STATES: DinerSpriteState[] = ['idle', 'blink', 'happy', 'chew', 'grumpy', 'walk'];
export type SpriteView = 'front' | 'back';
export const SPRITE_VIEWS: SpriteView[] = ['front', 'back'];

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
  { id: 'salmon', name: 'Sal', color: 0, shape: 'circle', prop: 'cap', personality: 'cheerful regular' },
  { id: 'tuna', name: 'Tobi', color: 1, shape: 'squircle', prop: 'headband', personality: 'bookish critic' },
  { id: 'tamago', name: 'Tama', color: 2, shape: 'circle', prop: 'ribbon', personality: 'sleepy farmer' },
  { id: 'cucumber', name: 'Kyu', color: 3, shape: 'egg', prop: 'round glasses', personality: 'health nut' },
  { id: 'eggplant', name: 'Nasu', color: 4, shape: 'circle', prop: 'scarf', personality: 'fancy gourmet' },
  { id: 'shrimp', name: 'Ebi', color: 5, shape: 'circle', prop: 'antenna clips', personality: 'jittery tourist' },
  { id: 'wasabi', name: 'Wasa', color: 6, shape: 'circle', prop: 'leaf', personality: 'chill DJ' },
];

const HEAD = 'http://www.w3.org/2000/svg';
const GOLD = '#E9B949';
const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const O3 = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

function body(shape: BodyShape): string {
  const s = `fill="url(#g)" ${O}`;
  if (shape === 'squircle') return `<rect x="14" y="20" width="72" height="72" rx="24" ${s}/>`;
  if (shape === 'egg') return `<ellipse cx="50" cy="57" rx="33" ry="39" ${s}/>`;
  return `<circle cx="50" cy="56" r="36" ${s}/>`;
}

/** The rim light along the top-right edge and the specular top-left. */
function lighting(shape: BodyShape): string {
  const rim =
    shape === 'squircle'
      ? `<path d="M62 22 Q84 24 84 52" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3.5" stroke-linecap="round"/>`
      : shape === 'egg'
        ? `<path d="M60 20 Q80 30 82 56" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3.5" stroke-linecap="round"/>`
        : `<path d="M62 23 Q82 32 84 54" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3.5" stroke-linecap="round"/>`;
  return (
    rim +
    `<ellipse cx="33" cy="36" rx="12" ry="7" fill="#fff" opacity=".36" transform="rotate(-24 33 36)"/>` +
    `<ellipse cx="30" cy="62" rx="6" ry="3.6" fill="#fff" opacity=".16"/><ellipse cx="70" cy="62" rx="6" ry="3.6" fill="#fff" opacity=".16"/>`
  );
}

function eye(cx: number, cy: number, rx: number, ry: number, pupilDy = 0): string {
  return (
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
    `<circle cx="${cx + 1.5}" cy="${cy + 2 + pupilDy}" r="${rx * 0.5}" fill="${INK}"/>` +
    `<circle cx="${cx - 0.5}" cy="${cy - 0.5 + pupilDy}" r="${rx * 0.2}" fill="#fff"/>`
  );
}

function eyesOpen(pupilDy = 0): string {
  return eye(39, 50, 8, 9, pupilDy) + eye(61, 50, 8, 9, pupilDy);
}

const stroke = `fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"`;

function face(state: DinerSpriteState, base: string): string {
  switch (state) {
    case 'blink':
      return `<path d="M31 51 Q39 57 47 51" ${stroke}/><path d="M53 51 Q61 57 69 51" ${stroke}/><path d="M42 68 Q50 75 58 68" ${stroke}/>`;
    case 'happy':
      return (
        `<path d="M31 53 Q39 44 47 53" ${stroke}/><path d="M53 53 Q61 44 69 53" ${stroke}/>` +
        `<path d="M35 64 Q50 87 65 64 Z" fill="#5A1C1C" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<path d="M42 74 Q50 84 58 74 Q50 78 42 74 Z" fill="#F06B7A"/>` +
        `<ellipse cx="28" cy="64" rx="7" ry="4" fill="#FF8A8A" opacity=".45"/><ellipse cx="72" cy="64" rx="7" ry="4" fill="#FF8A8A" opacity=".45"/>`
      );
    case 'chew':
      return (
        eyesOpen() +
        `<ellipse cx="29" cy="67" rx="10" ry="7" fill="#fff" opacity=".32"/><ellipse cx="71" cy="67" rx="10" ry="7" fill="#fff" opacity=".32"/>` +
        `<ellipse cx="50" cy="71" rx="6" ry="6.5" fill="#5A1C1C" stroke="${INK}" stroke-width="2.5"/>`
      );
    case 'grumpy':
      return (
        eyesOpen(1.5) +
        `<path d="M30 41 Q38 48 47 46" fill="${base}" stroke="none"/><path d="M70 41 Q62 48 53 46" fill="${base}" stroke="none"/>` +
        `<path d="M29 39 L47 46" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M71 39 L53 46" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M42 72 Q50 66 58 72" ${stroke}/>`
      );
    case 'walk':
      return eyesOpen(-1) + `<path d="M43 68 Q50 73 57 68" ${stroke}/>`;
    default:
      return eyesOpen() + `<path d="M42 68 Q50 75 58 68" ${stroke}/>`;
  }
}

/** The sliver of face visible from three-quarters behind: one eye, a cheek, a hint of the mouth. */
function faceBack(state: DinerSpriteState): string {
  const cheek = `<ellipse cx="78" cy="60" rx="6" ry="4" fill="#fff" opacity=".2"/>`;
  switch (state) {
    case 'blink':
      return `<path d="M72 50 Q77 54 82 50" ${stroke}/>` + cheek;
    case 'happy':
      return `<path d="M72 52 Q77 45 82 52" ${stroke}/><path d="M76 64 Q82 70 86 64" ${stroke}/><ellipse cx="80" cy="62" rx="5" ry="3" fill="#FF8A8A" opacity=".5"/>`;
    case 'chew':
      return eye(77, 50, 5, 6) + `<ellipse cx="80" cy="66" rx="8" ry="5.5" fill="#fff" opacity=".35"/>`;
    case 'grumpy':
      return (
        eye(77, 50, 5, 6, 1) +
        `<path d="M70 41 L82 45" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
      );
    default:
      return eye(77, 50, 5, 6) + cheek;
  }
}

function prop(c: CharacterDef, base: string, view: SpriteView): string {
  const dark = darken(base, 0.35);
  const back = view === 'back';
  switch (c.id) {
    case 'salmon': // a cap: dome, a button, the brim pointing right (behind: brim peeks past the head)
      return (
        `<path d="M14 38 Q18 8 50 8 Q82 8 86 38 Z" fill="${dark}" ${O}/>` +
        (back
          ? `<path d="M80 36 L96 40 L84 44 Z" fill="${dark}" ${O}/>`
          : `<path d="M62 38 L98 35 L94 45 L62 44 Z" fill="${dark}" ${O}/>`) +
        `<path d="M22 30 Q34 16 50 14" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="50" cy="9" r="4" fill="#F5E9D2" ${O3}/>`
      );
    case 'tuna': // a headband with a knot and two tails flying out to the right
      return (
        `<rect x="12" y="34" width="76" height="11" rx="5.5" fill="#1E2A5A" ${O}/>` +
        `<rect x="16" y="36" width="60" height="2.5" fill="#fff" opacity=".3"/>` +
        (back
          ? `<circle cx="50" cy="40" r="6" fill="#1E2A5A" ${O3}/><path d="M50 44 L40 60 M50 44 L58 62" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
          : `<circle cx="84" cy="40" r="6" fill="#1E2A5A" ${O3}/><path d="M88 42 L100 34 M88 44 L102 52" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`)
      );
    case 'tamago': // a ribbon bow on the top-left of the head
      return (
        `<path d="M32 22 Q10 6 16 32 Q24 34 32 22 Z" fill="#C8323B" ${O}/>` +
        `<path d="M32 22 Q40 0 52 18 Q46 26 32 22 Z" fill="#C8323B" ${O}/>` +
        `<path d="M30 24 L26 40 M34 24 L40 38" fill="none" stroke="#C8323B" stroke-width="5" stroke-linecap="round"/><path d="M30 24 L26 40 M34 24 L40 38" fill="none" stroke="${INK}" stroke-width="1.5"/>` +
        `<circle cx="32" cy="22" r="5.5" fill="#8F1F27" ${O3}/>` +
        `<path d="M18 22 Q20 14 28 12" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>`
      );
    case 'cucumber': // round glasses: frames around the eyes, arms out to the sides
      return back
        ? `<path d="M14 46 L26 42 M86 46 L74 42" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M14 44 Q50 30 86 44" fill="none" stroke="${INK}" stroke-width="3"/>`
        : `<circle cx="39" cy="50" r="12.5" fill="#fff" fill-opacity=".14" stroke="${INK}" stroke-width="4"/>` +
            `<circle cx="61" cy="50" r="12.5" fill="#fff" fill-opacity=".14" stroke="${INK}" stroke-width="4"/>` +
            `<path d="M51.5 48 L48.5 48 M26.5 47 L13 42 M73.5 47 L87 42" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
            `<path d="M30 42 Q34 38 38 40" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'eggplant': // a wrapped scarf with a tail hanging to the left
      return (
        `<path d="M18 74 Q50 96 82 74 Q50 84 18 74 Z" fill="#F5E9D2" ${O}/>` +
        `<path d="M22 76 Q50 90 78 76" fill="none" stroke="#C8323B" stroke-width="4"/>` +
        (back
          ? `<path d="M40 80 L34 98 L46 98 Z" fill="#F5E9D2" ${O}/>`
          : `<path d="M24 78 L8 96 L24 98 Z" fill="#F5E9D2" ${O}/><path d="M18 88 L14 94" stroke="#C8323B" stroke-width="3" stroke-linecap="round"/>`)
      );
    case 'shrimp': // antenna clips: two clips at the top with springy antennae
      return (
        `<path d="M38 24 Q30 6 14 8" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/><path d="M38 24 Q30 6 14 8" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M62 24 Q70 6 86 8" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/><path d="M62 24 Q70 6 86 8" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>` +
        `<circle cx="13" cy="8" r="4.5" fill="${GOLD}" ${O3}/><circle cx="87" cy="8" r="4.5" fill="${GOLD}" ${O3}/>` +
        `<rect x="30" y="20" width="14" height="7" rx="3" fill="${GOLD}" ${O3}/><rect x="56" y="20" width="14" height="7" rx="3" fill="${GOLD}" ${O3}/>`
      );
    case 'wasabi': // a single big leaf sprouting from the top, tilted
      return (
        `<path d="M50 24 Q52 12 50 4" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M50 24 Q52 12 50 4" fill="none" stroke="#3F8F3A" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M50 6 Q30 -6 22 14 Q34 22 50 6 Z" fill="#5DBB57" ${O}/><path d="M50 6 Q62 -8 78 8 Q66 22 50 6 Z" fill="#7BD170" ${O}/>` +
        `<path d="M50 6 L30 12 M50 6 L66 6" fill="none" stroke="#2F7A2B" stroke-width="2"/>` +
        `<path d="M36 6 Q40 2 46 3" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>`
      );
    default:
      return '';
  }
}

/** VIP: gold trim, not a recolour. A gold band along the base and a pin on the prop. */
function vipTrim(shape: BodyShape): string {
  const band =
    shape === 'squircle'
      ? `<path d="M22 84 Q50 96 78 84" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`
      : shape === 'egg'
        ? `<path d="M26 82 Q50 100 74 82" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`
        : `<path d="M24 82 Q50 98 76 82" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`;
  return (
    band +
    `<circle cx="70" cy="20" r="5" fill="${GOLD}" ${O3}/><circle cx="69" cy="19" r="1.6" fill="#fff" opacity=".8"/>`
  );
}

const FEET = `<ellipse cx="38" cy="92" rx="8" ry="4.5" fill="${INK}" opacity=".85"/><ellipse cx="63" cy="93" rx="8" ry="4.5" fill="${INK}" opacity=".85"/>`;

/** Restaurant outfits sit on the body below the face, so they never fight a character's prop. */
export function outfitSvg(outfit: OutfitId, view: SpriteView = 'front'): string {
  if (view === 'back') {
    // From behind only the collar shows.
    switch (outfit) {
      case 'bowtie':
        return `<path d="M32 76 Q50 84 68 76" fill="none" stroke="#C8323B" stroke-width="4" stroke-linecap="round"/>`;
      case 'tuxedo':
        return `<path d="M30 74 Q50 86 70 74" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M30 74 Q50 86 70 74" fill="none" stroke="#F5E9D2" stroke-width="2"/>`;
      case 'yukata':
        return `<path d="M28 68 Q50 82 72 68" fill="none" stroke="#3A5FA8" stroke-width="7" stroke-linecap="round"/><rect x="33" y="84" width="34" height="6" rx="2" fill="#C8323B"/>`;
      case 'suit':
        return `<path d="M26 72 Q50 94 74 72" fill="none" stroke="#C9D3E0" stroke-width="6" stroke-linecap="round"/>`;
      default:
        return '';
    }
  }
  switch (outfit) {
    case 'bowtie':
      return (
        `<path d="M36 70 L50 76 L36 82 Z" fill="#C8323B" ${O3}/>` +
        `<path d="M64 70 L50 76 L64 82 Z" fill="#C8323B" ${O3}/>` +
        `<circle cx="50" cy="76" r="3.5" fill="#8F1F27"/>`
      );
    case 'tuxedo':
      return (
        `<path d="M38 66 L50 80 L62 66 L58 66 L50 74 L42 66 Z" fill="#F5E9D2" stroke="${INK}" stroke-width="1.5"/>` +
        `<path d="M40 72 L50 77 L40 82 Z" fill="${INK}"/><path d="M60 72 L50 77 L60 82 Z" fill="${INK}"/>` +
        `<circle cx="50" cy="77" r="2.6" fill="${GOLD}"/>`
      );
    case 'yukata':
      return (
        `<path d="M28 60 L50 84 L72 60" fill="none" stroke="#3A5FA8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M30 61 L50 83" fill="none" stroke="#F5E9D2" stroke-width="2.5"/>` +
        `<rect x="33" y="84" width="34" height="6" rx="2" fill="#C8323B"/>`
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
  outfit: OutfitId = 'none',
  view: SpriteView = 'front'
): string {
  const c = CHARACTERS[color] || CHARACTERS[0];
  const base = COLORS[color].hex;
  const hi = lighten(base, 0.34),
    lo = darken(base, 0.22);
  const back = view === 'back';
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 100 100" width="100" height="100">` +
    `<defs><radialGradient id="g" cx="${back ? '30%' : '36%'}" cy="30%" r="80%"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/></radialGradient>` +
    `<filter id="sh" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2"/></filter>` +
    `<filter id="dim" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.72 0 0 0 0 0 0.72 0 0 0 0 0 0.72 0 0 0 0 0 1 0"/></filter></defs>` +
    `<ellipse cx="52" cy="94" rx="31" ry="5.5" fill="${INK}" opacity=".26" filter="url(#sh)"/>` +
    (dim ? '<g filter="url(#dim)">' : '<g>') +
    (state === 'walk' && !back ? FEET : '') +
    body(c.shape) +
    lighting(c.shape) +
    (back ? faceBack(state) : face(state, base)) +
    outfitSvg(outfit, view) +
    prop(c, base, view) +
    (vip ? vipTrim(c.shape) : '') +
    `</g></svg>`
  );
}
