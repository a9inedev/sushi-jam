import type { BoosterKind } from '../engine/types';
import type { SaveState } from '../meta/save';

/** Coin price of each booster when the player has none in inventory. */
export const COST: Record<BoosterKind, number> = { vip: 150, takeout: 200, sendback: 80 };

export type ProductId = 'starter' | 'coins1' | 'coins2' | 'rescue' | 'noads' | 'season';

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

/** The catalogue. Order is the shop order. */
export const PRODUCTS: Product[] = [
  {
    id: 'starter',
    storeId: 'sushijam.starter',
    name: 'Starter Pack',
    price: '$1.99',
    desc: '600 coins + 1 of each booster',
    kind: 'consumable',
    grant: (s) => {
      s.coins += 600;
      s.inv.vip++;
      s.inv.takeout++;
      s.inv.sendback++;
    },
  },
  {
    id: 'coins1',
    storeId: 'sushijam.coins.pouch',
    name: 'Coin Pouch',
    price: '$1.99',
    desc: '500 coins',
    kind: 'consumable',
    grant: (s) => void (s.coins += 500),
  },
  {
    id: 'coins2',
    storeId: 'sushijam.coins.chest',
    name: 'Coin Chest',
    price: '$7.99',
    desc: '2,600 coins',
    kind: 'consumable',
    grant: (s) => void (s.coins += 2600),
  },
  {
    id: 'rescue',
    storeId: 'sushijam.rescue',
    name: "Chef's Rescue",
    price: '$4.99',
    desc: '+1 seat, a diner served, belt cleared, +200 coins',
    kind: 'consumable',
    // The seat, the served diner and the cleared belt are applied by the fail card; the coins are the grant.
    grant: (s) => void (s.coins += 200),
  },
  {
    id: 'noads',
    storeId: 'sushijam.noads',
    name: 'No Ads',
    price: '$6.99',
    desc: 'Removes ad breaks between levels',
    kind: 'entitlement',
    entitlement: 'no_ads',
    grant: (s) => void (s.noAds = true),
  },
  {
    id: 'season',
    storeId: 'sushijam.season',
    name: 'Season Pass',
    price: '$9.99',
    desc: 'Premium track for the current season',
    // A consumable per season: the premium flag lives with the season and is re-granted on restore from a
    // transaction dated inside the season's window.
    kind: 'consumable',
    grant: (s) => void (s.season.premium = true),
  },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productByStoreId(storeId: string): Product | undefined {
  return PRODUCTS.find((p) => p.storeId === storeId);
}
