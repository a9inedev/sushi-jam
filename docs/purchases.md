# Purchases

RevenueCat fronts StoreKit 2 on iOS and Play Billing on Android through `@revenuecat/purchases-capacitor`.
RevenueCat validates receipts on its servers: a purchase only comes back as a customer info once the receipt
has been verified, and the same customer info is what "restore" and the launch check read. Without an API key
(the web build, or a native build before the keys are set) the demo store from before takes over: it grants
instantly, charges nothing and says so on every button.

## Catalogue (`src/data/products.ts`)

| Product       | Store id               | Price | Kind        | Grants                                            |
| ------------- | ---------------------- | ----- | ----------- | ------------------------------------------------- |
| Starter Pack  | `sushijam.starter`     | $1.99 | consumable  | 600 coins + 1 of each booster                     |
| Coin Pouch    | `sushijam.coins.pouch` | $1.99 | consumable  | 500 coins                                         |
| Coin Chest    | `sushijam.coins.chest` | $7.99 | consumable  | 2,600 coins                                       |
| Chef's Rescue | `sushijam.rescue`      | $4.99 | consumable  | +1 seat, a diner served, belt cleared, +200 coins |
| No Ads        | `sushijam.noads`       | $6.99 | entitlement | `no_ads`: removes ad breaks                       |
| Season Pass   | `sushijam.season`      | $9.99 | consumable  | premium track for the current season              |

Prices in the table are fallbacks; the shop shows the store's localised price once it has answered.

## Flows

- **Shop**: every product, the localised price, Owned for No Ads and the season pass, a spinner while the
  store sheet is open.
- **Fail offer**: the fail card's Chef's Rescue button with its 10 second timer. Contents as before. Shown once
  per fail. The timer holds while the store sheet is open, so a slow sheet never expires the offer under the
  player; the rescue applies when the purchase resolves.
- **Starter pack** (`src/meta/offers.ts`): once, after the first fail (when Retry is tapped) or after clearing
  level 5, whichever comes first. Declined: shown one more time 24 hours later. Bought: never again.
- **Restore** (Settings, Account tab): asks the store what the account owns and applies it. No Ads and a season
  pass bought inside the current season come back; consumables do not, by design on both stores.
- **Launch**: `initPurchases` configures the SDK, fetches prices, applies the account's entitlements
  (`applyStoreInfo`) and subscribes to customer info updates. With a real store, No Ads follows the entitlement
  exactly; with the demo store the save is the account.
- **Once per transaction**: every grant is keyed by the store transaction id (`S.purchases.tx`, last 100), so a
  purchase reported twice (the SDK retries, a listener fires) never grants twice.

## Setup

1. RevenueCat: create the project, add the iOS and Android apps, add the six products with the store ids above,
   create the entitlement `no_ads` attached to `sushijam.noads`. Copy the public API keys.
2. Keys: `.env` (not committed) with `VITE_RC_IOS_KEY` and `VITE_RC_ANDROID_KEY`; see `.env.example`. Builds
   without keys run the demo store.
3. App Store Connect: create the six in-app purchases (consumables, and No Ads as non-consumable) with the
   store ids, fill metadata and screenshots, add a sandbox tester under Users and Access. Xcode: Signing &
   Capabilities, add In-App Purchase.
4. Play Console: create the six in-app products with the same ids, activate them, add license testers, publish
   to the internal testing track (Play Billing needs the app installed from Play for purchases to work).
5. `npm run build && npx cap sync`, then build from Xcode / Android Studio.

## Sandbox test plan

Run on a device signed in as a sandbox tester (iOS) or a license tester (Android, app installed from the
internal track). Tick each line on both platforms.

| #   | Step                                                             | Expect                                                                        |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Launch with keys set                                             | Shop shows localised prices, no "demo" labels                                 |
| 2   | Buy Coin Pouch                                                   | Store sheet, then +500 coins and a toast; RevenueCat dashboard shows the tx   |
| 3   | Buy Coin Pouch again                                             | Second grant (new transaction id)                                             |
| 4   | Start a purchase, cancel the sheet                               | No grant, no error toast                                                      |
| 5   | Airplane mode, buy                                               | "Purchase did not complete" toast, nothing granted                            |
| 6   | Fail a level, tap Chef's Rescue, wait 12 s on the sheet, confirm | Timer held; rescue applied after confirming; +200 coins                       |
| 7   | Fail a level, tap Chef's Rescue, cancel                          | Timer resumes; the button stays until it expires                              |
| 8   | Buy No Ads                                                       | Ad breaks stop; Shop shows Owned                                              |
| 9   | Delete the app, reinstall, Settings, Restore purchases           | No Ads is back ("1 purchase restored"); coins are not (consumables)           |
| 10  | Reinstall, launch, do nothing                                    | No Ads is already on (entitlement check on launch)                            |
| 11  | Buy Season Pass; open Events                                     | Premium track unlocked; restore after reinstall inside the season restores it |
| 12  | Fresh save: fail level 2, tap Retry                              | Starter Pack card; decline; fail again: no card; 24 h later: card once more   |
| 13  | Fresh save: clear level 5                                        | Starter Pack card after the win                                               |
| 14  | Starter Pack: buy                                                | +600 coins, boosters, never shown again                                       |
| 15  | Android: pending purchase (test card "slow")                     | "Waiting for the store" toast; grant arrives via the customer info update     |

## Dev API

`__SJ.store.state() / buy(id) / restore() / mock(opts|null) / init()`. The smoke test runs the whole flow with
`mock`: grant once per transaction, cancel, failure, the fail-card rescue with a slow sheet, the starter pack
triggers and re-show, restore and the launch check.

## Not verified here

No sandbox purchase has been made from this machine: there are no store accounts, keys or signed builds yet.
Both native projects compile with the SDK in the Mobile workflow.
