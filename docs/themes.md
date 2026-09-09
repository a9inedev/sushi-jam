# The restaurant journey

Every twenty levels the game moves to a new restaurant. The theme changes the room art, the belt, the music palette and what the diners wear; it never changes the seven gameplay colours, the plates or the rules.

| Levels | Restaurant    | Room                                                       | Belt                    | Music                                  | Outfit        |
| ------ | ------------- | ---------------------------------------------------------- | ----------------------- | -------------------------------------- | ------------- |
| 1-20   | Street stall  | wood slats, awning stripes, paper wall, tatami             | graphite                | D pentatonic, 84 bpm, koto lead        | none          |
| 21-40  | Family diner  | cream tiles, mint stripe, red vinyl counter, checker floor | steel blue              | +2, 100 bpm, shaker on the calm layer  | red bow tie   |
| 41-60  | Rooftop bar   | night skyline, glass railing, brass edges, deck planks     | night blue, pale dashes | -3, 76 bpm, pad lead, drone on calm    | black tie     |
| 61-80  | Ryokan        | shoji lattice, tea tray, tatami with border                | dark wood               | -5, 70 bpm, no taiko, drone on calm    | yukata collar |
| 81+    | Space station | riveted panels, porthole with stars, glowing edge, grid    | black with cyan dashes  | +5, 108 bpm, lead an octave up, shaker | silver collar |

## Data and rendering

- `src/data/themes.ts`: `THEMES` (palette, music palette, outfit, first level, reward) and `DECOR` (fifteen pieces, three per restaurant, each with a slot). `themeFor(n)` picks the restaurant for a level.
- `src/data/theme-state.ts`: the active theme, set by `newLevelDef` (levels, daily and zen use their level number; rush uses the player's level). Changing it retunes the music through `AudioEngine.setPalette`.
- `src/art/background.ts`: `backgroundSvg(theme)` builds the room from the palette; each restaurant dresses the same layers its own way. `src/art/decor.ts` holds the later decor pieces and `DECOR_ART` / `SLOT_BOX`.
- `src/art/characters.ts`: `characterSvg(colour, state, vip, dim, outfit)`; outfits sit on the body below the face so they never fight a character's prop.
- `src/render/scene.ts` reads the palette for the fallback background, the belt, the grid mat and the sign; `drawDecor` draws the active restaurant's owned pieces in their slots.
- Every environment colour lives in the palette table, so `docs/style-guide.md` (section Restaurants) is the source of truth for all five rooms.

## Reveal

The first time a player starts the first level of a restaurant after the stall (`n === theme.from` and the theme is not in `S.themesSeen`; the stall itself is opened by the tutorial) the level opens with a reveal: after the level intro, two curtains part on the new room, the name card rises with the restaurant's blurb, and the doors open on tap. The theme is then recorded as seen; replaying the level shows no reveal. Dev: `__SJ.theme()` and `__SJ.reveal()`.

## Decor shop

The map's Decor tab has a restaurant chip per theme (locked chips show the level that opens them). Each restaurant sells three pieces; owning all three pays the restaurant's completion reward once (`S.decorRewards`). Decor only shows in its own restaurant.

## Album

The map's Album tab lists the restaurants (unlocked by level), the seven characters and plates (unlocked as colours appear on the curve up to the best level reached) and all fifteen decor pieces, with a collected count.
