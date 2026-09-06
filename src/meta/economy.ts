import { sfx } from '../audio/audio';
import { DECOR } from '../data/decor';
import { PRODUCTS } from '../data/products';
import { G, toast } from '../engine/state';
import { S, save } from './save';

/** Demo purchase: grants the product instantly. Nothing is charged. */
export function buyProduct(id: string): void {
  const p = PRODUCTS.find((p) => p.id === id);
  if (!p) return;
  p.grant(S);
  G.coinPop = 1;
  save();
  sfx.cash();
  toast(p.name + ' added. Demo purchase, nothing was charged.', 2.6);
}

export function buyDecor(id: string): boolean {
  const d = DECOR.find((d) => d.id === id);
  if (!d || S.decor.includes(id) || S.coins < d.cost) return false;
  S.coins -= d.cost;
  S.decor.push(id);
  save();
  sfx.cash();
  toast(d.name + ' installed!', 2);
  return true;
}
