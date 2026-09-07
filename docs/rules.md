# The later rules (levels 81 to 131)

Six rules join the roster after the first eighty levels, one per ten levels, each on a gentle x1 level with an intro card, then in two authored showcase levels (x3 and x6 of its decade), then in combination with everything before it. From level 132 on the whole roster appears together, in the authored files up to 140 and in the generator beyond.

| Level | Rule           | One line                                                                                                  |
| ----- | -------------- | --------------------------------------------------------------------------------------------------------- |
| 81    | Chained seats  | Stools 1 and 2 share one queue. The back stool only waits; its guest eats after the front guest leaves.   |
| 91    | Rush hour      | From the Nth plate, plates come 1.5x as often and the belt runs 1.5x faster for 15 seconds.               |
| 101   | Chef's special | A rainbow plate any ordinary guest may take. VIPs and ticket guests refuse it.                            |
| 111   | Ticket guest   | Plates made to order, named for them, arriving in the printed colour sequence. Nobody else can take them. |
| 121   | Reserved seat  | One stool takes only guests of its colour.                                                                |
| 131   | Belt reversal  | Every 14 s the belt runs backwards for 4 s; plates that reach the kitchen door go back inside.            |

For each rule the sections below give the intro card, how the solver models it, how boosters interact, the fail message, and the fairness rule that keeps every level winnable without a booster.

## Data

Level-wide rules live in `rules` in the level JSON and in `LevelParams.rules` (`src/engine/types.ts`):

```json
"rules": { "chain": 1, "rush": 6, "reserved": [-1, -1, -1, 2], "reverse": [14, 4] }
```

Per-diner: `seq` (the ticket sequence, length equals appetite) and `picky` (ticket number, assigned in reading order by `assignPicky`). Per-plate: `special` and `owner` (ticket number). Tokens: cell `1^3P102`, kitchen `2S` (special planned for colour 2) and `1N0` (named for ticket 0). See `docs/editor.md`.

`mechActive(kind, n, set)`: `set` false follows the unlock schedule, `true` forces the six original rules (the parity fixture was dumped that way), `'all'` forces all twelve (the dev panel toggle).

## Chained seats

- **Card**: two stools joined by a chain. "Two stools share one queue. The back stool only waits: its guest eats after the front guest leaves."
- **Runtime**: seat 0 is the front, seat 1 the back. A tapped diner takes the first free plain seat they may use; if none, the back seat when the front is occupied. A waiting diner grabs nothing; when the front guest pays, the waiting guest slides forward (`promoteChain`). The booster's fifth seat is a plain seat.
- **Solver**: seats are slots; slot 1 is the waiting slot and is excluded from the eating list until promoted. Concurrency drops from K to K-1 with one guest staged.
- **Boosters**: takeout serves a waiting guest too; VIP seat adds a plain fifth stool; rescue clears the belt as usual.
- **Fail**: "Chained up! The back stool only waits: its guest eats after the front guest leaves."
- **Fairness**: the kitchen order is planned with the same slot rules (`kitchenSim`), so the intended order never needs more than K-1 concurrent eaters. Chained seats need at least three stools and cannot be reserved (validation).

## Rush hour

- **Card**: a clock running fast. "When the bell rings, plates come faster and the belt speeds up for fifteen seconds."
- **Runtime**: when plate number `rules.rush` leaves the kitchen, `rushT` is set to 15 s: emission interval 0.47 s instead of 0.7, belt speed x1.5, a banner over the belt with the countdown.
- **Solver**: from the trigger plate, 21 steps (15 s / 0.7 s) emit two plates on even steps and one on odd steps, matching the 1.5x rate. The belt fills faster, so an unseated colour costs a jam sooner.
- **Boosters**: sendback is the natural answer to a belt filling up; nothing special-cased.
- **Fail**: "Rush hour jam! Plates piled up faster than your guests could eat them." (a jam while `rushT > 0`).
- **Fairness**: rush changes timing, not order; the intended order is validated under rush in the solver. A rush that starts after the last plate is rejected.

## Chef's special

