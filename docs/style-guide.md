# Sushi Jam style guide

**Direction: izakaya at dusk.** A small counter restaurant in the evening. Warm lacquer red and rice white against
deep indigo, lit by paper lanterns from above and a soft rim light from the belt. Everything is chunky and
rounded with a dark-chocolate outline, glossy highlights top-left, a soft occlusion shadow underneath. Plates and
characters are toys on a wooden counter, not flat icons. This file is the contract: `src/art/`, `src/render/` and
`src/ui/` follow it, and anything new must match it before it is drawn.

## Palette

Environment and UI colours. Nothing else may be introduced for the room or the chrome.

| Role         | Hex       | Where                                                              |
| ------------ | --------- | ------------------------------------------------------------------ |
| Lacquer red  | `#C8323B` | primary buttons, card header strips, lantern body, kitchen valance |
| Deep red     | `#8F1F27` | lacquer shadow side, pressed buttons, header wood-block texture    |
| Rice white   | `#FFF8EA` | card paper insets, plate ceramic, text on red and indigo           |
| Cream        | `#F5E9D2` | paper labels, order slips, secondary surfaces                      |
| Indigo       | `#1E2A5A` | back wall at dusk, noren cloth, tertiary chrome                    |
| Indigo dark  | `#121A3A` | header band, vignette, deep shadows in the room                    |
| Wood         | `#B9773E` | counter, shelves, wooden buttons, noren rod                        |
| Wood dark    | `#7A4A22` | wood grain, counter front, shadow side of wood                     |
| Bamboo       | `#9CB46B` | bamboo rod, stall awning, plant accents                            |
| Gold         | `#E9B949` | coins, VIP rims, stamps, gold trim, the win receipt stamp          |
| Chocolate    | `#2A1F1A` | every outline, text on cream and rice white                        |
| Lantern glow | `#FFB35C` | the radial glow behind lanterns, warm tint on lit sprites          |

The seven plate colours are fixed. They are the game's colour code and every one has a shape glyph twin for
colour-blind players. They never tint the room or the chrome except as the plate rim, the diner body, the glyph
stamp and the tier badge.

| Index | Name     | Hex       | Glyph    | Food                                       | Character          |
| ----- | -------- | --------- | -------- | ------------------------------------------ | ------------------ |
| 0     | Salmon   | `#E5484D` | circle   | salmon nigiri, fat stripes                 | Sal, cap           |
| 1     | Tuna     | `#3E7BFA` | square   | tuna nigiri, deep red with a lighter grain | Tobi, headband     |
| 2     | Tamago   | `#F2B705` | triangle | tamago block with a nori belt              | Tama, ribbon       |
| 3     | Cucumber | `#2FB36B` | diamond  | cucumber maki, cut roll, green centre      | Kyu, round glasses |
| 4     | Eggplant | `#8E5BE0` | star     | glossy purple nigiri with a torch mark     | Nasu, scarf        |
| 5     | Shrimp   | `#F5843B` | hex      | shrimp with a curled tail and red stripes  | Ebi, antenna clips |
| 6     | Wasabi   | `#1FB7D8` | heart    | green mound with a leaf                    | Wasa, leaf         |

## The three rules

Every sprite, plate, character, decor piece and UI object follows these. They are what makes the set read as
one material world at 30 px and at 90 px.

1. **Outline.** Chocolate `#2A1F1A`, full opacity, about 2.5 px at sprite size. In the 100 unit sprite box that is
   `stroke-width="6"` (a 40 px diner, a 39 px belt plate). Round joins and caps. Inner details use the same
   colour at 40 to 60 percent and 3 units. UI objects drawn on canvas use 2 px chocolate at 100 percent on
   anything that reads as an object (chips, trays, bowls, stamps) and none on flat paper.
2. **Highlight.** One light from the top-left, plus a warm rim from the lanterns. Every body gets a radial
   gradient centred at 36 percent, 30 percent (lighter) to a darker edge, a white specular ellipse in the
   top-left quadrant at 30 to 45 percent (glossy materials: lacquer, fish, ceramic glaze) or 14 to 20 percent
   (matte: wood, paper, rice), and a thin rim-light arc along the top-right edge at 25 percent white on
   anything that sits under a lantern.
3. **Shadow.** A soft occlusion shadow under everything that sits on a surface: a chocolate ellipse at 22 to
   28 percent, blurred 2 to 3 units, centred slightly right of the object and touching its base. Canvas drop
   shadows (blur 14 to 30, offset 6 to 12 down) are reserved for cards, trays and the kitchen hatch, so they
   read as sitting on the counter. Nothing floats.

