/* The store behind one interface. RevenueCat (StoreKit 2 on iOS, Play Billing on Android) when the native app
   has an API key; the demo store otherwise, which grants instantly and charges nothing; and a scripted mock for
   the smoke test. Receipt validation happens on RevenueCat's servers: a purchase only comes back as a customer
   info once the receipt has been verified. */

import { PRODUCTS, productByStoreId, type ProductId } from '../data/products';
import { isNative, platform } from './native';

export type StoreKind = 'revenuecat' | 'demo' | 'mock';

export interface StoreProduct {
  id: ProductId;
  price: string;
}

export interface StoreTransaction {
  id: string;
  productId: ProductId;
  at: number;
}

/** What the store says the account owns. */
export interface StoreInfo {
  entitlements: string[];
  transactions: StoreTransaction[];
}

export interface PurchaseResult {
  status: 'ok' | 'cancelled' | 'failed' | 'pending';
  txId?: string;
  error?: string;
  info?: StoreInfo;
}

export interface StoreProvider {
  kind: StoreKind;
  /** Fails softly: false means the demo store takes over. */
  configure(): Promise<boolean>;
  products(): Promise<StoreProduct[]>;
  buy(id: ProductId): Promise<PurchaseResult>;
  restore(): Promise<StoreInfo>;
  info(): Promise<StoreInfo>;
  onUpdate(cb: (info: StoreInfo) => void): void;
}

export const RC_KEYS = {
  ios: (import.meta.env && (import.meta.env.VITE_RC_IOS_KEY as string | undefined)) || '',
  android: (import.meta.env && (import.meta.env.VITE_RC_ANDROID_KEY as string | undefined)) || '',
};

export function revenueCatKey(): string {
  return platform === 'ios' ? RC_KEYS.ios : platform === 'android' ? RC_KEYS.android : '';
}

/* ---------- RevenueCat ---------- */

type RcModule = typeof import('@revenuecat/purchases-capacitor');

function toInfo(ci: {
  entitlements: { active: Record<string, unknown> };
  nonSubscriptionTransactions: { transactionIdentifier: string; productIdentifier: string; purchaseDate: string }[];
}): StoreInfo {
  const transactions: StoreTransaction[] = [];
  for (const t of ci.nonSubscriptionTransactions || []) {
    const p = productByStoreId(t.productIdentifier);
    if (p) transactions.push({ id: t.transactionIdentifier, productId: p.id, at: Date.parse(t.purchaseDate) || 0 });
  }
  return { entitlements: Object.keys(ci.entitlements?.active || {}), transactions };
}

class RevenueCatProvider implements StoreProvider {
  kind: StoreKind = 'revenuecat';
  private rc: RcModule | null = null;
  private byId = new Map<ProductId, unknown>();

  async configure(): Promise<boolean> {
    const apiKey = revenueCatKey();
    if (!isNative || !apiKey) return false;
    this.rc = await import('@revenuecat/purchases-capacitor');
    await this.rc.Purchases.configure({ apiKey });
    return true;
  }

  async products(): Promise<StoreProduct[]> {
    if (!this.rc) return [];
    const { products } = await this.rc.Purchases.getProducts({
      productIdentifiers: PRODUCTS.map((p) => p.storeId),
      type: this.rc.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });
    const out: StoreProduct[] = [];
    for (const sp of products) {
      const p = productByStoreId(sp.identifier);
      if (!p) continue;
      this.byId.set(p.id, sp);
      out.push({ id: p.id, price: sp.priceString });
    }
    return out;
  }

