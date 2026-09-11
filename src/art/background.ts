/* The restaurant as layers, back to front: the header band, the back wall with shelves, bottles and a hanging
   light, the lower wall behind the belt, the ledge inside the loop, the counter with wood grain and a lacquer
   edge, the floor, and a faint vignette. Every colour comes from the theme's room palette (src/data/themes.ts)
   and each restaurant dresses the same layers its own way. Decor pieces are separate SVGs so the scene can
   animate them. All in game units (480x900). */

import { THEMES, type RoomPalette, type ThemeDef } from '../data/themes';
import { INK, darken, lighten } from './color';

const HEAD = 'http://www.w3.org/2000/svg';

/** The street stall palette, the original room. */
export const PALETTE: RoomPalette = THEMES[0].palette;

const f = (v: number) => (Math.round(v * 10) / 10).toString();

/** A bottle on a shelf: body, neck, label, highlight, chocolate outline. */
function bottle(x: number, y: number, w: number, h: number, fill: string, label: string): string {
  const nw = w * 0.4,
    nh = h * 0.28;
  return (
    `<rect x="${x + w / 2 - nw / 2}" y="${y}" width="${nw}" height="${nh + 4}" rx="2" fill="${darken(fill, 0.25)}" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="${x}" y="${y + nh}" width="${w}" height="${h - nh}" rx="${w * 0.25}" fill="${fill}" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="${x + 2}" y="${y + nh + (h - nh) * 0.35}" width="${w - 4}" height="${(h - nh) * 0.3}" fill="${label}" opacity=".9"/>` +
    `<rect x="${x + 2.5}" y="${y + nh + 3}" width="${w * 0.2}" height="${(h - nh) * 0.5}" rx="1.5" fill="#fff" opacity=".35"/>`
  );
}

/** A wooden shelf with an occlusion shadow under it. */
function shelf(x: number, y: number, w: number, P: RoomPalette): string {
  return (
    `<rect x="${x}" y="${y + 6}" width="${w}" height="8" rx="2" fill="${INK}" opacity=".28"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="8" rx="2" fill="${P.wood}" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="${x + 2}" y="${y + 1.5}" width="${w - 4}" height="2" fill="#fff" opacity=".3"/>`
  );
}

/** A pendant lamp with a warm cone below it. */
function pendant(x: number, y: number, P: RoomPalette): string {
  return (
    `<line x1="${x}" y1="76" x2="${x}" y2="${y}" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="${x}" cy="${y + 40}" rx="70" ry="34" fill="url(#lamp)"/>` +
    `<path d="M${x - 18} ${y + 12} L${x - 8} ${y} L${x + 8} ${y} L${x + 18} ${y + 12} Z" fill="${P.lacquer}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<ellipse cx="${x}" cy="${y + 12}" rx="18" ry="4" fill="${P.glow}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M${x - 14} ${y + 3} L${x - 8} ${y + 1}" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`
  );
}

/* ---------- back walls ---------- */