## Materials

| Material | Look                                                                                          | Used for                                         |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Lacquer  | deep saturated fill, hard specular ellipse at 45 percent, darker base band, chocolate edge    | VIP plate base, trays, red buttons, header strip |
| Wood     | matte, two-tone grain lines at 25 percent, lit top edge, no specular                          | counter, shelves, noren rod, wood buttons        |
| Paper    | soft, slightly translucent (fill-opacity .92), visible ribs on lanterns, a faint fold line    | labels, order slip, lanterns, noren, map         |
| Ceramic  | matte rice white with a coloured glaze rim, a small specular arc on the rim, a soft inner lip | plates, bowls                                    |
| Fish     | wet: a bright highlight at 60 percent, a translucent lighter edge along the top, fat stripes  | salmon, tuna, shrimp                             |
| Steel    | cool grey gradient, a bright reflection stripe, a dark edge                                   | belt rails, cloche, station panels               |
| Rubber   | near-black, matte, a chevron tread at 8 percent                                               | the belt track                                   |

## Shape language

- Round and chunky. Bodies are circles, rounded squares or eggs; nothing a player taps has a sharp corner.
- Plates are an ellipse (rx 40, ry 36 in the 100 box) so they read as seen from above and a little in front. The
  glaze rim carries the game colour at 26 percent of the radius. The glyph is an embossed stamp on the rim's
  top-left: a rice white disc, an inner shadow, the glyph in the rim colour.
- Props are big and few: one prop per character, legible at 40 px, never over the eyes. Hats end at y=46.
- Faces are two eyes with a pupil highlight and one mouth. Grumpy adds brows, happy adds a tongue, chew adds
  cheeks. Expressions change nothing else so they still read at 18 px radius.
- Kitchen plates are the same sprites at a smaller size, never simplified copies.

## Characters

Seven diners, one per colour, each a different silhouette so a 6x6 grid reads at a glance.

| Character | Body     | Prop          | Personality      |
| --------- | -------- | ------------- | ---------------- |
| Sal       | circle   | cap           | cheerful regular |
| Tobi      | squircle | headband      | bookish critic   |
| Tama      | circle   | ribbon        | sleepy farmer    |
| Kyu       | egg      | round glasses | health nut       |
| Nasu      | circle   | scarf         | fancy gourmet    |
| Ebi       | circle   | antenna clips | jittery tourist  |
| Wasa      | circle   | leaf          | chill DJ         |

States: `idle`, `blink`, `happy`, `chew`, `grumpy`, `walk`. Two views: `front` for the grid and the walk, `back`
(three-quarters from behind) for diners seated at the counter, so they face the belt; the visible eye and cheek
still carry the expression. VIP guests keep their prop and get gold trim: a gold pin on the prop and a gold band
on the body's base. Layer order inside a sprite: shadow, feet, body, rim light, highlight, cheeks, face, outfit,
prop, trim.

## Room

Five layers back to front: back wall with shelves and bottles under a hanging light, the belt as a real conveyor
(rubber track with a chevron tread, steel rails with highlights, rollers at the corners, a warm reflection of the
lanterns on the rail), the ledge inside the loop, the counter with wood grain and a lacquer edge, the floor
(tatami or tile), and a faint vignette over everything. Decor pieces are separate sprites so they move: the
noren hangs from a bamboo rod with ties and sways, lanterns swing on a slow pulse with a radial glow drawn
behind them, everything else sits on its surface with an occlusion shadow. The noren never covers the kitchen
window or the belt gauge.

## Restaurants

A restaurant is a room palette in `src/data/themes.ts`. The renderer and the SVG room read nothing but that
table, so this section is the only place a new environment colour may be introduced. Each palette changes the
room, the belt rails and the counter, never the plate colours, the diners or the UI chrome.

