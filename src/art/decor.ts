/* Decor pieces for the later restaurants, plus the registry that maps every decor id to its sprite and slot
   box. Sign-slot pieces (neon, holo) are drawn as glowing canvas text by the scene and have no sprite. */

import type { DecorSlot } from '../data/themes';
import { bonsaiSvg, lanternSvg, norenSvg, tankSvg } from './background';

const HEAD = 'http://www.w3.org/2000/svg';

/** Diner: a chrome jukebox on the ledge. */
export function jukeboxSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="32" cy="60" rx="22" ry="4" fill="#000" opacity=".15"/>` +
    `<path d="M14 60 L14 26 Q14 6 32 6 Q50 6 50 26 L50 60 Z" fill="#C63D3D" stroke="#7A1F1F" stroke-width="2"/>` +
    `<path d="M19 58 L19 28 Q19 12 32 12 Q45 12 45 28 L45 58 Z" fill="#E6E9EE"/>` +
    `<path d="M22 30 Q32 18 42 30 Z" fill="#F2B705"/><rect x="22" y="32" width="20" height="4" fill="#1FB7D8"/><rect x="22" y="38" width="20" height="4" fill="#E5484D"/>` +
    `<circle cx="32" cy="50" r="6" fill="#2A2320"/><circle cx="32" cy="50" r="2" fill="#F2B705"/>` +
    `<rect x="12" y="56" width="40" height="6" rx="2" fill="#9AA3AD"/>` +
    `</svg>`
  );
}

/** Rooftop: a string of bulbs across the rail. */
export function lightsSvg(): string {
  let bulbs = '';
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 35,
      y = 14 + Math.sin(i * 1.1) * 6;
    bulbs += `<line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y}" stroke="#3B2F26" stroke-width="2"/><circle cx="${x}" cy="${y + 6}" r="6" fill="${['#F2B705', '#FF9EB5', '#6EE7FF', '#2FB36B'][i % 4]}"/><circle cx="${x - 2}" cy="${y + 4}" r="2" fill="#fff" opacity=".7"/>`;
  }
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 320 44" width="320" height="44">` +
    `<path d="M0 6 Q80 22 160 6 T320 6" fill="none" stroke="#3B2F26" stroke-width="2"/>` +
    bulbs +
    `</svg>`
  );
}

/** Rooftop: a potted palm. */
export function palmSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="32" cy="60" rx="20" ry="4" fill="#000" opacity=".15"/>` +
    `<path d="M20 44 L44 44 L40 60 L24 60 Z" fill="#8A6A45" stroke="#5C4630" stroke-width="2"/>` +
    `<path d="M32 44 Q34 30 32 18" fill="none" stroke="#7A5230" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M32 20 Q14 10 6 20 Q18 18 32 24 Z" fill="#2FB36B"/><path d="M32 20 Q50 10 58 20 Q46 18 32 24 Z" fill="#3CC57A"/>` +
    `<path d="M32 18 Q20 2 10 6 Q22 8 32 20 Z" fill="#3CC57A"/><path d="M32 18 Q44 2 54 6 Q42 8 32 20 Z" fill="#2FB36B"/>` +
    `<path d="M32 16 Q32 2 36 0 Q34 8 32 18 Z" fill="#1F8A4E"/>` +
    `</svg>`
  );
}

/** Rooftop: a cocktail tray. */
export function cocktailSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 92 52" width="92" height="52">` +
    `<ellipse cx="46" cy="48" rx="40" ry="4" fill="#000" opacity=".15"/>` +
    `<ellipse cx="46" cy="44" rx="40" ry="6" fill="#C9A45C"/>` +
    `<path d="M14 14 L38 14 L26 30 Z" fill="#8FD3F5" fill-opacity=".85" stroke="#C9A45C" stroke-width="2"/><rect x="25" y="30" width="2" height="10" fill="#C9A45C"/><circle cx="34" cy="12" r="4" fill="#E5484D"/>` +
    `<rect x="48" y="16" width="14" height="24" rx="3" fill="#F5843B" fill-opacity=".85" stroke="#C9A45C" stroke-width="2"/><rect x="47" y="12" width="16" height="5" rx="2" fill="#F2B705"/>` +
    `<path d="M68 10 L84 10 L80 40 L72 40 Z" fill="#2FB36B" fill-opacity=".8" stroke="#C9A45C" stroke-width="2"/><rect x="72" y="4" width="8" height="7" fill="#1FB7D8"/>` +
    `</svg>`
  );
}

/** Ryokan: a hanging scroll (kakejiku). */
export function scrollSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 48 72" width="48" height="72">` +
    `<line x1="24" y1="0" x2="24" y2="6" stroke="#6B4C33" stroke-width="2"/>` +
    `<rect x="6" y="5" width="36" height="5" rx="2.5" fill="#3B2F26"/>` +
    `<rect x="9" y="10" width="30" height="52" fill="#F7F1E3" stroke="#B9A98A" stroke-width="1.5"/>` +
    `<rect x="12" y="13" width="24" height="46" fill="#FBF6EA"/>` +
    `<path d="M18 26 Q24 18 30 26 M17 34 Q24 40 31 34 M20 44 L28 44 M24 40 L24 52" fill="none" stroke="#2A2320" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="32" cy="54" r="3" fill="#E5484D"/>` +
    `<rect x="6" y="62" width="36" height="5" rx="2.5" fill="#3B2F26"/>` +
    `</svg>`
  );
}