function wallStall(P: RoomPalette): string {
  // Indigo plaster at dusk, two shelves of bottles and jars, a pendant, a bamboo trim along the rail.
  let boards = '';
  for (let x = 0; x < 480; x += 60)
    boards += `<line x1="${x + 0.5}" y1="76" x2="${x + 0.5}" y2="196" stroke="${P.wallWoodLine}" stroke-opacity=".5" stroke-width="1.5"/>`;
  const bottles =
    bottle(40, 104, 14, 34, '#3B5B6E', '#F5E9D2') +
    bottle(58, 110, 12, 28, '#8F1F27', '#E9B949') +
    bottle(76, 100, 16, 38, '#4A7C59', '#F5E9D2') +
    `<rect x="98" y="118" width="22" height="20" rx="4" fill="#B9773E" stroke="${INK}" stroke-width="2.5"/><rect x="100" y="112" width="18" height="8" rx="2" fill="${INK}"/>` +
    bottle(340, 106, 14, 32, '#B9773E', '#FFF8EA') +
    bottle(360, 100, 18, 38, '#1E2A5A', '#C8323B') +
    bottle(384, 112, 12, 26, '#E9B949', '#2A1F1A') +
    `<circle cx="422" cy="126" r="12" fill="#C8323B" stroke="${INK}" stroke-width="2.5"/><circle cx="418" cy="121" r="4" fill="#fff" opacity=".45"/>`;
  return (
    `<rect x="0" y="76" width="480" height="120" fill="${P.wallWood}"/>` +
    boards +
    `<rect x="0" y="76" width="480" height="120" fill="url(#dusk)"/>` +
    shelf(30, 138, 100, P) +
    shelf(330, 138, 110, P) +
    bottles +
    shelf(30, 168, 100, P) +
    shelf(330, 168, 110, P) +
    `<rect x="36" y="150" width="20" height="18" rx="3" fill="#F5E9D2" stroke="${INK}" stroke-width="2.5"/><rect x="62" y="152" width="16" height="16" rx="3" fill="#E9B949" stroke="${INK}" stroke-width="2.5"/><rect x="84" y="148" width="22" height="20" rx="3" fill="#8F1F27" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="338" y="152" width="24" height="16" rx="8" fill="#F5E9D2" stroke="${INK}" stroke-width="2.5"/><rect x="370" y="150" width="16" height="18" rx="3" fill="#3B5B6E" stroke="${INK}" stroke-width="2.5"/><rect x="392" y="154" width="30" height="14" rx="3" fill="#B9773E" stroke="${INK}" stroke-width="2.5"/>` +
    pendant(240, 96, P) +
    // Bamboo trim and a red awning scallop along the top.
    `<rect x="0" y="76" width="480" height="10" fill="${P.accent}"/>` +
    [0, 48, 96, 144, 192, 240, 288, 336, 384, 432]
      .map(
        (x) =>
          `<path d="M${x} 86 Q${x + 24} 100 ${x + 48} 86 Z" fill="${x % 96 ? '#FFF8EA' : P.accent}" stroke="${INK}" stroke-width="2"/>`
      )
      .join('')
  );
}

function wallDiner(P: RoomPalette): string {
  let tiles = '';
  for (let y = 88; y < 196; y += 27)
    for (let x = -30; x < 480; x += 60) {
      const off = ((y - 88) / 27) % 2 ? 30 : 0;
      tiles += `<rect x="${x + off}" y="${y}" width="57" height="24" rx="3" fill="${(x / 60 + (y - 88) / 27) % 2 ? P.wallWood : P.wallWoodDark}" stroke="${P.wallWoodLine}" stroke-width="1.5"/>`;
    }
  return (
    `<rect x="0" y="76" width="480" height="120" fill="${P.wallWoodLine}"/>` +
    tiles +
    // Chrome band with a reflection, a red neon tube behind the counter, a menu board.
    `<rect x="0" y="140" width="480" height="14" fill="#C9D3E0" stroke="${INK}" stroke-width="2"/><rect x="0" y="142" width="480" height="3" fill="#fff" opacity=".7"/>` +
    `<rect x="60" y="120" width="360" height="6" rx="3" fill="${P.accent}"/><rect x="60" y="120" width="360" height="6" rx="3" fill="${P.accent}" opacity=".5" filter="url(#glow)"/>` +
    `<rect x="24" y="90" width="100" height="24" rx="4" fill="#2B1E2E" stroke="${INK}" stroke-width="2.5"/><rect x="30" y="96" width="60" height="4" fill="#F5E9D2" opacity=".8"/><rect x="30" y="104" width="44" height="4" fill="#F5E9D2" opacity=".6"/>` +
    shelf(340, 108, 110, P) +
    bottle(350, 78, 14, 30, '#E63946', '#FFF8EA') +
    bottle(372, 80, 14, 28, '#F2B705', '#2A1F1A') +
    `<rect x="396" y="86" width="26" height="22" rx="4" fill="#FBF3EE" stroke="${INK}" stroke-width="2.5"/><ellipse cx="409" cy="86" rx="13" ry="4" fill="#FF9EB5" stroke="${INK}" stroke-width="2"/>` +
    pendant(240, 92, P)
  );
}

