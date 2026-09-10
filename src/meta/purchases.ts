/* Purchases at runtime: pick the store, check entitlements at launch, buy with a once-per-transaction grant,
   restore, and keep the localised prices. Nothing here talks to the store SDK directly (platform/store.ts). */

import { sfx } from '../audio/audio';
import { PRODUCTS, productById, type ProductId } from '../data/products';
import { G, toast } from '../engine/state';
import { t } from '../i18n';
import {
  demoStore,
  MockProvider,
  revenueCatStore,
  type PurchaseResult,
  type StoreInfo,
  type StoreKind,
  type StoreMockOptions,
  type StoreProvider,
} from '../platform/store';
import { eventsConfig } from './events';
import { flagsFromStore, grantOnce } from './purchases-core';
import { S, save } from './save';

export const store = {
  kind: 'demo' as StoreKind,
  ready: false,
  busy: null as ProductId | null,
  prices: {} as Partial<Record<ProductId, string>>,
  entitlements: [] as string[],
  lastError: null as string | null,
  lastRestore: null as { at: number; count: number } | null,
};

let provider: StoreProvider = demoStore;
let mock: MockProvider | null = null;

demoStore.owned = () => (S.noAds ? ['no_ads'] : []);

export function isDemoStore(): boolean {
  return store.kind === 'demo';
}

export function priceOf(id: ProductId): string {
  return store.prices[id] || productById(id)?.price || '';
}

/** Apply what the store says the account owns. A real store is authoritative for No Ads; the demo store's
    account is the save itself, so it only ever adds. Returns how many flags changed. */
export function applyStoreInfo(info: StoreInfo): number {
  store.entitlements = info.entitlements;
  const season = eventsConfig().season;
  const flags = flagsFromStore(info, season ? { id: season.id, start: season.start, end: season.end } : null);
  const authoritative = store.kind !== 'demo';
  let changed = 0;
  const noAds = authoritative ? flags.noAds : S.noAds || flags.noAds;
  if (noAds !== S.noAds) {
    S.noAds = noAds;
    changed++;
  }
  if (flags.seasonPremium && !S.season.premium) {
    S.season.premium = true;
    changed++;
  }
  if (changed) save();
  return changed;
}

/** Boot: configure, fetch prices, check entitlements, listen for updates. Never throws. */
export async function initPurchases(): Promise<void> {
  try {
    if (!mock) {
      const rc = await revenueCatStore.configure().catch((e) => {
        store.lastError = String((e as Error)?.message || e);
        return false;
      });
      provider = rc ? revenueCatStore : demoStore;
    }
    store.kind = provider.kind;
    store.ready = true;
    const products = await provider.products();
    for (const p of products) store.prices[p.id] = p.price;
    applyStoreInfo(await provider.info());
    provider.onUpdate((info) => applyStoreInfo(info));
  } catch (e) {
    store.lastError = String((e as Error)?.message || e);
  }
}

function grant(id: ProductId, txId: string): boolean {
  const p = productById(id);
  if (!p) return false;
  const r = grantOnce(S.purchases.tx, txId);
  if (!r.granted) return false;
  S.purchases.tx = r.seen;
  p.grant(S);
  save();
  return true;
}

/** Buy a product. Resolves with what happened; the grant is applied here, once per transaction. */
export async function buy(id: ProductId): Promise<PurchaseResult & { granted: boolean }> {
  const p = productById(id);
  if (!p || store.busy) return { status: 'failed', granted: false, error: store.busy ? 'busy' : 'unknown product' };
  store.busy = id;
  try {
    const r = await provider.buy(id);
    if (r.status === 'ok') {
      const granted = grant(id, r.txId || `${p.storeId}:${Date.now()}`);
      if (r.info) applyStoreInfo(r.info);
      if (granted) {
        G.coinPop = 1;
        sfx.cash();
        toast(
          isDemoStore()
            ? t('toast.purchased', { name: t('product.' + id + '.name') })
            : t('toast.bought', { name: t('product.' + id + '.name') }),
          2.6
        );
      }
      return { ...r, granted };
    }
    if (r.status === 'failed') {
      store.lastError = r.error || 'failed';
      toast(t('shop.failed'), 2.6);
    } else if (r.status === 'pending') toast(t('shop.pending'), 3);
    return { ...r, granted: false };
  } catch (e) {
    store.lastError = String((e as Error)?.message || e);
    toast(t('shop.failed'), 2.6);
    return { status: 'failed', granted: false, error: store.lastError };
  } finally {
    store.busy = null;
  }
}

/** Restore: ask the store what the account owns and apply it. Returns how many flags came back. */
export async function restorePurchases(): Promise<number> {
  if (store.busy) return 0;
  store.busy = 'noads';
  try {
    const info = await provider.restore();
    const before = { noAds: S.noAds, premium: S.season.premium };
    applyStoreInfo(info);
    let n = 0;
    if (S.noAds && !before.noAds) n++;
    if (S.season.premium && !before.premium) n++;
    const owned = (S.noAds ? 1 : 0) + (S.season.premium ? 1 : 0);
    S.purchases.restoredAt = Date.now();
    store.lastRestore = { at: S.purchases.restoredAt, count: owned };
    save();
    toast(owned ? t('shop.restored', { n: owned }) : t('shop.restoredNone'), 2.4);
    return n;
  } catch (e) {
    store.lastError = String((e as Error)?.message || e);
    toast(t('shop.failed'), 2.6);
    return 0;
  } finally {
    store.busy = null;
  }
}

/** Test hook: a scripted store. Passing null goes back to the real choice on the next init. */
export async function installStoreMock(opts: StoreMockOptions | null): Promise<MockProvider | null> {
  if (!opts) {
    mock = null;
    provider = demoStore;
    store.kind = 'demo';
    store.prices = {};
    return null;
  }
  if (!mock) mock = new MockProvider();
  mock.opts = { ...mock.opts, ...opts };
  provider = mock;
  store.kind = 'mock';
  store.prices = {};
  for (const p of await mock.products()) store.prices[p.id] = p.price;
  return mock;
}

export function storeMock(): MockProvider | null {
  return mock;
}

export function catalogue(): { id: ProductId; price: string; owned: boolean }[] {
  return PRODUCTS.map((p) => ({
    id: p.id,
    price: priceOf(p.id),
    owned: (p.id === 'noads' && S.noAds) || (p.id === 'season' && S.season.premium),
  }));
}
