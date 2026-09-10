# Leaderboards, profile and the share card

The weekly "ghost" board is gone. The map's Ranks tab shows two real boards through the platform services:

| Board         | What is posted                                                   | Game Center                          | Play Games                                      |
| ------------- | ---------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| Weekly levels | levels cleared this ISO week (`S.weekly`), after every level win | recurring leaderboard, weekly period | any leaderboard, read with the weekly time span |
| Rush best     | a rush run's score, when it ties or beats the best               | classic leaderboard                  | classic leaderboard                             |

Board ids live in one place, `src/data/leaderboards.ts`, with placeholders for Play Games. The store links the
share card prints are there too.

## The plugin

`GameServices` is an in-repo Capacitor plugin (no npm package offers Game Center and Play Games on
Capacitor 8 with a way to read entries):

- `src/platform/game-services.ts` declares the contract (`status`, `signIn`, `submitScore`, `loadScores`,
  `showLeaderboard`) and the web implementation, which keeps this device's best per board in `localStorage`.
- Android: `android/app/src/main/java/com/a9inedev/sushijam/GameServicesPlugin.java`, Play Games Services v2
  (`play-services-games-v2`). Registered in `MainActivity`. The project id goes in `res/values/strings.xml`
  (`game_services_project_id`, read by the manifest's `com.google.android.gms.games.APP_ID`).
- iOS: `ios/App/App/GameServicesPlugin.swift`, GameKit. Registered by `SushiBridgeViewController`, which the
  storyboard uses. `App.entitlements` turns Game Center on; in Xcode confirm Signing & Capabilities shows it.

## Setting the boards up

1. App Store Connect: create a recurring leaderboard `sushijam.weekly_levels` (weekly, higher is better,
   integer) and a classic leaderboard `sushijam.rush_best`. Enable Game Center for the app version.
2. Play Console: create a Play Games Services project, link the app, note the project id, create two
   leaderboards (integer, higher is better) and paste their ids into `BOARD_IDS.*.android`. Paste the project id
   into `strings.xml`. Add the OAuth client for the signing certificate you test with.
3. Build, run on a device signed in to Game Center or Play Games, open Ranks and tap Sign in.

## Runtime rules (`src/meta/leaderboards.ts`)

- Scores are queued the moment they are earned (`S.lbQueue`, saved) and posted whenever a backend, a sign-in
  and a network are all there: at boot, on sign-in, when the browser or app comes back online or to the
  foreground, and right after a score is earned. A failed post keeps the entry and everything after it.
- The queue keeps the best per board (per week for the weekly board). A weekly entry that outlives its ISO week
  is dropped: the period it belonged to has closed on both services.
- Reads are cached for a minute per board. The player's row is matched by player id.
- `installMock` swaps in a scripted backend for the smoke test and the dev panel (`__SJ.leaderboards.mock`).

## Profile

`S.profile` holds a name (up to 16 characters, typed in a DOM field the game places over the canvas) and an
avatar picked from the seven diners. `S.bestStreak` is kept by the level win. The Profile screen shows the bests,
the sign-in state and a Share button.

## Share card

`src/meta/share.ts` renders a 1080x1080 PNG off screen: the current restaurant's wall and floor colours, the
belt ring with the seven plates, the player's diner and name, "Level N cleared!" or "N plates in Rush!", and
the store link for the platform. On iOS and Android the file is written to the cache directory and handed to
the native share sheet (`@capacitor/share`, `@capacitor/filesystem`); on the web it goes through the Web Share
API where files are supported, else opens in a new tab, else downloads. The buttons are on the level win card,
the rush card and the Profile screen.

## Dev API

`__SJ.leaderboards.state() / signIn() / flush() / refresh(board) / mock(opts|null) / show(board)`,
`__SJ.profile.setName(name) / setAvatar(i)`, `__SJ.share.render(kind) / share(kind)`.

## Not verified here

The native plugin code was written against the Play Games Services v2 and GameKit APIs but has not been built
or run on a device from this machine (no Android SDK or Xcode). The web fallback, the queue, the profile and the
share card are covered by `tests/leaderboards.test.ts` and the smoke test with the mock backend.
