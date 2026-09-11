/* The restaurant journey: five themes, one every twenty levels. A theme is a room palette (every environment
   colour the renderer and the SVG room use), a music palette, an outfit for the diners and three decor pieces
   with a completion reward. The seven gameplay colours never change with the theme (docs/style-guide.md). */

export type ThemeId = 'stall' | 'diner' | 'rooftop' | 'ryokan' | 'station';
export type OutfitId = 'none' | 'bowtie' | 'tuxedo' | 'yukata' | 'suit';
export type DecorSlot = 'hang' | 'band' | 'ledgeL' | 'ledgeR' | 'sign';

export interface RoomPalette {
  headerDark: string;
  wallWood: string;
  wallWoodDark: string;
  wallWoodLine: string;
  rail: string;
  paper: string;
  paperLine: string;
  counterTop: string;
  counterBottom: string;
  counterEdge: string;
  counterLine: string;
  floor: string;
  floorLine: string;
  floorDark: string;
  ledge: string;
  ledgeEdge: string;
  beltRail: string;
  beltTrack: string;
  beltDash: string;
  gridMat: string;
  gridLine: string;
  accent: string;
  /** Text over the header and the brand text inside the belt. */
  brand: string;
  /** The glossy strip along the counter's front edge. */
  lacquer: string;
  /** The lantern and lamp light: the radial glow and the warm tint on lit sprites. */
  glow: string;
  /** Shelves and the noren rod. */
  wood: string;
}

export interface MusicPalette {
  transpose: number;
  bpm: number;
  lead: 'pluck' | 'pad';
  calmShaker: boolean;
  calmDrone: boolean;
  tensePercussion: boolean;
  octave: number;
}

export interface DecorItem {
  id: string;
  theme: ThemeId;
  slot: DecorSlot;
  cost: number;
}

export interface ThemeDef {
  id: ThemeId;
  index: number;
  /** First level of the theme. */
  from: number;
  palette: RoomPalette;
  music: MusicPalette;
  outfit: OutfitId;
  /** Coins for owning all of the theme's decor. */
  reward: number;
}

export const THEME_SPAN = 20;

const STALL: RoomPalette = {
  headerDark: '#121A3A',
  wallWood: '#1E2A5A',
  wallWoodDark: '#182248',
  wallWoodLine: '#2C3A72',
  rail: '#7A4A22',
  paper: '#F5E9D2',
  paperLine: '#E4D4B6',
  counterTop: '#B9773E',
  counterBottom: '#9C6132',
  counterEdge: '#D9A26A',
  counterLine: '#7A4A22',
  floor: '#D9C79A',
  floorLine: '#BCA97A',
  floorDark: '#CDB98B',
  ledge: '#7A4A22',
  ledgeEdge: '#B9773E',
  beltRail: '#C9CDD6',
  beltTrack: '#23201F',
  beltDash: '#3A3633',
  gridMat: '#E8D9B8',
  gridLine: '#D3C09A',
  accent: '#C8323B',
  brand: '#F5E9D2',
  lacquer: '#C8323B',
  glow: '#FFB35C',
  wood: '#B9773E',
};

const DINER: RoomPalette = {
  headerDark: '#2B1E2E',
  wallWood: '#F3E6DC',
  wallWoodDark: '#E8D6C9',
  wallWoodLine: '#D6C1B2',
  rail: '#8E97A6',
  paper: '#FBF3EE',
  paperLine: '#EADFD6',
  counterTop: '#C8323B',
  counterBottom: '#8F1F27',
  counterEdge: '#E3606A',
  counterLine: '#7A1A22',
  floor: '#F2F2EE',
  floorLine: '#D9D9D3',
  floorDark: '#2E2A2A',
  ledge: '#8E97A6',
  ledgeEdge: '#C9D3E0',
  beltRail: '#DDE3EA',
  beltTrack: '#23201F',
  beltDash: '#3A3633',
  gridMat: '#F6EFE8',
  gridLine: '#E3D6CC',
  accent: '#E63946',
  brand: '#FBF3EE',
  lacquer: '#8F1F27',
  glow: '#FFB35C',
  wood: '#B9773E',
};

const ROOFTOP: RoomPalette = {
  headerDark: '#0E1330',
  wallWood: '#2A3468',
  wallWoodDark: '#1B2450',
  wallWoodLine: '#3A4680',
  rail: '#5A6688',
  paper: '#1E2A5A',
  paperLine: '#26336B',
  counterTop: '#3F2E22',
  counterBottom: '#2B1E15',
  counterEdge: '#6A4E3A',
  counterLine: '#1E140E',
  floor: '#4B3A2E',
  floorLine: '#2E231C',
  floorDark: '#3E2F25',
  ledge: '#2B1E15',
  ledgeEdge: '#5A4436',
  beltRail: '#8A93A6',
  beltTrack: '#1D1B22',
  beltDash: '#332F3A',
  gridMat: '#3A4680',
  gridLine: '#4A5690',
  accent: '#E9B949',
  brand: '#F5E9D2',
  lacquer: '#8F1F27',
  glow: '#FFB35C',
  wood: '#5A4436',
};

