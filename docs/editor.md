# Level editor and authored content

## Where levels live

`levels/NNN.json`, one file per level, numbered 001 to 100. The engine plays an authored file when one exists for the level number and falls back to the seeded generator beyond the authored range (`makeLevel` in `src/engine/levels.ts`). The files are bundled into the single-file build through `src/data/levels.ts`.

## File format

```json
{
  "n": 21,
  "beat": "intro:wasabi",
  "band": [0, 0.15],
  "rows": 4, "cols": 4, "colors": 4,
  "seats": 4, "beltCap": 8, "visibleNext": 3,
  "cells": ["0v2 . 1>3 2<2", "..."],
  "kitchen": "0 1 2W 1 ...",
  "seed": 123456,
  "diff": 0.07
}
```

- **cells**: one string per row, tokens separated by spaces, `.` for an empty cell. Token: colour index, direction (`^ > v <`), appetite, then flags: `V` VIP, `L<colour>` chopstick lock on that colour, `I<ice>` frozen with that many taps. Example `4<4L1`: eggplant, facing left, appetite 4, locked until a tuna diner has been served.
- **kitchen**: plate tokens in service order: colour index plus flags `V` vip, `D` double-decker, `W` wasabi timer, `C` covered. Leave it empty to have the engine derive it from the solution order with `seed`.
- **band**: the fail-rate band the level must land in; **diff**: the measured rate (200 runs of the noisy solver). CI recomputes it.
- Anything not given (`seats`, `beltCap`, `visibleNext`, `speed`) falls back to the schedule for that level number.

## Beat sheet

`beatFor(n)` in `src/engine/author.ts` is the design table: grid size, palette, fill, appetite range, kitchen window, belt capacity, mechanic densities and the band, per level. The rhythm:

| Levels          | Beat    | Band       | Notes                                                                 |
| --------------- | ------- | ---------- | --------------------------------------------------------------------- |
| 1 to 9, 12      | teach   | 0 to 12 %  | 3x3 up to 5x4, three then four colours, no rules                      |
| 10              | wall    | 30 to 60 % | first wall, softer than the later ones                               |
| 11, 81, 91      | relief  | 0 to 15 %  | smaller board, one colour fewer                                       |
| 13 to 19        | ramp    | rising     | 5x4 to 5x5, window closes from 3 to 2 plates                          |
| every x0 (20+)  | wall    | 45 to 75 % | 6x6, one extra colour, window 1, belt 7                               |
| 21, 31, 41, 51, 61, 71 | intro | 0 to 15 % | gentle board with exactly the new rule guaranteed present         |
| x2 to x6        | medium  | 10 to 35 % | unlocked rules at low density                                         |
| x7 to x9        | hard    | 25 to 55 % | fuller boards, window 2                                               |

## Authoring tool

```
node tools/author-levels.mjs            # fills in missing files for 1..100
node tools/author-levels.mjs 40 60 --force
```

For each level the tool generates boards by reverse placement, decorates them to the beat (forcing one instance of an intro rule), validates them, measures 200 solver runs, and keeps the seed closest to the band centre. If no seed lands in band it nudges the kitchen window, belt and fill toward the band and tries again. Existing files are kept unless `--force` is passed, so edits made by hand survive. It also rewrites `docs/levels.md`, the table of what shipped.

## CI

`tests/authored.test.ts` loads every file and asserts: exactly levels 1 to 100; peelable; plate units equal appetite per colour and for VIPs; locks reference colours that finish first; the intended order wins; the measured 200-run fail rate equals the stored one and sits inside the band; the beat rhythm (walls on x0, relief and intros on x1, hard on x7 to x9, ramp 13 to 19); each mechanic first appears on its unlock level, on a board of at most 25 cells, and never earlier; levels 1 to 12 have no rules; relief levels are at least 20 points easier than the wall before them.

## The editor

Dev panel (tap the level label five times) > **Level editor**. It is not reachable anywhere else.

- **Level / Load / Clear**: pick a number, load its authored file (or the generated board if none), or start empty.
- **Rows, Cols, Colours, Seats, Belt, Window**: the level's frame. Shrinking the grid drops cells outside it.
- **Grid**: tap a cell with the active tool. Tools: Paint (uses the brush colour, direction and appetite), Erase, Rotate, Need (cycles 1 to 5), VIP, Lock (cycles through the colours, then off), Ice (0 to 3 taps).
- **Palette**: colour chips, direction chips, the appetite chip (tap to cycle).
- **Kitchen**: Auto derives the service order from the solution with the seed. Custom copies it so you can edit: tap a plate to select it, colour chips recolour it, V D W C toggle flags, + and − add or remove plates, Generate goes back to auto.
- **Solve**: runs validation and 200 solver runs; shows the fail rate, the tier and the band for this level number, green when inside.
- **Export**: the JSON, in the text box, ready to paste into `levels/NNN.json`. **Import**: paste JSON and press Apply.
- **Play**: starts the level as it stands, without saving it. The dev panel takes you back.

`window.__SJ.editor` exposes `open`, `load`, `get`, `set`, `paint(r, c, token)`, `solve`, `play` and `state` for automation; the smoke test drives them.
