# Motion

How things move in Sushi Jam, what the budget is, and what reduce motion changes. Code: `src/anim/tween.ts`, `src/anim/particles.ts`, `src/anim/motion.ts`; the calls live in `src/engine/rules.ts`.

## Budget

Every core action completes within **400 ms**: the tap answer, the walk from the grid to a seat, a plate grab, and the pay stamp. Longer motion exists only as follow-through that the player never waits on (a paid diner walking off screen, confetti falling).

| Action              | Pieces                                                               | Total            |
| ------------------- | -------------------------------------------------------------------- | ---------------- |
| Walk to seat        | anticipation 70 ms, launch 80 to 130 ms, settle 200 ms               | ≤400 ms          |
| Land on seat        | squash 1.16 x 0.80 springing back with overshoot, stool press decay  | 180 ms           |
| Bump into a blocker | lunge 60 to 110 ms, bonk, spring back 240 ms                         | ≤350 ms          |
| Grab a plate        | arc 280 ms, landing squash 100 ms                                    | 380 ms           |
| Pay                 | stamp at once, cash sound at 220 ms, leaves after 350 ms over 400 ms | follow-through   |
| Ice crack           | shake, 6 shards                                                      | 600 ms particles |
| Level clear         | 70 confetti over up to 6 s, coins to the counter in 550 to 970 ms    | follow-through   |

## Tween manager

`tweens.to(obj, props, dur, { delay, ease, onDone, tag })` tweens numeric properties. Start values are captured when the delay ends, so sequences chain cleanly. `tweens.sequence(obj, steps, opts)` runs steps back to back; `tweens.cancel(obj, tag?)` drops every tween on an object (or one tag) without firing `onDone`; `tweens.finish(obj)` snaps to end values. `setTimeScale` speeds everything up; reduce motion uses 1.6. The manager is updated once per frame with the level's time step, so open screens and the fail slow-motion apply to it automatically.

Tags in use: `walk`, `bump`, `squash`, `arc`, `land`, `leave`, `shift`.

## Anticipation and follow-through

- **Diners lean before walking.** 70 ms of leaning away from the exit and squatting (1.08 x 0.90), then a launch with a forward lean and stretch (0.96 x 1.06), then a settle. Vertical exits squash without the lean.
- **Landing.** On the seat the diner squashes to 1.16 x 0.80 and springs back with a back-ease overshoot; the stool ellipse widens and flattens for the same beat and the seated diner sits 3 px lower while it does.
- **Plates squash on landing.** The grabbed plate arrives at 1.35 x 0.65 and relaxes over 100 ms before it disappears into the diner, who also gets a small chew squash.
- **Bumps.** The bumper stretches along its travel axis, the blocker gets squeezed along the hit axis and shaken.

Squash scales around the base of the body so it reads as weight rather than a zoom.

## Particles

One pool of 400 slots, reused; emitting when full drops the request (counted in `particles.dropped`). Kinds: `crumb`, `shard`, `steam`, `coin`, `confetti`, `bonk`, `puff`, `spark`. Coins carry a value and call back on arrival; if the pool is full the value is paid out immediately so coins are never lost. Steam rises from the kitchen window every half second while food is queued and from each plate as it is served onto the belt. Confetti is drawn above the win card's dim; everything else is drawn in the scene layer.

## Reduce motion

On when the OS preference `prefers-reduced-motion: reduce` is set or the Settings toggle is on. It keeps the game readable rather than static:

- Tweens run 1.6x faster; positional motion (walk, bump, grab arc) still happens so cause and effect stay visible.
- No lean, squash, bob, screen shake, seat shake or stool press.
- The movable ring is a steady 85 percent white instead of pulsing.
- No steam, no confetti; other bursts spawn a third of their particles; coin bursts are a single coin.

## Measuring

`window.__SJ.fx` exposes `burst(n)`, `count()`, `tweens()` and `fps()`. The smoke test spawns bursts, samples 180 frames and requires an average above 55 fps with at least 40 particles alive throughout. That run happens in headless Edge on the development PC; the 2019 mid-range Android target is checked on a device through `chrome://inspect` as described in `docs/mobile.md`.
