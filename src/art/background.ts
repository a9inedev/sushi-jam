/* The restaurant as layers: header bar, upper wall, rail, lower wall behind the belt, ledge inside the belt,
   counter, floor. Every colour comes from the theme's room palette (src/data/themes.ts) and each restaurant
   dresses the same layers its own way: slats for the stall, tiles and a checker floor for the diner, a night
   skyline for the rooftop, shoji and tatami for the ryokan, panels and a porthole for the station. Decor
   pieces are separate SVGs so the scene can animate them. All in game units (480x900). */

import { THEMES, type RoomPalette, type ThemeDef } from '../data/themes';

const HEAD = 'http://www.w3.org/2000/svg';

/** The street stall palette, the original room. */
export const PALETTE: RoomPalette = THEMES[0].palette;

function wallStall(P: RoomPalette): string {
  let slats = '';
  for (let x = 0; x < 480; x += 40)
    slats += `<rect x="${x}" y="76" width="40" height="120" fill="${x % 80 ? P.wallWood : P.wallWoodDark}"/><line x1="${x + 0.5}" y1="76" x2="${x + 0.5}" y2="196" stroke="${P.wallWoodLine}" stroke-opacity=".45" stroke-width="1.5"/>`;
  // Awning stripes along the top of the stall.
  let awning = '';
  for (let x = 0; x < 480; x += 48)
    awning += `<path d="M${x} 76 L${x + 48} 76 L${x + 48} 96 Q${x + 24} 108 ${x} 96 Z" fill="${x % 96 ? '#FFF7E8' : P.accent}"/>`;
  return slats + awning;
}

function wallDiner(P: RoomPalette): string {
  let tiles = '';
  for (let y = 76; y < 196; y += 30)
    for (let x = 0; x < 480; x += 60) {
      const off = (y / 30) % 2 ? 30 : 0;
      tiles += `<rect x="${x + off - 30}" y="${y}" width="58" height="28" rx="3" fill="${(x / 60 + y / 30) % 2 ? P.wallWood : P.wallWoodDark}" stroke="${P.wallWoodLine}" stroke-width="1"/>`;
    }
  return (
    `<rect x="0" y="76" width="480" height="120" fill="${P.wallWoodLine}"/>` +
    tiles +
    `<rect x="0" y="132" width="480" height="14" fill="#BFE8DC"/><rect x="0" y="132" width="480" height="3" fill="#8FD3C2"/>`
  );
}

function wallRooftop(P: RoomPalette): string {
  const buildings = [
    [0, 96, 44],
    [44, 120, 30],
    [74, 84, 52],
    [126, 110, 36],
    [162, 130, 28],
    [190, 90, 60],
    [250, 118, 34],
    [284, 100, 46],
    [330, 126, 30],
    [360, 92, 54],
    [414, 112, 40],
    [454, 98, 26],
  ];
  let city = '';
  for (const [x, top, w] of buildings) {
    city += `<rect x="${x}" y="${top}" width="${w}" height="${196 - top}" fill="${P.wallWoodDark}"/>`;
    for (let wy = top + 8; wy < 190; wy += 12)
      for (let wx = x + 5; wx < x + w - 6; wx += 10)
        if ((wx * 7 + wy * 13) % 5 !== 0)
          city += `<rect x="${wx}" y="${wy}" width="5" height="6" fill="${P.accent}" opacity="${(wx + wy) % 3 ? 0.55 : 0.9}"/>`;
  }
  let stars = '';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97) % 480,
      sy = 80 + ((i * 53) % 60);
    stars += `<circle cx="${sx}" cy="${sy}" r="${i % 4 ? 1 : 1.6}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`;
  }
  return (
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.headerDark}"/><stop offset="1" stop-color="${P.wallWood}"/></linearGradient></defs>` +
    `<rect x="0" y="76" width="480" height="120" fill="url(#sky)"/>` +
    stars +
    `<circle cx="392" cy="106" r="16" fill="#FFF3C4"/><circle cx="386" cy="102" r="14" fill="${P.wallWood}" opacity=".9"/>` +
    city
  );
}

