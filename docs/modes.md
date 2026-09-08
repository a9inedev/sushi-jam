# Side modes

Three modes sit beside the level loop. They are reached from the **Modes** tab of the map, keep their own progress and stats, and never move the level counter: `win()` in `src/engine/rules.ts` branches on the runtime level's `mode`, and only the `level` branch touches `S.level`, the streak and the weekly count.

| Mode  | Board                                                                   | Ends                                  | Coins                                            | Progress it keeps                             |
| ----- | ----------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Daily | One generated board per calendar day, seeded by the date, same for all  | Win or fail as a level                | 100 + 10 per streak day (max +100), once per day | `puzzleDays`: the days won, a streak calendar |
| Rush  | 5x5 board that refills forever; the kitchen cooks for whoever is seated | 90 s clock                            | 3 per plate served, max 300                      | `rushBest`, `rushRuns`                        |
| Zen   | The generated ladder with every timer stripped                          | Win; a stall is cleared, never a fail | 40 % of the level reward                         | `zenLevel`, `zenWins`                         |

## Daily puzzle

`makeDaily(key)` (`src/engine/modes-core.ts`) hashes the local date (`YYYY-MM-DD`) into a seed and a level row between 41 and 140, then runs the ordinary generator with that seed (`makeGenerated(n, false, seedBase)`), so the board goes through the same fairness filter and relief as any generated level and is bit-identical for everyone on that day. The streak is `puzzleStreak(days, today)`: consecutive won days ending today, or ending yesterday while today is still open. The map shows this month as a calendar (won days filled, today ringed). Replaying a won day is allowed and pays nothing.

## Rush

`makeRush(seed)` builds the opening board; `updateMode` in `src/engine/rules.ts` runs the clock, removes guests who left, fills an empty cell every 0.8 s with a guest facing a clear exit (`rushDiner`), and keeps five plates queued, cooked in proportion to what the seated guests still want (`rushPlateColor`). Score is plates served; the HUD shows the clock and the score. Rush never fails: a stall is cleared by the chef (`softClear`). No intro cards, no rules.

## Zen

`makeZen(k)` takes the generated level k and strips wasabi plates, rush hour and reversals (rules that only shape the board, like chained or reserved seats, stay). `fail()` and the jam check hand a stall to `softClear` instead, so there is no fail state and no timer of any kind. The win card leads to the next rung.

## Where things live

- `src/engine/modes-core.ts`: pure builders and the streak rule (unit-tested in `tests/modes.test.ts`).
- `src/meta/modes.ts`: `startMode`, `restartLevel` (mode-aware replay used by the pause, fail and win cards), `leaveMode`.
- `src/meta/save-schema.ts` v7: `puzzleDays`, `rushBest`, `rushRuns`, `zenLevel`, `zenWins`; every stat record carries `mode` (older records default to `level`) and rush records a `score`.
- `src/ui/screens.ts` `drawModes` / `drawCalendar`; `src/ui/overlays.ts` `drawModeWin`; `src/ui/hud.ts` mode labels and the rush clock.
- Dev API: `__SJ.modes.start('daily' | 'rush' | 'zen', key?)`, `forceWin`, `restart`, `leave`, `state()`. The smoke test drives all three and checks the level counter never moves.