function wallRooftop(P: RoomPalette): string {
  const buildings = [
    [0, 110, 44],
    [44, 128, 30],
    [74, 96, 52],
    [126, 118, 36],
    [162, 136, 28],
    [190, 100, 60],
    [250, 124, 34],
    [284, 108, 46],
    [330, 132, 30],
    [360, 102, 54],
    [414, 120, 40],
    [454, 108, 26],
  ];
  let city = '';
  for (const [x, top, w] of buildings) {
    city += `<rect x="${x}" y="${top}" width="${w}" height="${196 - top}" fill="${P.wallWoodDark}"/>`;
    for (let wy = top + 8; wy < 190; wy += 12)
      for (let wx = x + 5; wx < x + w - 6; wx += 10)
        if ((wx * 7 + wy * 13) % 5 !== 0)
          city += `<rect x="${wx}" y="${wy}" width="5" height="6" fill="${P.glow}" opacity="${(wx + wy) % 3 ? 0.5 : 0.85}"/>`;
  }
  let stars = '';
  for (let i = 0; i < 36; i++) {
    const sx = (i * 97) % 480,
      sy = 80 + ((i * 53) % 50);
    stars += `<circle cx="${sx}" cy="${sy}" r="${i % 4 ? 1 : 1.6}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`;
  }
  // String lights across the sky.
  let bulbs = '';
  for (let i = 0; i < 11; i++) {
    const x = 20 + i * 44,
      y = 104 + Math.sin(i * 0.9) * 8;
    bulbs += `<line x1="${x}" y1="${f(y - 8)}" x2="${x}" y2="${f(y)}" stroke="${INK}" stroke-width="1.5"/><circle cx="${x}" cy="${f(y + 5)}" r="5" fill="${['#E9B949', '#FF9EB5', '#6EE7FF', '#2FB36B'][i % 4]}" stroke="${INK}" stroke-width="1.5"/><circle cx="${x - 1.5}" cy="${f(y + 3.5)}" r="1.6" fill="#fff" opacity=".8"/>`;
  }
  return (
    `<rect x="0" y="76" width="480" height="120" fill="url(#sky)"/>` +
    stars +
    `<circle cx="392" cy="110" r="16" fill="#FFF3C4"/><circle cx="386" cy="106" r="14" fill="${P.wallWood}" opacity=".9"/>` +
    city +
    `<path d="M0 96 Q120 120 240 96 T480 96" fill="none" stroke="${INK}" stroke-width="2"/>` +
    bulbs
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
    `<rect x="0" y="76" width="480" height="120" fill="url(#dusk)"/>` +
    lattice +
    `<rect x="0" y="76" width="480" height="8" fill="${P.wallWoodLine}"/>` +
    // A warm paper lamp on the wall and a low shelf with a tea bowl.
    `<rect x="384" y="96" width="44" height="60" rx="6" fill="#FFF3C4" stroke="${INK}" stroke-width="2.5"/><rect x="384" y="96" width="44" height="60" rx="6" fill="${P.glow}" opacity=".35"/><path d="M384 116 L428 116 M384 136 L428 136 M406 96 L406 156" stroke="${INK}" stroke-opacity=".35" stroke-width="2"/>` +
    shelf(30, 150, 110, P) +
    `<ellipse cx="60" cy="146" rx="14" ry="6" fill="#B24A3A" stroke="${INK}" stroke-width="2.5"/><path d="M46 146 Q60 156 74 146 Z" fill="#8F3A2D"/>` +
    `<rect x="90" y="134" width="14" height="16" rx="3" fill="#F7F1E3" stroke="${INK}" stroke-width="2.5"/><rect x="110" y="134" width="14" height="16" rx="3" fill="#F7F1E3" stroke="${INK}" stroke-width="2.5"/>`
  );
}

function wallStation(P: RoomPalette): string {
  let panels = '';
  for (let x = 0; x < 480; x += 96)
    panels +=
      `<rect x="${x + 3}" y="80" width="90" height="112" rx="8" fill="url(#steel)" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="${x + 6}" y="83" width="84" height="3" rx="1.5" fill="#fff" opacity=".35"/>` +
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
    `<circle cx="240" cy="136" r="52" fill="#060914" stroke="${INK}" stroke-width="4"/><circle cx="240" cy="136" r="48" fill="none" stroke="#C9D3E0" stroke-width="3"/>` +
    stars +
    `<circle cx="262" cy="150" r="14" fill="#E5484D"/><ellipse cx="262" cy="150" rx="24" ry="5" fill="none" stroke="${P.accent}" stroke-width="2" transform="rotate(-20 262 150)"/>` +
    // Holographic menu strip and blue light tubes.
    `<rect x="20" y="100" width="60" height="40" rx="4" fill="${P.accent}" opacity=".18" stroke="${P.accent}" stroke-width="1.5"/><rect x="26" y="108" width="40" height="4" fill="${P.accent}" opacity=".7"/><rect x="26" y="118" width="30" height="4" fill="${P.accent}" opacity=".5"/><rect x="26" y="128" width="46" height="4" fill="${P.accent}" opacity=".4"/>` +
    `<rect x="0" y="180" width="480" height="4" fill="${P.accent}" opacity=".7"/><rect x="0" y="180" width="480" height="4" fill="${P.accent}" opacity=".5" filter="url(#glow)"/>`
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
    `<rect x="0" y="176" width="480" height="20" fill="${INK}" opacity=".1"/>` +
    // The rail the noren hangs from: wood with a lit top edge.
    `<rect x="0" y="194" width="480" height="8" rx="2" fill="${P.rail}" stroke="${INK}" stroke-width="1.5"/><rect x="0" y="195" width="480" height="2" fill="#fff" opacity=".22"/>`
  );
}