function wallRyokan(P: RoomPalette): string {
  let lattice = '';
  for (let x = 0; x <= 480; x += 40)
    lattice += `<rect x="${x - 2}" y="76" width="4" height="120" fill="${P.wallWoodLine}"/>`;
  for (let y = 76; y <= 196; y += 30)
    lattice += `<rect x="0" y="${y - 1.5}" width="480" height="3" fill="${P.wallWoodLine}"/>`;
  return (
    `<rect x="0" y="76" width="480" height="120" fill="${P.wallWood}"/>` +
    lattice +
    `<rect x="0" y="76" width="480" height="8" fill="${P.wallWoodLine}"/>`
  );
}

function wallStation(P: RoomPalette): string {
  let panels = '';
  for (let x = 0; x < 480; x += 96)
    panels +=
      `<rect x="${x + 3}" y="80" width="90" height="112" rx="8" fill="${(x / 96) % 2 ? P.wallWood : P.wallWoodDark}" stroke="${P.wallWoodLine}" stroke-width="2"/>` +
      `<circle cx="${x + 12}" cy="89" r="2" fill="${P.wallWoodLine}"/><circle cx="${x + 84}" cy="89" r="2" fill="${P.wallWoodLine}"/><circle cx="${x + 12}" cy="183" r="2" fill="${P.wallWoodLine}"/><circle cx="${x + 84}" cy="183" r="2" fill="${P.wallWoodLine}"/>`;
  let stars = '';
  for (let i = 0; i < 24; i++) {
    const a = (i * 137.5 * Math.PI) / 180,
      r = 6 + ((i * 29) % 40);
    stars += `<circle cx="${(240 + Math.cos(a) * r).toFixed(1)}" cy="${(136 + Math.sin(a) * r).toFixed(1)}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity=".8"/>`;
  }
  return (
    `<rect x="0" y="76" width="480" height="120" fill="${P.wallWoodLine}"/>` +
    panels +
    `<circle cx="240" cy="136" r="52" fill="#060914" stroke="${P.rail}" stroke-width="6"/>` +
    stars +
    `<circle cx="262" cy="150" r="14" fill="#E5484D"/><ellipse cx="262" cy="150" rx="24" ry="5" fill="none" stroke="${P.accent}" stroke-width="2" transform="rotate(-20 262 150)"/>` +
    `<rect x="0" y="180" width="480" height="4" fill="${P.accent}" opacity=".7"/>`
  );
}

function wall(t: ThemeDef): string {
  const P = t.palette;
  let lines = '';
  for (let y = 236; y < 424; y += 36)
    lines += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${P.paperLine}" stroke-width="1"/>`;
  const upper =
    t.id === 'diner'
      ? wallDiner(P)
      : t.id === 'rooftop'
        ? wallRooftop(P)
        : t.id === 'ryokan'
          ? wallRyokan(P)
          : t.id === 'station'
            ? wallStation(P)
            : wallStall(P);
  // Rooftop: the lower wall is a glass railing over the city.
  const lower =
    t.id === 'rooftop'
      ? `<rect x="0" y="196" width="480" height="228" fill="${P.paper}"/>` +
        lines +
        [40, 120, 200, 280, 360, 440]
          .map((x) => `<rect x="${x - 3}" y="196" width="6" height="228" fill="${P.rail}" opacity=".8"/>`)
          .join('') +
        `<rect x="0" y="210" width="480" height="3" fill="${P.rail}" opacity=".6"/>`
      : `<rect x="0" y="196" width="480" height="228" fill="${P.paper}"/>` + lines;
  return (
    lower +
    upper +
    `<rect x="0" y="176" width="480" height="20" fill="#000" opacity=".07"/>` +
    `<rect x="0" y="194" width="480" height="7" rx="2" fill="${P.rail}"/><rect x="0" y="194" width="480" height="2" fill="#fff" opacity=".18"/>`
  );
}

