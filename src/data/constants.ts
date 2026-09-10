import type { Tier } from '../engine/types';

export const W = 480;
export const H = 900;

export type GlyphType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hex' | 'heart';

export interface ColorDef {
  name: string;
  hex: string;
  glyph: GlyphType;
}

export const COLORS: ColorDef[] = [
  { name: 'Salmon', hex: '#E5484D', glyph: 'circle' },
  { name: 'Tuna', hex: '#3E7BFA', glyph: 'square' },
  { name: 'Tamago', hex: '#F2B705', glyph: 'triangle' },
  { name: 'Cucumber', hex: '#2FB36B', glyph: 'diamond' },
  { name: 'Eggplant', hex: '#8E5BE0', glyph: 'star' },
  { name: 'Shrimp', hex: '#F5843B', glyph: 'hex' },
  { name: 'Wasabi', hex: '#1FB7D8', glyph: 'heart' },
];

export const GOLD = '#F2B705';

export const TIER_COLOR: Record<Tier, string> = {
  Easy: '#2FB36B',
  Medium: '#3E7BFA',
  Hard: '#F5843B',
  'Super Hard': '#E5484D',
};

export const SEAT_Y = 452;
export const DINER_R = 24;
export const GRID = { x: 40, y: 576, w: 400, h: 304 };
export const KITCHEN = { x: 120, y: 92, w: 240, h: 70 };
export const COIN_POS = { x: 364, y: 38 };
export const BOOST_Y = 514;
export const BOOST_H = 42;

export const SAVE_KEY = 'sushijam.v2';
export const LEGACY_SAVE_KEY = 'sushijam.v1';
