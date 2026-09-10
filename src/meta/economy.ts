import { sfx } from '../audio/audio';
import { DECOR, setComplete, themeById } from '../data/themes';
import { productById, type ProductId } from '../data/products';
import { buy } from './purchases';
import { G, toast } from '../engine/state';
import { t } from '../i18n';
import { S, save } from './save';

/** Buy through the store (RevenueCat, or the demo store without keys). The grant happens in meta/purchases. */
export function buyProduct(id: string): void {
  if (!productById(id)) return;
  void buy(id as ProductId);
}

export function buyDecor(id: string): boolean {
  const d = DECOR.find((d) => d.id === id);
  if (!d || S.decor.includes(id) || S.coins < d.cost) return false;
  S.coins -= d.cost;
  S.decor.push(id);
  // Owning the whole set of a restaurant pays its completion reward, once.
  const th = themeById(d.theme);
  let bonus = 0;
  if (!S.decorRewards.includes(th.id) && setComplete(th.id, S.decor)) {
    S.decorRewards.push(th.id);
    S.coins += th.reward;
    bonus = th.reward;
  }
  save();
  sfx.cash();
  toast(t('toast.installed', { name: t('decor.' + d.id + '.name') }), 2);
  if (bonus) {
    sfx.win();
    G.coinPop = 1;
    toast(t('decor.setComplete', { name: t('theme.' + th.id + '.name'), n: bonus }), 3.2, 0.6);
  }
  return true;
}