/** The house items on the ledge inside the belt loop, per restaurant. */
function ledgeItems(t: ThemeDef): string {
  const o = `stroke="${INK}" stroke-width="2.5"`;
  switch (t.id) {
    case 'diner':
      return (
        `<rect x="184" y="304" width="14" height="32" rx="5" fill="#E5484D" ${o}/><rect x="188" y="298" width="6" height="8" fill="#9E2B2B"/>` +
        `<rect x="204" y="308" width="14" height="28" rx="5" fill="#F2B705" ${o}/><rect x="208" y="302" width="6" height="8" fill="#B8860B"/>` +
        `<path d="M262 306 L286 306 L282 336 L266 336 Z" fill="#FBF7F2" ${o}/><ellipse cx="274" cy="306" rx="13" ry="5" fill="#FF9EB5" ${o}/><rect x="273" y="288" width="3" height="20" fill="#E63946"/>`
      );
    case 'rooftop':
      return (
        `<path d="M176 306 L204 306 L190 324 Z" fill="#8FD3F5" fill-opacity=".8" ${o}/><rect x="189" y="324" width="2" height="10" fill="#C9A45C"/><rect x="182" y="334" width="16" height="3" fill="#C9A45C"/><circle cx="198" cy="303" r="4" fill="#2FB36B"/>` +
        `<rect x="234" y="316" width="12" height="20" rx="2" fill="#FFF3C4" ${o}/><ellipse cx="240" cy="312" rx="3" ry="6" fill="#E9B949"/>` +
        `<path d="M270 312 L298 312 L294 336 L274 336 Z" fill="#9AA3AD" ${o}/><ellipse cx="284" cy="312" rx="14" ry="4" fill="#C9D3E0" ${o}/>`
      );
    case 'ryokan':
      return (
        `<rect x="176" y="326" width="120" height="10" rx="3" fill="#3B2F26" ${o}/>` +
        `<ellipse cx="200" cy="322" rx="12" ry="8" fill="#4A7C59" ${o}/><path d="M211 318 Q222 314 220 326" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="195" y="309" width="10" height="5" rx="2" fill="#2F5A3B"/>` +
        `<rect x="228" y="312" width="12" height="14" rx="3" fill="#F7F1E3" ${o}/><rect x="246" y="312" width="12" height="14" rx="3" fill="#F7F1E3" ${o}/>` +
        `<ellipse cx="278" cy="322" rx="10" ry="4" fill="#B24A3A" ${o}/><path d="M268 322 Q278 330 288 322 Z" fill="#8F3A2D"/>`
      );
    case 'station':
      return (
        `<path d="M188 306 L188 318 L178 336 L206 336 L196 318 L196 306 Z" fill="#6EE7FF" fill-opacity=".5" ${o}/><rect x="185" y="302" width="14" height="5" rx="1" fill="#7EA0C8"/>` +
        `<path d="M262 300 L278 308 L278 326 L262 334 L246 326 L246 308 Z" fill="#1E2A40" stroke="#6EE7FF" stroke-width="2"/><path d="M246 308 L262 316 L278 308 M262 316 L262 334" fill="none" stroke="#6EE7FF" stroke-width="1.5"/>` +
        `<ellipse cx="262" cy="338" rx="16" ry="3" fill="#6EE7FF" opacity=".35"/>`
      );
    default:
      return (
        `<path d="M186 336 L186 314 Q186 308 192 306 L192 296 L200 296 L200 306 Q206 308 206 314 L206 336 Z" fill="#3B5B6E" ${o}/>` +
        `<rect x="189" y="318" width="14" height="10" rx="2" fill="#F5E9D2"/><rect x="188" y="308" width="3" height="10" fill="#fff" opacity=".35"/>` +
        `<ellipse cx="238" cy="334" rx="16" ry="4" fill="#B24A3A" ${o}/><path d="M222 334 Q238 344 254 334 Z" fill="#8F3A2D"/>` +
        `<ellipse cx="238" cy="326" rx="14" ry="3.5" fill="#E5484D" ${o}/><path d="M224 326 Q238 335 252 326 Z" fill="#B3202A"/>` +
        `<ellipse cx="284" cy="326" rx="14" ry="10" fill="#4A7C59" ${o}/>` +
        `<path d="M296 322 Q308 318 306 330" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
        `<rect x="278" y="312" width="12" height="6" rx="2" fill="#2F5A3B"/><ellipse cx="278" cy="320" rx="5" ry="2.5" fill="#fff" opacity=".35"/>`
      );
  }
}

/** A low ledge inside the belt loop with the house items, each with an occlusion shadow. */
function ledge(t: ThemeDef): string {
  const P = t.palette;
  return (
    `<rect x="84" y="336" width="312" height="36" rx="6" fill="${P.ledge}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="84" y="336" width="312" height="5" rx="2" fill="${P.ledgeEdge}"/>` +
    `<rect x="90" y="372" width="300" height="6" fill="${INK}" opacity=".16"/>` +
    `<ellipse cx="198" cy="337" rx="16" ry="4" fill="${INK}" opacity=".22"/><ellipse cx="242" cy="337" rx="20" ry="4" fill="${INK}" opacity=".22"/><ellipse cx="288" cy="337" rx="18" ry="4" fill="${INK}" opacity=".22"/>` +
    ledgeItems(t)
  );
}

function counter(t: ThemeDef): string {
  const P = t.palette;
  let grain = '';
  for (let i = 0; i < 3; i++) {
    const y = 434 + i * 44;
    grain += `<rect x="0" y="${y}" width="480" height="42" rx="3" fill="${i % 2 ? P.counterBottom : P.counterTop}"/>`;
    grain += `<path d="M0 ${y + 14} Q120 ${y + 8} 240 ${y + 16} T480 ${y + 12}" fill="none" stroke="${P.counterLine}" stroke-opacity=".3" stroke-width="1.5"/>`;
    grain += `<path d="M0 ${y + 30} Q160 ${y + 36} 320 ${y + 26} T480 ${y + 32}" fill="none" stroke="${P.counterLine}" stroke-opacity=".22" stroke-width="1.2"/>`;
    grain += `<path d="M60 ${y + 22} Q90 ${y + 18} 120 ${y + 24}" fill="none" stroke="${P.counterLine}" stroke-opacity=".25" stroke-width="1"/>`;
  }
  return (
    `<rect x="0" y="424" width="480" height="142" fill="${P.counterBottom}"/>` +
    grain +
    `<ellipse cx="150" cy="470" rx="6" ry="4" fill="${P.counterLine}" opacity=".35"/><ellipse cx="392" cy="512" rx="7" ry="4.5" fill="${P.counterLine}" opacity=".35"/>` +
    // Lacquer edge along the front of the counter: a glossy strip with a highlight and a chocolate line.
    `<rect x="0" y="424" width="480" height="12" fill="${P.lacquer}"/>` +
    `<rect x="0" y="425" width="480" height="3" fill="#fff" opacity=".35"/>` +
    `<rect x="0" y="434" width="480" height="2" fill="${INK}" opacity=".7"/>` +
    `<rect x="0" y="558" width="480" height="8" fill="${INK}" opacity=".22"/>`
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
      `<rect x="0" y="566" width="480" height="10" fill="${INK}" opacity=".1"/>`
    );
  }
  if (t.id === 'rooftop') {
    let planks = '';
    for (let y = 566; y < 900; y += 28)
      planks += `<rect x="0" y="${y}" width="480" height="26" rx="2" fill="${(y / 28) % 2 ? P.floor : P.floorDark}"/><line x1="0" y1="${y + 27}" x2="480" y2="${y + 27}" stroke="${P.floorLine}" stroke-width="2"/>`;
    return planks + `<rect x="0" y="566" width="480" height="10" fill="${INK}" opacity=".14"/>`;
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
      `<rect x="0" y="566" width="480" height="10" fill="${INK}" opacity=".22"/>`
    );
  }
  // Tatami: two mats with a woven texture and a cloth border.
  let weave = '';
  for (let y = 566; y < 900; y += 6)
    weave += `<line x1="0" y1="${y + 0.5}" x2="480" y2="${y + 0.5}" stroke="${P.floorLine}" stroke-opacity=".4" stroke-width="1"/>`;
  return (
    `<rect x="0" y="566" width="480" height="334" fill="${P.floor}"/>` +
    weave +
    `<rect x="0" y="566" width="240" height="334" fill="${P.floorDark}" opacity=".35"/>` +
    `<rect x="236" y="566" width="8" height="334" fill="${INK}" opacity=".5"/><rect x="0" y="566" width="480" height="334" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="8"/>` +
    `<rect x="0" y="566" width="480" height="10" fill="${INK}" opacity=".1"/>`
  );
}

