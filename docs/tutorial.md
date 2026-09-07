# First session

Levels 1 to 3 carry a guided tutorial (`src/ui/tutorial.ts`). One instruction at a time, a dimmed board with a hole around the target, a hand pointer, and a Skip button. Progress is saved per level in `S.tutorial` (0 to 3), so a player who closes the game mid-tutorial resumes where they were, and "Replay tutorial" in the dev panel resets it.

## Steps

| Level | Step        | What the player sees                                                 | Advances when                       |
| ----- | ----------- | -------------------------------------------------------------------- | ----------------------------------- |
| 1     | tapDiner    | Board dimmed except the diner whose colour is next; hand on it       | that diner (or any) leaves the grid |
| 1     | kitchen     | Hole around the kitchen window                                       | 2.2 s or a tap                      |
| 1     | grab        | Hole around the seated diner                                         | the diner's appetite drops, or 5 s  |
| 1     | matchNext   | Dimmed board, hand on the next matching diner                        | a second diner leaves the grid      |
| 1     | seatAll     | No dim; the hand keeps pointing at the best next diner               | the level is won                    |
| 2     | blocked     | Hole around a diner that faces someone                               | 3 s or a tap                        |
| 2     | readKitchen | Hole around the kitchen window                                       | 2.2 s or a tap                      |
| 3     | keepSeat    | Shown once two seats are taken (or after 8 s); hole around the seats | 4 s or a tap                        |

Guided steps (tapDiner, matchNext) only accept a tap on the highlighted diner. Info steps accept any tap. The free-play hint (seatAll) does not gate input at all.

## Why this shape

- Nothing to read up front: the first thing a new player does is the core action, guided.
- The kitchen window and the grab are shown right after the first move, when their meaning is visible on screen.
- Level 2 introduces blocking without stopping play; level 3 states the fail rule once, when it is about to matter.
- The fail card repeats the rule in words if it happens anyway.

## Verification

The smoke test plays levels 1 to 3 as a naive player: it taps only where the hand points, taps anywhere to dismiss info steps, and otherwise picks any movable diner. It asserts that all three levels are won and that `S.tutorial` reaches 3. See `tools/smoke.mjs`, step "naive player follows the tutorial through levels 1 to 3".