| Restaurant (levels)  | Header    | Back wall             | Lower wall | Counter               | Floor                 | Belt rail / track / dash          | Accent    | Outfit        |
| -------------------- | --------- | --------------------- | ---------- | --------------------- | --------------------- | --------------------------------- | --------- | ------------- |
| Street stall (1-20)  | `#121A3A` | `#1E2A5A` / `#182248` | `#F5E9D2`  | `#B9773E` / `#7A4A22` | `#D9C79A` tatami      | `#C9CDD6` / `#23201F` / `#3A3633` | `#C8323B` | none          |
| Family diner (21-40) | `#2B1E2E` | `#F3E6DC` / `#E8D6C9` | `#FBF3EE`  | `#C8323B` / `#8F1F27` | `#F2F2EE` / `#2E2A2A` | `#DDE3EA` / `#23201F` / `#3A3633` | `#E63946` | red bow tie   |
| Rooftop bar (41-60)  | `#0E1330` | `#2A3468` / `#1B2450` | `#1E2A5A`  | `#3F2E22` / `#2B1E15` | `#4B3A2E` planks      | `#8A93A6` / `#1D1B22` / `#332F3A` | `#E9B949` | black tie     |
| Ryokan (61-80)       | `#3B2F26` | `#F4EEE0` / `#EFE7D5` | `#F7F1E3`  | `#B9773E` / `#7A4A22` | `#DCE3B8` tatami      | `#8B7B6A` / `#2A2320` / `#3F3730` | `#2FB36B` | yukata collar |
| Space station (81+)  | `#0B0F1E` | `#1F2A3A` / `#172231` | `#263445`  | `#3C4A5E` / `#2A3646` | `#2C3A4A` grid        | `#9BB7D6` / `#0F1522` / `#22304A` | `#6EE7FF` | silver collar |

## UI kit

Objects from the restaurant, not rectangles.

- **Cards and screens**: a lacquer tray (wood-dark edge, chocolate outline, a rounded edge highlight) with a
  cream paper inset; the header band is a red lacquer strip with a subtle wood-block texture; a drop shadow
  that reads as sitting on the counter.
- **Buttons**: primary is a red lacquer chip with a top highlight; secondary is wood; tertiary is paper. Every
  button has hover (lighter), pressed (darker, 2 px down, one frame) and disabled (desaturated, no highlight).
  Tap targets never move: only the paint changes.
- **HUD**: the level number on a paper order slip with a clip; the tier badge as an ink stamp; coins in a lacquer
  bowl; the streak as a small paper lantern that brightens with the streak.
- **Boosters**: the three icons on lacquer discs with an outline and a paper price label under them.
- **Kitchen window**: a wooden hatch with a red noren valance and a warm light inside; next-up plates on a ledge.
- **Fail card**: a spilled tray, the countdown as a kitchen timer. **Win card**: a paid receipt with the coins
  stamped in gold; confetti is petals and coins.
- **Map**: a paper map with brush strokes, nodes as stamps, the current level as a lantern.
- **Shop and decor**: rows are shelves; products sit on them as objects.

## Type scale

Baloo 2, weights 700 and 800, with the display weight for numbers and titles. Falls back to Trebuchet MS.
Text on cream or rice white is chocolate `#2A1F1A`; text on red or indigo is rice white `#FFF8EA`. No pure black
anywhere. Badges tighten letter spacing by half a pixel.

| Size | Weight | Use                                 |
| ---- | ------ | ----------------------------------- |
| 36   | 800    | coin total on the win card, display |
| 30   | 800    | level intro                         |
| 28   | 800    | HUD level label                     |
| 26   | 800    | card titles                         |
| 22   | 800    | coin counter, pause level           |
| 19   | 800    | settings row labels                 |
| 17   | 800    | button labels                       |
| 15   | 700    | body text, toasts (800)             |
| 13   | 800    | badges, small captions              |
| 12   | 700    | button sub labels, footnotes        |
| 11   | 800    | micro labels under icons            |

Numbers that matter in play (appetite, belt count, timer) are always 800 weight on a solid contrasting disc.

## Motion and light

- Lantern glow pulses slowly and warms the top of nearby sprites with the lantern-glow tint.
- A steam wisp rises from a hot plate on the belt every few seconds.
- Plates wobble a little on the belt corners; the belt tread scrolls with the plates.
- Diners carry a soft drop shadow that stretches slightly when they walk.
- Screens slide up with an ease-out-back and a quick shadow fade, never longer than 250 ms.
- Every one of these is skipped under reduce motion.

## Budgets

- A character sprite's SVG is at most 6 KB, a plate 5 KB, a decor piece 5 KB, a room 40 KB (`tests/art.test.ts`).
- The single-file build stays under 1 MB (`tools/postbuild.mjs`).
- No external image or font files: everything is SVG in code with the `http://www.w3.org/2000/svg` namespace.

## Do and do not

- Do keep the glaze rim and the glyph stamp on every plate variant, including covered and double-decker.
- Do draw new characters in the 100 unit box with the body centred at (50,56), radius 36.
- Do not add text to SVG art; fonts are not guaranteed at rasterisation time. Text is drawn by the canvas layer.
- Do not use pure black or pure white for large areas: chocolate and rice white instead.
- Do not let a prop hide the eyes. Hats end at y=46, glasses frame the eyes at their own size.
- Do not move a tap target. The smoke test clicks fixed coordinates.