/** Everything static in the scene for a restaurant, composed once and cached per theme. */
export function backgroundSvg(t: ThemeDef = THEMES[0]): string {
  const P = t.palette;
  const defs =
    `<defs>` +
    `<radialGradient id="lamp" cx="50%" cy="20%" r="60%"><stop offset="0" stop-color="${P.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.headerDark}" stop-opacity=".55"/><stop offset="1" stop-color="${P.headerDark}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.headerDark}"/><stop offset="1" stop-color="${lighten(P.wallWood, 0.15)}"/></linearGradient>` +
    `<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(P.wallWood, 0.25)}"/><stop offset=".5" stop-color="${P.wallWood}"/><stop offset="1" stop-color="${P.wallWoodDark}"/></linearGradient>` +
    `<radialGradient id="vig" cx="50%" cy="45%" r="70%"><stop offset=".55" stop-color="${P.headerDark}" stop-opacity="0"/><stop offset="1" stop-color="${P.headerDark}" stop-opacity=".32"/></radialGradient>` +
    `<filter id="glow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>` +
    `</defs>`;
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 480 900" width="480" height="900">` +
    defs +
    `<rect x="0" y="0" width="480" height="76" fill="${P.headerDark}"/>` +
    wall(t) +
    ledge(t) +
    counter(t) +
    floor(t) +
    `<rect x="0" y="76" width="480" height="824" fill="url(#vig)"/>` +
    `</svg>`
  );
}

