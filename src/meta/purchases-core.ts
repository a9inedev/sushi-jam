/* The pure parts of purchasing: the once-per-transaction guard and the mapping from what the store says the
   account owns to the flags the game keeps. */

import type { StoreInfo } from '../platform/store';

export const TX_KEEP = 100;

/** Grant a transaction at most once. Returns whether this is the first time and the updated list. */
export function grantOnce(seen: string[], txId: string): { granted: boolean; seen: string[] } {
  if (seen.includes(txId)) return { granted: false, seen };
  const next = seen.concat([txId]);
  return { granted: true, seen: next.length > TX_KEEP ? next.slice(-TX_KEEP) : next };
}

export interface StoreFlags {
  noAds: boolean;
  seasonPremium: boolean;
}

/** What the store's account implies: No Ads from its entitlement; the season pass from a transaction dated
    inside the current season's window (the pass is bought per season). */
export function flagsFromStore(info: StoreInfo, season: { id: string; start: number; end: number } | null): StoreFlags {
  const noAds = info.entitlements.includes('no_ads');
  const seasonPremium =
    !!season && info.transactions.some((t) => t.productId === 'season' && t.at >= season.start && t.at < season.end);
  return { noAds, seasonPremium };
}

export interface PurchaseRecord {
  tx: string[];
  restoredAt: number;
}

export function defaultPurchases(): PurchaseRecord {
  return { tx: [], restoredAt: 0 };
}

export function cleanPurchases(x: unknown): PurchaseRecord {
  const d = defaultPurchases();
  if (!x || typeof x !== 'object') return d;
  const p = x as Record<string, unknown>;
  return {
    tx: Array.isArray(p.tx) ? p.tx.filter((v): v is string => typeof v === 'string').slice(-TX_KEEP) : d.tx,
    restoredAt: typeof p.restoredAt === 'number' && Number.isFinite(p.restoredAt) ? p.restoredAt : 0,
  };
}