/** The house items on the ledge inside the belt loop, per restaurant. */
function ledgeItems(t: ThemeDef): string {
  switch (t.id) {
    case 'diner':
      return (
        // ketchup and mustard, a milkshake
        `<rect x="184" y="304" width="14" height="32" rx="5" fill="#E5484D" stroke="#9E2B2B" stroke-width="2"/><rect x="188" y="298" width="6" height="8" fill="#9E2B2B"/>` +
        `<rect x="204" y="308" width="14" height="28" rx="5" fill="#F2B705" stroke="#B8860B" stroke-width="2"/><rect x="208" y="302" width="6" height="8" fill="#B8860B"/>` +
        `<path d="M262 306 L286 306 L282 336 L266 336 Z" fill="#FBF7F2" stroke="#B8BEC6" stroke-width="2"/><ellipse cx="274" cy="306" rx="13" ry="5" fill="#FF9EB5"/><rect x="273" y="288" width="3" height="20" fill="#E63946"/>`
      );
    case 'rooftop':
      return (
        // cocktail glass, a candle, a small bucket
        `<path d="M176 306 L204 306 L190 324 Z" fill="#8FD3F5" fill-opacity=".8" stroke="#C9A45C" stroke-width="2"/><rect x="189" y="324" width="2" height="10" fill="#C9A45C"/><rect x="182" y="334" width="16" height="3" fill="#C9A45C"/><circle cx="198" cy="303" r="4" fill="#2FB36B"/>` +
        `<rect x="234" y="316" width="12" height="20" rx="2" fill="#FFF3C4"/><ellipse cx="240" cy="312" rx="3" ry="6" fill="#F2B705"/>` +
        `<path d="M270 312 L298 312 L294 336 L274 336 Z" fill="#9AA3AD" stroke="#5E6670" stroke-width="2"/><ellipse cx="284" cy="312" rx="14" ry="4" fill="#C9D3E0"/>`
      );
    case 'ryokan':
      return (
        // tea set on a tray
        `<rect x="176" y="326" width="120" height="10" rx="3" fill="#3B2F26"/>` +
        `<ellipse cx="200" cy="322" rx="12" ry="8" fill="#4A7C59" stroke="#2F5A3B" stroke-width="2"/><path d="M211 318 Q222 314 220 326" fill="none" stroke="#2F5A3B" stroke-width="3" stroke-linecap="round"/><rect x="195" y="309" width="10" height="5" rx="2" fill="#2F5A3B"/>` +
        `<rect x="228" y="312" width="12" height="14" rx="3" fill="#F7F1E3" stroke="#6B4C33" stroke-width="1.5"/><rect x="246" y="312" width="12" height="14" rx="3" fill="#F7F1E3" stroke="#6B4C33" stroke-width="1.5"/>` +
        `<ellipse cx="278" cy="322" rx="10" ry="4" fill="#B24A3A"/><path d="M268 322 Q278 330 288 322 Z" fill="#8F3A2D"/>`
      );
    case 'station':
      return (
        // a flask and a floating cube
        `<path d="M188 306 L188 318 L178 336 L206 336 L196 318 L196 306 Z" fill="#6EE7FF" fill-opacity=".5" stroke="#7EA0C8" stroke-width="2"/><rect x="185" y="302" width="14" height="5" rx="1" fill="#7EA0C8"/>` +
        `<path d="M262 300 L278 308 L278 326 L262 334 L246 326 L246 308 Z" fill="#1E2A40" stroke="#6EE7FF" stroke-width="2"/><path d="M246 308 L262 316 L278 308 M262 316 L262 334" fill="none" stroke="#6EE7FF" stroke-width="1.5"/>` +
        `<ellipse cx="262" cy="338" rx="16" ry="3" fill="#6EE7FF" opacity=".35"/>`
      );
    default:
      return (
        // sake bottle, stacked bowls, teapot
        `<path d="M186 336 L186 314 Q186 308 192 306 L192 296 L200 296 L200 306 Q206 308 206 314 L206 336 Z" fill="#3B5B6E" stroke="#22394A" stroke-width="2"/>` +
        `<rect x="189" y="318" width="14" height="10" rx="2" fill="#FBF3E4"/>` +
        `<ellipse cx="238" cy="334" rx="16" ry="4" fill="#B24A3A"/><path d="M222 334 Q238 344 254 334 Z" fill="#8F3A2D"/>` +
        `<ellipse cx="238" cy="326" rx="14" ry="3.5" fill="#E5484D"/><path d="M224 326 Q238 335 252 326 Z" fill="#B3202A"/>` +
        `<ellipse cx="284" cy="326" rx="14" ry="10" fill="#4A7C59" stroke="#2F5A3B" stroke-width="2"/>` +
        `<path d="M296 322 Q308 318 306 330" fill="none" stroke="#2F5A3B" stroke-width="3" stroke-linecap="round"/>` +
        `<rect x="278" y="312" width="12" height="6" rx="2" fill="#2F5A3B"/>`
      );
  }
}

