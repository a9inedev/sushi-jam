/* Seams for the store integrations that arrive in Phase 4. The demo implementations move coins around
   and never charge anything. */

import { PRODUCTS } from '../data/products';
import { S, save } from './save';

export interface PurchaseProvider {
  readonly id: string;
  /** Product ids the player owns; the demo store only knows about No Ads. */
  restore(): Promise<string[]>;
  buy(productId: string): Promise<boolean>;
}

export class DemoPurchaseProvider implements PurchaseProvider {
  readonly id = 'demo';
  async restore(): Promise<string[]> {
    return S.noAds ? ['noads'] : [];
  }
  async buy(productId: string): Promise<boolean> {
    const p = PRODUCTS.find((p) => p.id === productId);
    if (!p) return false;
    p.grant(S);
    save();
    return true;
  }
}

export const purchases: PurchaseProvider = new DemoPurchaseProvider();