- **Card**: a rainbow-rimmed plate with a gold star. "A bonus plate any guest may take. VIPs and ticket guests refuse it. The chef takes back what it replaces."
- **Runtime**: `matchDP` accepts a special for any ordinary diner with appetite left. When one is eaten, `markSurplus` rebalances: the plan credited the special to a particular guest (its `color` field records the colour it was meant for), so if a different guest took it, one colour now has a plate too many and another is a plate short. The chef swaps the leftover for the missing colour (last queued plate first, else a belt plate recoloured with a puff). Leftovers with nobody short are collected at the kitchen door; a double is downgraded to a single rather than removed.
- **Solver**: the same rebalancing runs after every step on levels with specials.
- **Boosters**: takeout never removes a special (it is not the guest's own order); sendback returns it to the kitchen like any plate.
- **Fail**: no dedicated card; a special can only ever help.
- **Fairness**: a special counts one unit for its planned colour, so plates plus specials always equal appetite per colour, and the swap rule guarantees no guest is ever stranded whoever takes it.

## Ticket guest (picky)

- **Card**: a guest with a numbered ticket and a row of colour dots. "Their plates are made to order and arrive in the printed sequence. Nobody else can take them."
- **Runtime**: the diner shows their ticket over their head on the grid and the remaining sequence in their seat bubble. Named plates carry the ticket number; `matchDP` gives them only to that guest and only when the plate's colour is the next one in the sequence. Ticket guests refuse specials and cannot be VIPs.
- **Solver**: identical matching. Because nobody else can clear their plates, seating a ticket guest long before their plates are due parks them in a seat while their plates circle; seating them too late clogs the belt with named plates.
- **Boosters**: takeout removes exactly their named plates; the VIP seat helps as always.
- **Fail**: "Ticket guest hogged a seat! Their plates come made to order, in sequence. Seat them just before their ticket is up." (a jam with a seated ticket guest whose next plate is not on the belt).
- **Fairness**: `kitchenSim` emits their plates in ticket order while they are seated in the plan; validation checks the kitchen's named plates against every ticket.

## Reserved seat

- **Card**: a stool with a colour placard. "The marked stool only takes guests of its colour. Everyone else needs another seat."
- **Runtime**: `rules.reserved[i]` is the only colour that may sit in seat i (-1 = anyone). Tapping a diner with no allowed free seat shakes the seats and says which colour the free stool is reserved for. A free reserved seat does not count as free for the jam rule unless a grid diner of that colour remains.
- **Solver**: seat assignment honours reservations; the intended order waits when its head has no allowed seat, exactly as the kitchen plan assumed.
- **Boosters**: the fifth seat is unreserved.
- **Fail**: "Reserved seat stood empty! The reserved stool takes one colour only, and everyone else ran out of seats."
- **Fairness**: the plan seats guests in solution order with the same constraint, so a level with a reserved seat is planned around it. A seat reserved for a colour nobody has, or a reserved list of the wrong length, is rejected.

## Belt reversal

- **Card**: two circling arrows. "Every so often the belt runs backwards. Plates that reach the kitchen door go back inside for a while."
- **Runtime**: `reverseT` counts down from `rules.reverse[0]`; a tick warns one second before. While reversed (`rules.reverse[1]` seconds) the belt texture and plates run backwards, the kitchen sends nothing, and a plate that reaches the door goes back to the front of the queue (order preserved). Seats still grab plates that cross them. A banner shows REVERSING.
- **Solver**: on reversed steps the newest belt plate returns to the queue and nothing is emitted; a jam is never declared during a reversal.
- **Boosters**: nothing special-cased; sendback during a reversal still works.
- **Fail**: "Caught by the reversal! The belt ran backwards and took the plates your guests were waiting for." (a jam right after a reversal).
- **Fairness**: reversal only delays plates and keeps their order, so the planned order stays valid; cadence must be [every >= 4 s, reversed >= 1 s and shorter than every].

## Planning rule for these levels

The kitchen order is a plan of who eats what. On levels that carry any of the six rules (or a special, or a ticket guest) the plan is built "exactly": each plate is credited to the guest the belt would actually hand it to, taking the right-hand stool first the way plates reach the seats, and a wasabi plate is never planned for a guest's first plate. The intended-order solver mirrors that plan (seats fill the moment they free, takers in seat order), so `validateLevel` proves every authored level in this range wins without a booster. Levels 1 to 80 keep the original plan and solver behaviour bit for bit; the parity fixture guards them.

## Where the roster repeats

From level 132 every hard level carries at least two rules, and the generator beyond 140 rolls every rule at its density: chained seats 40 %, rush 40 %, reserved 40 %, reversal 30 % per level, specials 6 % per plate, ticket guests 10 % per diner (`decorate` in `src/engine/levels.ts`; the authoring densities are in `unlocked(n)` in `src/engine/author.ts`). A generated level that carries any of these rules must win its intended order without a booster to be picked at all (the generator tries twelve seeds and drops the unfair ones, the way the authoring tool drops them through `validateLevel`), and one that measures above its band gets the same relief the authoring tool applies (kitchen window up to 3, belt up to 10) before it ships; the curve report shows where that still falls short.