/** Ryokan: ikebana in a low bowl. */
export function ikebanaSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="32" cy="60" rx="22" ry="4" fill="#000" opacity=".15"/>` +
    `<path d="M10 50 Q32 60 54 50 L52 58 Q32 64 12 58 Z" fill="#2A2320"/><ellipse cx="32" cy="50" rx="22" ry="5" fill="#3B2F26"/>` +
    `<path d="M32 50 Q30 34 36 18" fill="none" stroke="#5A3A1E" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M32 48 Q20 40 14 26" fill="none" stroke="#4A7C59" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M33 46 Q46 40 50 30" fill="none" stroke="#4A7C59" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="36" cy="16" r="6" fill="#FF9EB5"/><circle cx="36" cy="16" r="2.5" fill="#F2B705"/>` +
    `<circle cx="14" cy="26" r="4.5" fill="#E5484D"/><ellipse cx="50" cy="30" rx="5" ry="3" fill="#2FB36B" transform="rotate(-30 50 30)"/>` +
    `</svg>`
  );
}

/** Ryokan: a stone lantern with a warm flame. */
export function stonelampSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 92 52" width="92" height="52">` +
    `<ellipse cx="46" cy="48" rx="26" ry="4" fill="#000" opacity=".15"/>` +
    `<rect x="30" y="42" width="32" height="6" rx="2" fill="#8A8F9C"/>` +
    `<rect x="40" y="30" width="12" height="12" fill="#9AA3AD"/>` +
    `<path d="M26 30 L66 30 L60 18 L32 18 Z" fill="#B8BEC6" stroke="#6B7280" stroke-width="1.5"/>` +
    `<rect x="36" y="18" width="20" height="12" fill="#5E6670"/><rect x="41" y="20" width="10" height="8" fill="#F2B705"/><circle cx="46" cy="24" r="2.5" fill="#FFF3C4"/>` +
    `<path d="M22 18 L70 18 L46 4 Z" fill="#8A8F9C" stroke="#6B7280" stroke-width="1.5"/><circle cx="46" cy="4" r="3" fill="#6B7280"/>` +
    `</svg>`
  );
}

/** Station: a serving arm on the ledge. */
export function robotSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 92 52" width="92" height="52">` +
    `<ellipse cx="46" cy="48" rx="30" ry="4" fill="#000" opacity=".2"/>` +
    `<rect x="26" y="38" width="40" height="10" rx="3" fill="#34465C" stroke="#7EA0C8" stroke-width="2"/>` +
    `<path d="M46 38 L40 22 L58 14" fill="none" stroke="#9AA3AD" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="40" cy="22" r="4" fill="#6EE7FF"/><circle cx="46" cy="38" r="4" fill="#6EE7FF"/>` +
    `<path d="M58 14 L70 8 M58 14 L72 18" fill="none" stroke="#C9D3E0" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="74" cy="12" r="6" fill="#FFFDF7" stroke="#E5484D" stroke-width="2"/>` +
    `<circle cx="32" cy="43" r="2" fill="#2FB36B"/><circle cx="60" cy="43" r="2" fill="#E5484D"/>` +
    `</svg>`
  );
}

/** Station: a space cactus under a glass dome. */
export function cactusSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="32" cy="60" rx="22" ry="4" fill="#000" opacity=".2"/>` +
    `<rect x="12" y="50" width="40" height="8" rx="3" fill="#5E7B9C"/>` +
    `<path d="M14 50 Q14 14 32 14 Q50 14 50 50 Z" fill="#6EE7FF" fill-opacity=".2" stroke="#6EE7FF" stroke-width="2"/>` +
    `<rect x="26" y="26" width="12" height="24" rx="6" fill="#2FB36B" stroke="#1F8A4E" stroke-width="2"/>` +
    `<rect x="18" y="32" width="7" height="12" rx="3.5" fill="#3CC57A" stroke="#1F8A4E" stroke-width="2"/><rect x="39" y="30" width="7" height="12" rx="3.5" fill="#3CC57A" stroke="#1F8A4E" stroke-width="2"/>` +
    `<circle cx="32" cy="24" r="4" fill="#FF9EB5"/>` +
    `<path d="M22 18 Q32 10 42 18" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>` +
    `</svg>`
  );
}

export interface DecorArt {
  svg: () => string;
  w: number;
  h: number;
}

/** Sprite and box per decor id; sign-slot pieces have none. */
export const DECOR_ART: Record<string, DecorArt> = {
  noren: { svg: norenSvg, w: 320, h: 44 },
  lantern: { svg: lanternSvg, w: 48, h: 72 },
  plant: { svg: bonsaiSvg, w: 64, h: 64 },
  tank: { svg: tankSvg, w: 92, h: 52 },
  jukebox: { svg: jukeboxSvg, w: 64, h: 64 },
  lights: { svg: lightsSvg, w: 320, h: 44 },
  palm: { svg: palmSvg, w: 64, h: 64 },
  cocktail: { svg: cocktailSvg, w: 92, h: 52 },
  scroll: { svg: scrollSvg, w: 48, h: 72 },
  ikebana: { svg: ikebanaSvg, w: 64, h: 64 },
  stonelamp: { svg: stonelampSvg, w: 92, h: 52 },
  robot: { svg: robotSvg, w: 92, h: 52 },
  cactus: { svg: cactusSvg, w: 64, h: 64 },
};

/** Where each slot sits in the scene (game units). */
export const SLOT_BOX: Record<DecorSlot, { x: number; y: number; w: number; h: number }> = {
  hang: { x: 18, y: 80, w: 48, h: 72 },
  band: { x: 80, y: 192, w: 320, h: 44 },
  ledgeL: { x: 60, y: 314, w: 64, h: 64 },
  ledgeR: { x: 322, y: 328, w: 92, h: 52 },
  sign: { x: 240, y: 268, w: 0, h: 0 },
};
