/* Purchases without a store: the catalogue matches the price list, a transaction grants once, the account's
   entitlements map to the flags, the starter offer rule, and the v12 save fields. */
import { describe, expect, it } from 'vitest';
import { PRODUCTS, productByStoreId } from '../src/data/products';
import { defaultStarter, shouldShowStarter, STARTER_RESHOW_MS } from '../src/meta/offers';
import { cleanPurchases, flagsFromStore, grantOnce, TX_KEEP } from '../src/meta/purchases-core';
import { defaultSave, migrateV11toV12, normalize, SAVE_VERSION } from '../src/meta/save-schema';

describe('catalogue', () => {
  it('has the six products at the agreed prices with unique store ids', () => {
    const list = PRODUCTS.map((p) => [p.name, p.price]);
    expect(list).toEqual([
      ['Starter Pack', '$1.99'],
      ['Coin Pouch', '$1.99'],
      ['Coin Chest', '$7.99'],
      ["Chef's Rescue", '$4.99'],
      ['No Ads', '$6.99'],
      ['Season Pass', '$9.99'],
    ]);
    expect(new Set(PRODUCTS.map((p) => p.storeId)).size).toBe(PRODUCTS.length);
    expect(productByStoreId('sushijam.noads')?.entitlement).toBe('no_ads');
    expect(PRODUCTS.filter((p) => p.kind === 'entitlement').map((p) => p.id)).toEqual(['noads']);
  });

  it('grants what it says', () => {
    const s = defaultSave();
    s.coins = 0;
    for (const p of PRODUCTS) p.grant(s);
    expect(s.coins).toBe(600 + 500 + 2600 + 200);
    expect(s.inv).toEqual({ vip: 1, takeout: 1, sendback: 1 });
    expect(s.noAds).toBe(true);
    expect(s.season.premium).toBe(true);
  });
});

describe('grant once', () => {
  it('a transaction id is granted the first time only, and the list stays bounded', () => {
    let seen: string[] = [];
    const a = grantOnce(seen, 'tx-1');
    expect(a.granted).toBe(true);
    seen = a.seen;
    expect(grantOnce(seen, 'tx-1').granted).toBe(false);
    for (let i = 0; i < TX_KEEP + 20; i++) seen = grantOnce(seen, 'tx-' + (i + 2)).seen;
    expect(seen.length).toBe(TX_KEEP);
    expect(seen.includes('tx-1')).toBe(false);
  });
});

describe('flags from the store', () => {
  it('No Ads follows the entitlement; the season pass follows a transaction inside the season window', () => {
    const season = { id: 's1', start: 1000, end: 2000 };
    expect(flagsFromStore({ entitlements: ['no_ads'], transactions: [] }, season)).toEqual({
      noAds: true,
      seasonPremium: false,
    });
    expect(
      flagsFromStore({ entitlements: [], transactions: [{ id: 't', productId: 'season', at: 1500 }] }, season)
    ).toEqual({ noAds: false, seasonPremium: true });
    expect(
      flagsFromStore({ entitlements: [], transactions: [{ id: 't', productId: 'season', at: 2500 }] }, season)
    ).toEqual({ noAds: false, seasonPremium: false });
    expect(
      flagsFromStore({ entitlements: [], transactions: [{ id: 't', productId: 'season', at: 1500 }] }, null)
        .seasonPremium
    ).toBe(false);
  });
});

describe('starter offer', () => {
  const now = 10_000_000_000;
  it('once after the first fail or after level 5, whichever first', () => {
    const st = defaultStarter();
    expect(shouldShowStarter(st, 'level', 4, now)).toBe(false);
    expect(shouldShowStarter(st, 'level', 5, now)).toBe(true);
    expect(shouldShowStarter(st, 'fail', 1, now)).toBe(true);
  });
  it('re-shows once, 24 hours after a decline, never once bought', () => {
    const shown = { shows: 1, lastAt: now, bought: false };
    expect(shouldShowStarter(shown, 'fail', 2, now + 3600000)).toBe(false);
    expect(shouldShowStarter(shown, 'fail', 2, now + STARTER_RESHOW_MS)).toBe(true);
    expect(shouldShowStarter(shown, 'level', 3, now + STARTER_RESHOW_MS)).toBe(false);
    expect(shouldShowStarter({ shows: 2, lastAt: now, bought: false }, 'fail', 2, now + 10 * STARTER_RESHOW_MS)).toBe(
      false
    );
    expect(shouldShowStarter({ shows: 0, lastAt: 0, bought: true }, 'fail', 2, now)).toBe(false);
  });
});

describe('save v12', () => {
  it('migrates the old starter flag and adds the purchase record', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(12);
    const v11: Record<string, unknown> = {
      ...(defaultSave() as unknown as Record<string, unknown>),
      starterShown: true,
    };
    delete v11.starter;
    delete v11.purchases;
    const v12 = migrateV11toV12(v11, 5000);
    expect(v12.starter).toEqual({ shows: 1, lastAt: 5000, bought: false });
    expect(v12.purchases).toEqual({ tx: [], restoredAt: 0 });
    expect('starterShown' in v12).toBe(false);
    const s = normalize({
      ...v12,
      purchases: { tx: ['a', 3, 'b'], restoredAt: 'x' },
      starter: { shows: 2.7, bought: 'yes' },
    });
    expect(s.purchases).toEqual({ tx: ['a', 'b'], restoredAt: 0 });
    expect(s.starter).toEqual({ shows: 2, lastAt: 0, bought: false });
    expect(cleanPurchases(null)).toEqual({ tx: [], restoredAt: 0 });
  });
});