const RYOKAN: RoomPalette = {
  headerDark: '#3B2F26',
  wallWood: '#F4EEE0',
  wallWoodDark: '#EFE7D5',
  wallWoodLine: '#8C6E52',
  rail: '#6B4C33',
  paper: '#F7F1E3',
  paperLine: '#E8DFC8',
  counterTop: '#B9773E',
  counterBottom: '#8E6238',
  counterEdge: '#D9A26A',
  counterLine: '#7A4A22',
  floor: '#DCE3B8',
  floorLine: '#B9C48E',
  floorDark: '#CDD6A4',
  ledge: '#6B4C33',
  ledgeEdge: '#9C7A57',
  beltRail: '#8B7B6A',
  beltTrack: '#2A2320',
  beltDash: '#3F3730',
  gridMat: '#EDE6D2',
  gridLine: '#D9CEB2',
  accent: '#2FB36B',
  brand: '#3B2F26',
  lacquer: '#8F1F27',
  glow: '#FFD08A',
  wood: '#B9773E',
};

const STATION: RoomPalette = {
  headerDark: '#0B0F1E',
  wallWood: '#1F2A3A',
  wallWoodDark: '#172231',
  wallWoodLine: '#2E3E54',
  rail: '#4A5A70',
  paper: '#263445',
  paperLine: '#2E3E54',
  counterTop: '#3C4A5E',
  counterBottom: '#2A3646',
  counterEdge: '#6EE7FF',
  counterLine: '#1E2A3A',
  floor: '#2C3A4A',
  floorLine: '#3E4E62',
  floorDark: '#22303F',
  ledge: '#2A3646',
  ledgeEdge: '#4A5A70',
  beltRail: '#9BB7D6',
  beltTrack: '#0F1522',
  beltDash: '#22304A',
  gridMat: '#2E3E54',
  gridLine: '#3E5070',
  accent: '#6EE7FF',
  brand: '#DDE3EA',
  lacquer: '#3C4A5E',
  glow: '#9BE8FF',
  wood: '#4A5A70',
};

export const THEMES: ThemeDef[] = [
  {
    id: 'stall',
    index: 0,
    from: 1,
    palette: STALL,
    music: {
      transpose: 0,
      bpm: 84,
      lead: 'pluck',
      calmShaker: false,
      calmDrone: false,
      tensePercussion: true,
      octave: 0,
    },
    outfit: 'none',
    reward: 300,
  },
  {
    id: 'diner',
    index: 1,
    from: 21,
    palette: DINER,
    music: {
      transpose: 2,
      bpm: 100,
      lead: 'pluck',
      calmShaker: true,
      calmDrone: false,
      tensePercussion: true,
      octave: 0,
    },
    outfit: 'bowtie',
    reward: 400,
  },
  {
    id: 'rooftop',
    index: 2,
    from: 41,
    palette: ROOFTOP,
    music: {
      transpose: -3,
      bpm: 76,
      lead: 'pad',
      calmShaker: false,
      calmDrone: true,
      tensePercussion: true,
      octave: 0,
    },
    outfit: 'tuxedo',
    reward: 500,
  },
  {
    id: 'ryokan',
    index: 3,
    from: 61,
    palette: RYOKAN,
    music: {
      transpose: -5,
      bpm: 70,
      lead: 'pluck',
      calmShaker: false,
      calmDrone: true,
      tensePercussion: false,
      octave: 0,
    },
    outfit: 'yukata',
    reward: 600,
  },
  {
    id: 'station',
    index: 4,
    from: 81,
    palette: STATION,
    music: {
      transpose: 5,
      bpm: 108,
      lead: 'pluck',
      calmShaker: true,
      calmDrone: true,
      tensePercussion: true,
      octave: 12,
    },
    outfit: 'suit',
    reward: 700,
  },
];

/** Three cosmetic pieces per restaurant. Ids are stable: they are what the save stores. */
export const DECOR: DecorItem[] = [
  { id: 'noren', theme: 'stall', slot: 'band', cost: 250 },
  { id: 'lantern', theme: 'stall', slot: 'hang', cost: 300 },
  { id: 'plant', theme: 'stall', slot: 'ledgeL', cost: 350 },
  { id: 'neon', theme: 'diner', slot: 'sign', cost: 400 },
  { id: 'tank', theme: 'diner', slot: 'ledgeR', cost: 500 },
  { id: 'jukebox', theme: 'diner', slot: 'ledgeL', cost: 600 },
  { id: 'lights', theme: 'rooftop', slot: 'band', cost: 500 },
  { id: 'palm', theme: 'rooftop', slot: 'ledgeL', cost: 650 },
  { id: 'cocktail', theme: 'rooftop', slot: 'ledgeR', cost: 800 },
  { id: 'scroll', theme: 'ryokan', slot: 'hang', cost: 600 },
  { id: 'ikebana', theme: 'ryokan', slot: 'ledgeL', cost: 750 },
  { id: 'stonelamp', theme: 'ryokan', slot: 'ledgeR', cost: 900 },
  { id: 'holo', theme: 'station', slot: 'sign', cost: 700 },
  { id: 'cactus', theme: 'station', slot: 'ledgeL', cost: 850 },
  { id: 'robot', theme: 'station', slot: 'ledgeR', cost: 1000 },
];

/** The restaurant a level is played in. */
export function themeFor(n: number): ThemeDef {
  const i = Math.max(0, Math.min(THEMES.length - 1, Math.floor((Math.max(1, n) - 1) / THEME_SPAN)));
  return THEMES[i];
}

export function themeById(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/** Unlocked once the player has reached its first level. */
export function themeUnlocked(t: ThemeDef, best: number): boolean {
  return best >= t.from;
}

export function decorOf(theme: ThemeId): DecorItem[] {
  return DECOR.filter((d) => d.theme === theme);
}

export function setComplete(theme: ThemeId, owned: string[]): boolean {
  return decorOf(theme).every((d) => owned.includes(d.id));
}
