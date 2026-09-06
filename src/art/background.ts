/* The restaurant as layers: header bar, wall (light wood slats over paper), rail, ledge inside the belt,
   counter, floor. Decor pieces are separate SVGs so the scene can animate them. All in game units (480x900). */

const HEAD = 'http://www.w3.org/2000/svg';

export const PALETTE = {
  headerDark: '#2B2622',
  wallWood: '#D9A86C',
  wallWoodDark: '#C8955A',
  wallWoodLine: '#A9773F',
  rail: '#5A4E45',
  paper: '#FBF3E4',
  paperLine: '#E7DAC0',
  counterTop: '#C9924F',
  counterBottom: '#A86F35',
  counterEdge: '#E4B57A',
  counterLine: '#8F5A27',
  floor: '#EFE4C8',
  floorLine: '#D8C9A4',
  floorDark: '#E6D8B6',
  ledge: '#8B5A2B',
  ledgeEdge: '#B57A3E',
};

function wall(): string {
  let slats = '';
  for (let x = 0; x < 480; x += 40)
    slats += `<rect x="${x}" y="76" width="40" height="120" fill="${x % 80 ? PALETTE.wallWood : PALETTE.wallWoodDark}"/><line x1="${x + 0.5}" y1="76" x2="${x + 0.5}" y2="196" stroke="${PALETTE.wallWoodLine}" stroke-opacity=".45" stroke-width="1.5"/>`;
  let lines = '';
  for (let y = 236; y < 424; y += 36)
    lines += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${PALETTE.paperLine}" stroke-width="1"/>`;
  return (
    `<rect x="0" y="196" width="480" height="228" fill="${PALETTE.paper}"/>` +
    lines +
    slats +
    `<rect x="0" y="176" width="480" height="20" fill="#000" opacity=".07"/>` +
    `<rect x="0" y="194" width="480" height="7" rx="2" fill="${PALETTE.rail}"/><rect x="0" y="194" width="480" height="2" fill="#fff" opacity=".18"/>`
  );
}

/** A low wooden ledge inside the belt loop with a few house items. */
function ledge(): string {
  return (
    `<rect x="84" y="336" width="312" height="36" rx="6" fill="${PALETTE.ledge}"/>` +
    `<rect x="84" y="336" width="312" height="5" rx="2" fill="${PALETTE.ledgeEdge}"/>` +
    `<rect x="90" y="372" width="300" height="6" fill="#000" opacity=".12"/>` +
    // sake bottle
    `<path d="M186 336 L186 314 Q186 308 192 306 L192 296 L200 296 L200 306 Q206 308 206 314 L206 336 Z" fill="#3B5B6E" stroke="#22394A" stroke-width="2"/>` +
    `<rect x="189" y="318" width="14" height="10" rx="2" fill="#FBF3E4"/>` +
    // stacked bowls
    `<ellipse cx="238" cy="334" rx="16" ry="4" fill="#B24A3A"/><path d="M222 334 Q238 344 254 334 Z" fill="#8F3A2D"/>` +
    `<ellipse cx="238" cy="326" rx="14" ry="3.5" fill="#E5484D"/><path d="M224 326 Q238 335 252 326 Z" fill="#B3202A"/>` +
    // teapot
    `<ellipse cx="284" cy="326" rx="14" ry="10" fill="#4A7C59" stroke="#2F5A3B" stroke-width="2"/>` +
    `<path d="M296 322 Q308 318 306 330" fill="none" stroke="#2F5A3B" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="278" y="312" width="12" height="6" rx="2" fill="#2F5A3B"/>`
  );
}

function counter(): string {
  let grain = '';
  for (let i = 0; i < 3; i++) {
    const y = 430 + i * 44;
    grain += `<rect x="0" y="${y}" width="480" height="42" rx="3" fill="${i % 2 ? PALETTE.counterBottom : PALETTE.counterTop}"/>`;
    grain += `<path d="M0 ${y + 14} Q120 ${y + 8} 240 ${y + 16} T480 ${y + 12}" fill="none" stroke="${PALETTE.counterLine}" stroke-opacity=".28" stroke-width="1.5"/>`;
    grain += `<path d="M0 ${y + 30} Q160 ${y + 36} 320 ${y + 26} T480 ${y + 32}" fill="none" stroke="${PALETTE.counterLine}" stroke-opacity=".22" stroke-width="1.2"/>`;
  }
  return (
    `<rect x="0" y="424" width="480" height="142" fill="${PALETTE.counterBottom}"/>` +
    grain +
    `<ellipse cx="150" cy="470" rx="6" ry="4" fill="${PALETTE.counterLine}" opacity=".35"/><ellipse cx="392" cy="512" rx="7" ry="4.5" fill="${PALETTE.counterLine}" opacity=".35"/>` +
    `<rect x="0" y="424" width="480" height="6" fill="${PALETTE.counterEdge}"/>` +
    `<rect x="0" y="558" width="480" height="8" fill="#000" opacity=".18"/>`
  );
}

function floor(): string {
  let weave = '';
  for (let y = 566; y < 900; y += 6)
    weave += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${PALETTE.floorLine}" stroke-opacity=".35" stroke-width="1"/>`;
  return (
    `<rect x="0" y="566" width="480" height="334" fill="${PALETTE.floor}"/>` +
    weave +
    `<rect x="0" y="566" width="240" height="334" fill="${PALETTE.floorDark}" opacity=".35"/>` +
    `<rect x="238" y="566" width="4" height="334" fill="${PALETTE.floorLine}"/>` +
    `<rect x="0" y="566" width="480" height="10" fill="#000" opacity=".08"/>`
  );
}

/** Everything static in the scene, composed once per decor set. */
export function backgroundSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 480 900" width="480" height="900">` +
    `<rect x="0" y="0" width="480" height="76" fill="${PALETTE.headerDark}"/>` +
    wall() +
    ledge() +
    counter() +
    floor() +
    `</svg>`
  );
}

/* ---------- decor ---------- */

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