/* ---------- the original decor ---------- */

/** The noren: a bamboo rod with ties, overlapping indigo panels with a white wave crest and a shop mark, a
    translucent bottom edge so the room shows through. */
export function norenSvg(): string {
  let panels = '';
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 53;
    panels +=
      `<path d="M${x} 10 L${x + 50} 10 L${x + 50} 38 Q${x + 25} 44 ${x} 38 Z" fill="url(#cloth${i % 2})" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M${x + 7} 28 Q${x + 16} 18 ${x + 25} 28 Q${x + 34} 38 ${x + 43} 28" fill="none" stroke="#FFF8EA" stroke-opacity=".8" stroke-width="2.5" stroke-linecap="round"/>` +
      (i === 2 || i === 3
        ? `<circle cx="${x + 25}" cy="17" r="4.5" fill="#C8323B" stroke="#FFF8EA" stroke-width="1.2"/>`
        : `<circle cx="${x + 25}" cy="17" r="2.2" fill="#FFF8EA" opacity=".7"/>`) +
      `<path d="M${x + 4} 12 L${x + 4} 20" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`;
  }
  let ties = '';
  for (let i = 0; i < 7; i++) {
    const x = 2 + i * 53;
    ties += `<rect x="${x - 2}" y="2" width="4" height="10" rx="1.5" fill="#F5E9D2" stroke="${INK}" stroke-width="1.5"/>`;
  }
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 320 44" width="320" height="44">` +
    `<defs><linearGradient id="cloth0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E2A5A"/><stop offset=".8" stop-color="#1E2A5A"/><stop offset="1" stop-color="#1E2A5A" stop-opacity=".55"/></linearGradient>` +
    `<linearGradient id="cloth1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26367A"/><stop offset=".8" stop-color="#26367A"/><stop offset="1" stop-color="#26367A" stop-opacity=".55"/></linearGradient></defs>` +
    `<rect x="0" y="4" width="320" height="6" rx="3" fill="#9CB46B" stroke="${INK}" stroke-width="1.5"/><rect x="2" y="5" width="316" height="1.5" fill="#fff" opacity=".4"/>` +
    `<path d="M40 4 L40 10 M100 4 L100 10 M160 4 L160 10 M220 4 L220 10 M280 4 L280 10" stroke="${INK}" stroke-opacity=".5" stroke-width="1.5"/>` +
    ties +
    panels +
    `</svg>`
  );
}

