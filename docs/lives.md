# The lives experiment

Two variants run at once behind a remote flag, and the game records what each one does to play. The written
recommendation lives in docs/lives-recommendation.md and is produced by `node tools/lives-report.mjs` from the
collected data; until a week of data exists it says so.

## The two arms

| arm | what the player gets                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | No lives. Fail, retry, as today.                                                                                                                                                                                                                                                                                                                                 |
| B   | 5 lives. A level fail costs one (side modes never do). One comes back every 30 minutes; a full stock parks the clock. At zero the level start is replaced by the out-of-lives card: wait for the countdown, watch a rewarded ad for one life, or go back to the map. Events and season tiers can grant a window of unlimited lives (`livesMinutes` in a reward). |

Everything about B is data: `src/data/flags.json`, published next to the page as `flags.json` and fetched at boot
like the curve and the events (cache `sushijam.flags`, URL override `sushijam.flagsUrl`, 4 s timeout, bundled
fallback).

```json
{
  "v": 1,
  "lives": { "variant": "split", "split": 50, "max": 5, "refillMinutes": 30 },
  "analytics": { "enabled": true }
}
```

- `variant`: `A`, `B`, or `split`. A split assigns each install by a salted hash of its anonymous install id, so
  the arm is stable across launches and independent of any other experiment. Changing the file moves every
  install with no build; `max` and `refillMinutes` apply live (the stock is clamped, a full stock stays full).
- Dev panel: a button forces A or B on this device (`sushijam.livesVariant`), for testing both arms.

## Where lives touch the game

- `src/meta/lives-core.ts` is the model (pure, fixed-clock tests). `src/meta/lives.ts` keeps `S.lives` in the
  save, loses one in `fail()` for level mode, and gates every level start (`withLife`): after a win, on retry,
  on leaving a side mode. Variant A passes every gate and loses nothing.
- HUD: hearts on the side opposite the level label, under the coins; "Unlimited" during a window.
- Save v13: `installId`, `lives {n, max, lastAt, unlimitedUntil}`, `metrics`.

## Analytics

`src/meta/analytics.ts` counts named events per arm in the save (`S.metrics.A` / `.B`) and keeps the last 300
events. No network unless `VITE_ANALYTICS_URL` is set at build time; then the export is POSTed at each session
end (sendBeacon). The export carries the anonymous install id, the arm, the counters and the recent events:
no name, no device identifiers.

| event         | when                                                     |
| ------------- | -------------------------------------------------------- |
| session_start | boot; return to the foreground after a 5 minute gap      |
| session_end   | background, page hide, or the gap above; carries seconds |
| level_start   | a level is built                                         |
| win, fail     | a level ends                                             |
| retry         | Retry on the fail card                                   |
| ad            | an ad finished (`kind`: inter or reward)                 |
| purchase      | a store purchase granted                                 |
| lives_out     | the out-of-lives card opened                             |

The three comparison metrics, per arm: average session length (minutes), retries per fail, ads per session.
Also fails per level and out-of-lives count as guard rails.

Getting the data off a device: dev panel, "Copy analytics" (JSON on the clipboard), or the endpoint. Drop the
files in `tools/analytics/` and run `node tools/lives-report.mjs`.

## The decision rule (registered before any data)

- Minimum: 200 sessions in each arm and 7 days of data. Otherwise: extend.
- Ship B only if, relative to A, session length is at least 0.9x, retries per fail at least 0.9x, and ads per
  session at least 1.2x. B is a monetisation lever; it must pay for itself in ad views without costing play.
- Otherwise keep A.

`tests/lives.test.ts` pins the rule and the models. The smoke test drives both arms from a `flags.json` served
next to the build, with no code change.

## Not done here

There is no data yet. The recommendation file is a placeholder generated from an empty `tools/analytics/`
until exports arrive.
