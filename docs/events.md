# Events and the season pass

Everything about live events is data. `src/data/events.json` is the bundled fallback; the same file is published next to the page (`https://a9inedev.github.io/sushi-jam/curve.json`'s sibling `events.json`), fetched at boot with a 4 s timeout, validated, cached in `localStorage` (`sushijam.events`) and applied. Editing the JSON and publishing it turns an event on for every installed copy at its next launch, with no build.

## Definitions

```json
{
  "v": 1,
  "events": [
    {
      "id": "hot-streak",
      "type": "streak",
      "name": "Hot streak",
      "start": "2026-09-08T00:00:00Z",
      "end": "2026-09-22T00:00:00Z",
      "goal": 5,
      "rewards": { "coins": 300, "points": 40 }
    },
    {
      "id": "salmon-rush",
      "type": "plates",
      "name": "Salmon rush",
      "color": 0,
      "start": "…",
      "end": "…",
      "goal": 60,
      "rewards": { "coins": 250, "sendback": 2 }
    },
    {
      "id": "boss-weekend",
      "type": "boss",
      "name": "Boss weekend",
      "level": 40,
      "start": "…",
      "end": "…",
      "rewards": { "vip": 1, "points": 60 }
    }
  ],
  "season": {
    "id": "s1",
    "name": "Season one",
    "start": "…",
    "end": "…",
    "pointsPerTier": 100,
    "tiers": [{ "free": { "coins": 50 }, "premium": { "coins": 100 } }, "… 30 tiers"]
  }
}
```

- **streak**: win `goal` levels in a row (the level loop's own streak; a fail resets it). Progress is the best streak reached while the event runs.
- **plates**: serve `goal` plates of `color` (0 to 6) across any mode.
- **boss**: beat one boss board, built from the curve row `level` with every rule forced on and a seed derived from the event id, so it is the same board for everyone. Reachable from the Events screen while the event runs.
- **rewards**: `coins`, `points` (season points), `vip`, `takeout`, `sendback`. Names can be localised with `"names": { "de": "…" }`.
- **season**: 30 tiers by default (1 to 60 allowed), `pointsPerTier` points each, a free and a premium reward per tier. Points come from wins (level 10, daily 15, rush 5, zen 4) and from event rewards. Premium is the demo product `season` in the shop until Phase 4.

`validateEvents` (`src/data/events-schema.ts`) rejects anything malformed with a reason; a bad remote file never replaces a good one.

## Lifetime rules

- An event is visible while it runs, and after it ends only if it was finished and the reward is unclaimed. Finishing snapshots the name and reward into the save, so the reward survives the definition being removed from the JSON. Claiming grants it and drops the entry.
- Once a second `tickEvents` prunes progress of events that ended unfinished and of claimed events; nothing else is touched.
- A season that ends, or is replaced by a new id, hands over every reached, unclaimed tier at once (a toast says how many) before the new season starts from zero.
- Time comes from an injectable clock (`setEventsClock`), which the tests and the dev panel use.

## Surfaces

- Map, Path tab: a banner with the featured event (a claimable one first, else the soonest to end), its progress, countdown and a Claim button; the season strip when nothing runs. Tap opens the Events screen.
- HUD: a slim progress strip under the level label (rush shows its score there instead).
- Events screen: running and claimable events with countdowns and goals, Play for a boss, Claim; the season pass with points, the 30-tier grid (free on top, premium below, gold outline when ready, tap to claim), Claim all, and the premium unlock.
- Dev: `__SJ.events.state()`, `.claim(id)`, `.fetch(url)`, `.setUrl(url)`, `.setNow(ms)`, `.reset()`.

## Testing it

`tests/events.test.ts` drives the pure layer with a fake clock. The smoke test serves a modified `events.json` next to the build through the URL override, reloads, and checks the event appears, progresses, expires and stays claimable.