/** A paper lantern: visible ribs, a warm inner glow, a tassel. The radial glow behind it is canvas-drawn. */
export function lanternSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 48 72" width="48" height="72">` +
    `<defs><radialGradient id="l" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="#FFB35C"/><stop offset=".35" stop-color="#E5484D"/><stop offset="1" stop-color="#8F1F27"/></radialGradient></defs>` +
    `<line x1="24" y1="0" x2="24" y2="10" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="15" y="9" width="18" height="6" rx="2" fill="#E9B949" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="24" cy="38" rx="19" ry="24" fill="url(#l)" stroke="${INK}" stroke-width="2.5"/>` +
    `<g fill="none" stroke="${INK}" stroke-opacity=".22" stroke-width="1.5"><ellipse cx="24" cy="38" rx="6" ry="24"/><ellipse cx="24" cy="38" rx="12.5" ry="24"/><line x1="6" y1="26" x2="42" y2="26"/><line x1="5" y1="38" x2="43" y2="38"/><line x1="6" y1="50" x2="42" y2="50"/></g>` +
    `<ellipse cx="16" cy="24" rx="5" ry="8" fill="#fff" opacity=".28" transform="rotate(-18 16 24)"/>` +
    `<rect x="15" y="60" width="18" height="6" rx="2" fill="#E9B949" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M24 66 L24 72 M21 68 L21 72 M27 68 L27 72" stroke="#C8323B" stroke-width="1.6" stroke-linecap="round"/>` +
    `</svg>`
  );
}

export function bonsaiSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 64 64" width="64" height="64">` +
    `<ellipse cx="34" cy="61" rx="22" ry="4" fill="${INK}" opacity=".24"/>` +
    `<path d="M12 50 L52 50 L48 60 L16 60 Z" fill="#7A4A22" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="46" width="44" height="6" rx="2" fill="#B9773E" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="14" y="47.5" width="36" height="1.5" fill="#fff" opacity=".35"/>` +
    `<path d="M32 46 Q38 34 28 26 Q22 20 30 12" fill="none" stroke="#5A3A1E" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M30 30 Q40 30 46 22" fill="none" stroke="#5A3A1E" stroke-width="3.5" stroke-linecap="round"/>` +
    `<ellipse cx="22" cy="20" rx="14" ry="8" fill="#2FB36B" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="46" cy="18" rx="12" ry="7" fill="#3CC57A" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="32" cy="8" rx="11" ry="6.5" fill="#2FB36B" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="18" cy="17" rx="5" ry="2.5" fill="#fff" opacity=".35" transform="rotate(-15 18 17)"/><ellipse cx="29" cy="6" rx="4" ry="2" fill="#fff" opacity=".35"/>` +
    `</svg>`
  );
}

export function tankSvg(): string {
  return (
    `<svg xmlns="${HEAD}" viewBox="0 0 92 52" width="92" height="52">` +
    `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3F5" stop-opacity=".55"/><stop offset="1" stop-color="#3E9AD1" stop-opacity=".75"/></linearGradient></defs>` +
    `<ellipse cx="48" cy="50" rx="42" ry="3" fill="${INK}" opacity=".24"/>` +
    `<rect x="2" y="2" width="88" height="48" rx="6" fill="url(#w)"/>` +
    `<path d="M6 44 Q20 38 34 44 T62 44 T88 44 L88 48 L6 48 Z" fill="#B99B6B"/>` +
    `<path d="M14 44 Q10 32 16 24 Q20 32 18 44" fill="#2FB36B"/><path d="M22 44 Q24 30 20 20 Q28 28 26 44" fill="#3CC57A"/>` +
    `<path d="M10 8 Q30 4 50 8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>` +
    `<rect x="2" y="2" width="88" height="48" rx="6" fill="none" stroke="${INK}" stroke-width="3"/>` +
    `<rect x="0" y="0" width="92" height="6" rx="2" fill="#7A4A22" stroke="${INK}" stroke-width="2"/>` +
    `</svg>`
  );
}
