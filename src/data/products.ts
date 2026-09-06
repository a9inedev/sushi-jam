import type { BoosterKind } from '../engine/types';
import type { SaveState } from '../meta/save';

/** Coin price of each booster when the player has none in inventory. */
export const COST: Record<BoosterKind, number> = { vip: 150, takeout: 200, sendback: 80 };

export interface Product {
  id: string;
  name: string;
  price: string;
  desc: string;
  grant: (s: SaveState) => void;
}

/** Demo store catalogue. Purchases only move coins and inventory around; nothing is charged. */
export const PRODUCTS: Product[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: '$1.99',
    desc: '600 coins + 1 of each booster',
    grant: (s) => {
      s.coins += 600;
      s.inv.vip++;
      s.inv.takeout++;
      s.inv.sendback++;
    },
  },
  { id: 'coins1', name: 'Coin Pouch', price: '$1.99', desc: '500 coins', grant: (s) => void (s.coins += 500) },
  { id: 'coins2', name: 'Coin Chest', price: '$7.99', desc: '2,600 coins', grant: (s) => void (s.coins += 2600) },
  {
    id: 'noads',
    name: 'No Ads',
    price: '$6.99',
    desc: 'Removes ad breaks between levels',
    grant: (s) => void (s.noAds = true),
  },
];
