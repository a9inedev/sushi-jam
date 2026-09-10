/* The catalogue and every coin number the game uses, read from products.json so the economy model
   (tools/economy.mjs) and the game share one source. Nothing here decides when coins move; rules.ts and the
   meta modules do, using these numbers. */

import type { BoosterKind } from '../engine/types';
import type { SaveState } from '../meta/save';
import data from './products.json';

export type ProductId = 'starter' | 'coins1' | 'coins2' | 'rescue' | 'noads' | 'season';

export interface Economy {
  start: { coins: number; inv: Record<BoosterKind, number> };
  boosters: Record<BoosterKind, number>;
  win: { base: number; slope: number; streakStep: number; streakMax: number };
  daily: { base: number; step: number; maxDays: number };
  puzzle: { base: number; perStreakDay: number; maxStreak: number };
  rush: { perPlate: number; cap: number };
  zen: { share: number };
  boss: { coins: number };
  rescue: { coins: number };
}

interface ProductJson {
  id: string;
  storeId: string;
  name: string;
  price: string;
  desc: string;
  kind: 'consumable' | 'entitlement';
  entitlement?: string;
  coins?: number;
  boosters?: Partial<Record<BoosterKind, number>>;
  flag?: 'noAds' | 'seasonPremium';
}

/** Every tunable coin number. */
export const ECON: Economy = data as unknown as Economy;

/** Coin price of each booster when the player has none in inventory. */
export const COST: Record<BoosterKind, number> = ECON.boosters;

export interface Product {
  id: ProductId;
  /** The identifier in App Store Connect and the Play Console (and the RevenueCat product). */
  storeId: string;
  name: string;
  /** Fallback price, shown until the store has answered with the localised one. */
  price: string;
  desc: string;
  /** Consumables are granted per transaction; entitlements are flags the store keeps for the account. */
  kind: 'consumable' | 'entitlement';
  entitlement?: 'no_ads';
  grant: (s: SaveState) => void;
}

function grantOf(p: ProductJson): (s: SaveState) => void {
  return (s) => {
    if (p.coins) s.coins += p.coins;
    if (p.boosters) for (const [k, n] of Object.entries(p.boosters)) s.inv[k as BoosterKind] += n || 0;
    if (p.flag === 'noAds') s.noAds = true;
    if (p.flag === 'seasonPremium') s.season.premium = true;
  };
}

/** The catalogue, in shop order. */
export const PRODUCTS: Product[] = (data.products as ProductJson[]).map((p) => ({
  id: p.id as ProductId,
  storeId: p.storeId,
  name: p.name,
  price: p.price,
  desc: p.desc,
  kind: p.kind,
  entitlement: p.entitlement as 'no_ads' | undefined,
  grant: grantOf(p),
}));

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productByStoreId(storeId: string): Product | undefined {
  return PRODUCTS.find((p) => p.storeId === storeId);
}

/* ---------- reward formulas, one place ---------- */

export function streakBonus(streak: number): number {
  return Math.min(ECON.win.streakMax, Math.max(0, streak - 1) * ECON.win.streakStep);
}

export function dailyReward(dayStreak: number): number {
  return ECON.daily.base + Math.min(ECON.daily.maxDays - 1, Math.max(0, dayStreak - 1)) * ECON.daily.step;
}

export function puzzleReward(puzzleStreak: number): number {
  return ECON.puzzle.base + Math.min(ECON.puzzle.maxStreak, puzzleStreak) * ECON.puzzle.perStreakDay;
}

export function rushReward(score: number): number {
  return Math.min(ECON.rush.cap, score * ECON.rush.perPlate);
}