/** A low ledge inside the belt loop with the house items. */
function ledge(t: ThemeDef): string {
  const P = t.palette;
  return (
    `<rect x="84" y="336" width="312" height="36" rx="6" fill="${P.ledge}"/>` +
    `<rect x="84" y="336" width="312" height="5" rx="2" fill="${P.ledgeEdge}"/>` +
    `<rect x="90" y="372" width="300" height="6" fill="#000" opacity=".12"/>` +
    ledgeItems(t)
  );
}

function counter(t: ThemeDef): string {
  const P = t.palette;
  let grain = '';
  for (let i = 0; i < 3; i++) {
    const y = 430 + i * 44;
    grain += `<rect x="0" y="${y}" width="480" height="42" rx="3" fill="${i % 2 ? P.counterBottom : P.counterTop}"/>`;
    grain += `<path d="M0 ${y + 14} Q120 ${y + 8} 240 ${y + 16} T480 ${y + 12}" fill="none" stroke="${P.counterLine}" stroke-opacity=".28" stroke-width="1.5"/>`;
    grain += `<path d="M0 ${y + 30} Q160 ${y + 36} 320 ${y + 26} T480 ${y + 32}" fill="none" stroke="${P.counterLine}" stroke-opacity=".22" stroke-width="1.2"/>`;
  }
  const glow =
    t.id === 'station' ? `<rect x="0" y="424" width="480" height="12" fill="${P.counterEdge}" opacity=".35"/>` : '';
  return (
    `<rect x="0" y="424" width="480" height="142" fill="${P.counterBottom}"/>` +
    grain +
    `<ellipse cx="150" cy="470" rx="6" ry="4" fill="${P.counterLine}" opacity=".35"/><ellipse cx="392" cy="512" rx="7" ry="4.5" fill="${P.counterLine}" opacity=".35"/>` +
    glow +
    `<rect x="0" y="424" width="480" height="6" fill="${P.counterEdge}"/>` +
    `<rect x="0" y="558" width="480" height="8" fill="#000" opacity=".18"/>`
  );
}

function floor(t: ThemeDef): string {
  const P = t.palette;
  if (t.id === 'diner') {
    let checker = '';
    for (let y = 566; y < 900; y += 40)
      for (let x = 0; x < 480; x += 40)
        if (((x + y) / 40) % 2 === 0)
          checker += `<rect x="${x}" y="${y}" width="40" height="40" fill="${P.floorDark}"/>`;
    return (
      `<rect x="0" y="566" width="480" height="334" fill="${P.floor}"/>` +
      checker +
      `<rect x="0" y="566" width="480" height="10" fill="#000" opacity=".08"/>`
    );
  }
  if (t.id === 'rooftop') {
    let planks = '';
    for (let y = 566; y < 900; y += 28)
      planks += `<rect x="0" y="${y}" width="480" height="26" rx="2" fill="${(y / 28) % 2 ? P.floor : P.floorDark}"/><line x1="0" y1="${y + 27}" x2="480" y2="${y + 27}" stroke="${P.floorLine}" stroke-width="2"/>`;
    return planks + `<rect x="0" y="566" width="480" height="10" fill="#000" opacity=".12"/>`;
  }
  if (t.id === 'station') {
    let grid = '';
    for (let y = 566; y < 900; y += 30)
      grid += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${P.floorLine}" stroke-width="1.5"/>`;
    for (let x = 0; x < 480; x += 60)
      grid += `<line x1="${x + 0.5}" y1="566" x2="${x + 0.5}" y2="900" stroke="${P.floorLine}" stroke-width="1.5"/>`;
    return (
      `<rect x="0" y="566" width="480" height="334" fill="${P.floor}"/>` +
      grid +
      `<rect x="0" y="566" width="480" height="10" fill="#000" opacity=".2"/>`
    );
  }
  let weave = '';
  for (let y = 566; y < 900; y += 6)
    weave += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${P.floorLine}" stroke-opacity=".35" stroke-width="1"/>`;
  const border =
    t.id === 'ryokan'
      ? `<rect x="0" y="566" width="480" height="334" fill="none" stroke="${P.floorLine}" stroke-width="8"/>`
      : '';
  return (
    `<rect x="0" y="566" width="480" height="334" fill="${P.floor}"/>` +
    weave +
    `<rect x="0" y="566" width="240" height="334" fill="${P.floorDark}" opacity=".35"/>` +
    `<rect x="238" y="566" width="4" height="334" fill="${P.floorLine}"/>` +
    border +
    `<rect x="0" y="566" width="480" height="10" fill="#000" opacity=".08"/>`
  );
}

