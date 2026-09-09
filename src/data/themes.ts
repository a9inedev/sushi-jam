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
  beltRail: '#33373F',
  beltTrack: '#4A4F5C',
  beltDash: '#5B6170',
  gridMat: '#E4D6B4',
  gridLine: 'rgba(120,95,60,.18)',
  accent: '#E5484D',
  brand: 'rgba(60,50,40,.28)',
};

const DINER: RoomPalette = {
  headerDark: '#3A2F3A',
  wallWood: '#F6EFE6',
  wallWoodDark: '#EDE3D8',
  wallWoodLine: '#D9CFC5',
  rail: '#B8BEC6',
  paper: '#FBF7F2',
  paperLine: '#E9E0D6',
  counterTop: '#C63D3D',
  counterBottom: '#9E2B2B',
  counterEdge: '#E6E9EE',
  counterLine: '#7A1F1F',
  floor: '#F2F2EE',
  floorLine: '#2E2A2A',
  floorDark: '#2E2A2A',
  ledge: '#9AA3AD',
  ledgeEdge: '#D5DAE0',
  beltRail: '#2E3A4A',
  beltTrack: '#4A5A70',
  beltDash: '#7EA0C8',
  gridMat: '#F1E7D8',
  gridLine: 'rgba(120,95,60,.18)',
  accent: '#E63946',
  brand: 'rgba(58,47,58,.3)',
};

const ROOFTOP: RoomPalette = {
  headerDark: '#101529',
  wallWood: '#24304E',
  wallWoodDark: '#1A2440',
  wallWoodLine: '#3A4A70',
  rail: '#8A6A3A',
  paper: '#2B3550',
  paperLine: '#3A4566',
  counterTop: '#3F2E22',
  counterBottom: '#2B1E15',
  counterEdge: '#C9A45C',
  counterLine: '#1C130D',
  floor: '#4B3A2E',
  floorLine: '#3B2C22',
  floorDark: '#43332A',
  ledge: '#5C4630',
  ledgeEdge: '#8A6A45',
  beltRail: '#1C2030',
  beltTrack: '#2C3245',
  beltDash: '#5A6688',
  gridMat: '#3A3040',
  gridLine: 'rgba(255,255,255,.12)',
  accent: '#F2B705',
  brand: 'rgba(242,183,5,.35)',
};

const RYOKAN: RoomPalette = {
  headerDark: '#3B2F26',
  wallWood: '#F4EEE0',
  wallWoodDark: '#EFE7D5',
  wallWoodLine: '#8B6B4A',
  rail: '#6B4C33',
  paper: '#F7F1E3',
  paperLine: '#E4D9C3',
  counterTop: '#B9834E',
  counterBottom: '#8E6238',
  counterEdge: '#D9A96A',
  counterLine: '#7A5230',
  floor: '#DCE3B8',
  floorLine: '#B9C48C',
  floorDark: '#D1D9A9',
  ledge: '#7A5230',
  ledgeEdge: '#A67A4A',
  beltRail: '#4A3B30',
  beltTrack: '#5E4B3C',
  beltDash: '#7A6350',
  gridMat: '#E9E4CC',
  gridLine: 'rgba(120,95,60,.18)',
  accent: '#2FB36B',
  brand: 'rgba(59,47,38,.28)',
};

const STATION: RoomPalette = {
  headerDark: '#0B0F1E',
  wallWood: '#1F2A3A',
  wallWoodDark: '#172231',
  wallWoodLine: '#3C5068',
  rail: '#7EA0C8',
  paper: '#263445',
  paperLine: '#34465C',
  counterTop: '#3C4A5E',
  counterBottom: '#2A3646',
  counterEdge: '#6EE7FF',
  counterLine: '#1E2A38',
  floor: '#2C3A4A',
  floorLine: '#3C4E62',
  floorDark: '#253242',
  ledge: '#34465C',
  ledgeEdge: '#5E7B9C',
  beltRail: '#0F1522',
  beltTrack: '#1E2A40',
  beltDash: '#6EE7FF',
  gridMat: '#33445A',
  gridLine: 'rgba(110,231,255,.16)',
  accent: '#6EE7FF',
  brand: 'rgba(110,231,255,.35)',
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