  async buy(id: ProductId): Promise<PurchaseResult> {
    if (!this.rc) return { status: 'failed', error: 'store not configured' };
    let product = this.byId.get(id);
    if (!product) {
      await this.products();
      product = this.byId.get(id);
    }
    if (!product) return { status: 'failed', error: 'product not found in the store' };
    try {
      const r = await this.rc.Purchases.purchaseStoreProduct({
        product: product as Parameters<RcModule['Purchases']['purchaseStoreProduct']>[0]['product'],
      });
      const info = toInfo(r.customerInfo);
      const p = productById(id);
      const mine = info.transactions.filter((t) => t.productId === id).sort((a, b) => b.at - a.at)[0];
      const txId = mine ? mine.id : `${p ? p.storeId : id}:${Date.now()}`;
      return { status: 'ok', txId, info };
    } catch (e) {
      const err = e as { code?: number | string; userCancelled?: boolean | null; message?: string };
      if (err.userCancelled || err.code === this.rc.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)
        return { status: 'cancelled' };
      if (err.code === this.rc.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pending' };
      return { status: 'failed', error: String(err.message || e) };
    }
  }

  async restore(): Promise<StoreInfo> {
    if (!this.rc) return { entitlements: [], transactions: [] };
    return toInfo((await this.rc.Purchases.restorePurchases()).customerInfo);
  }

  async info(): Promise<StoreInfo> {
    if (!this.rc) return { entitlements: [], transactions: [] };
    return toInfo((await this.rc.Purchases.getCustomerInfo()).customerInfo);
  }

  onUpdate(cb: (info: StoreInfo) => void): void {
    if (!this.rc) return;
    void this.rc.Purchases.addCustomerInfoUpdateListener((ci) => cb(toInfo(ci)));
  }
}

function productById(id: ProductId) {
  return PRODUCTS.find((p) => p.id === id);
}

/* ---------- demo ---------- */

/** Grants instantly, charges nothing. Its "account" is the save itself, so it never overrides it. */
class DemoProvider implements StoreProvider {
  kind: StoreKind = 'demo';
  owned: () => string[] = () => [];
  async configure(): Promise<boolean> {
    return true;
  }
  async products(): Promise<StoreProduct[]> {
    return [];
  }
  async buy(id: ProductId): Promise<PurchaseResult> {
    return { status: 'ok', txId: `demo:${id}:${Date.now()}` };
  }
  async restore(): Promise<StoreInfo> {
    return { entitlements: this.owned(), transactions: [] };
  }
  async info(): Promise<StoreInfo> {
    return this.restore();
  }
  onUpdate(): void {}
}

/* ---------- mock ---------- */

export interface StoreMockOptions {
  result?: PurchaseResult['status'];
  delayMs?: number;
  /** A fixed transaction id, to test the once-per-transaction guard. */
  txId?: string;
  entitlements?: string[];
  transactions?: StoreTransaction[];
  prices?: Partial<Record<ProductId, string>>;
}

export class MockProvider implements StoreProvider {
  kind: StoreKind = 'mock';
  opts: StoreMockOptions = {};
  calls: { op: string; id?: ProductId }[] = [];
  private cb: ((info: StoreInfo) => void) | null = null;
  async configure(): Promise<boolean> {
    return true;
  }
  async products(): Promise<StoreProduct[]> {
    return Object.entries(this.opts.prices || {}).map(([id, price]) => ({
      id: id as ProductId,
      price: price as string,
    }));
  }
  private snapshot(): StoreInfo {
    return { entitlements: this.opts.entitlements || [], transactions: this.opts.transactions || [] };
  }
  async buy(id: ProductId): Promise<PurchaseResult> {
    this.calls.push({ op: 'buy', id });
    if (this.opts.delayMs) await new Promise((r) => setTimeout(r, this.opts.delayMs));
    const status = this.opts.result || 'ok';
    if (status !== 'ok') return { status, error: status === 'failed' ? 'mock: refused' : undefined };
    return { status, txId: this.opts.txId || `mock:${id}:${Date.now()}:${Math.random()}`, info: this.snapshot() };
  }
  async restore(): Promise<StoreInfo> {
    this.calls.push({ op: 'restore' });
    return this.snapshot();
  }
  async info(): Promise<StoreInfo> {
    this.calls.push({ op: 'info' });
    return this.snapshot();
  }
  onUpdate(cb: (info: StoreInfo) => void): void {
    this.cb = cb;
  }
  /** Push an update as the real SDK would after a purchase on another device. */
  push(): void {
    if (this.cb) this.cb(this.snapshot());
  }
}

export const demoStore = new DemoProvider();
export const revenueCatStore = new RevenueCatProvider();