/** Everything static in the scene for a restaurant, composed once and cached per theme. */
export function backgroundSvg(t: ThemeDef = THEMES[0]): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 480 900" width="480" height="900">` +
    `<rect x="0" y="0" width="480" height="76" fill="${t.palette.headerDark}"/>` +
    wall(t) +
    ledge(t) +
    counter(t) +
    floor(t) +
    `</svg>`
  );
}

/* ---------- the original decor ---------- */

export function norenSvg(): string {
  let panels = '';
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 52;
    panels +=
      `<rect x="${x}" y="4" width="46" height="34" rx="4" fill="${i % 2 ? '#26336B' : '#2E3F82'}" stroke="#1B2550" stroke-width="1.5"/>` +
      `<path d="M${x + 6} 26 Q${x + 16} 16 ${x + 24} 26 Q${x + 32} 36 ${x + 40} 26" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-linecap="round"/>` +
      `<circle cx="${x + 23}" cy="13" r="3" fill="#E5484D"/>`;
  }
  return `<svg xmlns="${HEAD}" viewBox="0 0 320 44" width="320" height="44"><rect x="0" y="0" width="320" height="4" fill="#5A4E45"/>${panels}</svg>`;
}

export function lanternSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 48 72" width="48" height="72">` +
    `<defs><radialGradient id="l" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FF7A6E"/><stop offset=".6" stop-color="#E5484D"/><stop offset="1" stop-color="#B3202A"/></radialGradient></defs>` +
    `<line x1="24" y1="0" x2="24" y2="10" stroke="#5A4E45" stroke-width="2"/>` +
    `<rect x="16" y="9" width="16" height="6" rx="2" fill="#F2B705"/>` +
    `<ellipse cx="24" cy="38" rx="18" ry="24" fill="url(#l)" stroke="#8E1F30" stroke-width="1.5"/>` +
    `<g fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.5"><ellipse cx="24" cy="38" rx="6" ry="24"/><ellipse cx="24" cy="38" rx="12" ry="24"/><line x1="6" y1="30" x2="42" y2="30"/><line x1="6" y1="46" x2="42" y2="46"/></g>` +
    `<rect x="16" y="60" width="16" height="6" rx="2" fill="#F2B705"/><line x1="24" y1="66" x2="24" y2="72" stroke="#F2B705" stroke-width="2"/>` +
    `</svg>`
  );
}

export function bonsaiSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="32" cy="60" rx="22" ry="4" fill="#000" opacity=".15"/>` +
    `<path d="M12 50 L52 50 L48 60 L16 60 Z" fill="#7A4B22" stroke="#5A3A1E" stroke-width="2"/><rect x="10" y="46" width="44" height="6" rx="2" fill="#9B6234"/>` +
    `<path d="M32 46 Q38 34 28 26 Q22 20 30 12" fill="none" stroke="#5A3A1E" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M30 30 Q40 30 46 22" fill="none" stroke="#5A3A1E" stroke-width="3.5" stroke-linecap="round"/>` +
    `<ellipse cx="22" cy="20" rx="14" ry="8" fill="#2FB36B" stroke="#1F8A4E" stroke-width="2"/>` +
    `<ellipse cx="46" cy="18" rx="12" ry="7" fill="#3CC57A" stroke="#1F8A4E" stroke-width="2"/>` +
    `<ellipse cx="32" cy="8" rx="11" ry="6.5" fill="#2FB36B" stroke="#1F8A4E" stroke-width="2"/>` +
    `</svg>`
  );
}

export function tankSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 92 52" width="92" height="52">` +
    `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3F5" stop-opacity=".55"/><stop offset="1" stop-color="#3E9AD1" stop-opacity=".7"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="88" height="48" rx="6" fill="url(#w)"/>` +
    `<path d="M6 44 Q20 38 34 44 T62 44 T88 44 L88 48 L6 48 Z" fill="#B99B6B"/>` +
    `<path d="M14 44 Q10 32 16 24 Q20 32 18 44" fill="#2FB36B"/><path d="M22 44 Q24 30 20 20 Q28 28 26 44" fill="#3CC57A"/>` +
    `<path d="M10 8 Q30 4 50 8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="2" y="2" width="88" height="48" rx="6" fill="none" stroke="#5A4E45" stroke-width="3"/>` +
    `</svg>`
  );
}
