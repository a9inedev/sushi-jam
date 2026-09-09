# Sushi Jam style guide

Warm, chunky, hand-made. A tiny sushi counter where every diner is a character and every plate looks edible. The rules below are what the art in `src/art/` follows and what any new art must match.

## Palette

The seven plate colours are fixed. They carry gameplay meaning and every one has a shape glyph twin for colour-blind players.

| Index | Name     | Hex       | Glyph    | Food                    | Character            |
| ----- | -------- | --------- | -------- | ----------------------- | -------------------- |
| 0     | Salmon   | `#E5484D` | circle   | salmon nigiri           | Sal, bandana knot    |
| 1     | Tuna     | `#3E7BFA` | square   | tuna nigiri             | Tobi, square glasses |
| 2     | Tamago   | `#F2B705` | triangle | tamago nigiri           | Tama, straw hat      |
| 3     | Cucumber | `#2FB36B` | diamond  | cucumber maki           | Kyu, leaf sprout     |
| 4     | Eggplant | `#8E5BE0` | star     | grilled eggplant nigiri | Nasu, top hat        |
| 5     | Shrimp   | `#F5843B` | hex      | ebi nigiri              | Ebi, antennae, scarf |
| 6     | Wasabi   | `#1FB7D8` | heart    | wasabi mound            | Wasa, headphones     |

Environment and UI colours:

| Role           | Hex                                                     | Where                                   |
| -------------- | ------------------------------------------------------- | --------------------------------------- |
| Ink            | `#2A2320`                                               | outlines, text on light, appetite badge |
| Header         | `#2B2622`                                               | top bar                                 |
| Paper wall     | `#FBF3E4` lines `#E7DAC0`                               | lower wall behind the belt              |
| Wall wood      | `#D9A86C` / `#C8955A` line `#A9773F`                    | slatted upper wall                      |
| Rail           | `#5A4E45`                                               | dado rail the noren hangs from          |
| Counter        | `#C9924F` to `#A86F35`, edge `#E4B57A`, grain `#8F5A27` | seats row                               |
| Ledge          | `#8B5A2B` edge `#B57A3E`                                | shelf inside the belt loop              |
| Floor          | `#EFE4C8` lines `#D8C9A4`                               | tatami                                  |
| Grid mat       | `#E4D6B4`                                               | the diner grid                          |
| Belt           | `#33373F` / `#4A4F5C` / `#5B6170`                       | conveyor rails and dashes               |
| Cream          | `#FFF9EE` cards, `#FFFDF7` plates                       | UI cards, plate ceramic                 |
| Accent gold    | `#F2B705` dark `#B8860B`                                | coins, VIP, crown, active outlines      |
| Primary action | `#E5484D`                                               | main buttons                            |
| Positive       | `#2FB36B`                                               | win card, toggles on                    |
| Info           | `#3E7BFA`                                               | new rule card                           |
| Neutral button | `#3B3F4A`, muted `#B9B2A5`                              | secondary and disabled buttons          |
| Muted text     | `#8A8378`, body `#5A4E45`                               | captions, sub labels                    |

Rule: gameplay colours never appear on UI chrome except as the plate rim, the diner body, the glyph badge and the tier badge. That keeps "colour means match" true everywhere.

## Shape language

- Round and chunky. Bodies are circles, rounded squares or eggs; no sharp corners on anything a player taps.
- Outlines are ink at 50 percent opacity, 4.5 units in a 100 unit sprite box, which lands at 2 px on a 44 px diner. UI cards and buttons have no outlines; they rely on fill and shadow.
- Props are big and few. One prop per character, drawn to be legible at 40 px: the straw hat is a full triangle, the headphones stick out past the body, the top hat doubles the height.
- Faces are two eyes and one mouth. Expressions change only the eye shape and the mouth so they still read at 18 px radius.
- Plates are a white disc with a thick rim in the plate colour (28 percent of the radius) and a glyph badge on the rim's top-left. Food sits inside the rim and never covers the badge.

## Lighting

- One soft light from the top-left. Every body gets a radial gradient centred at 38 percent, 32 percent (lighter) fading to a darker edge, plus a white highlight ellipse at 22 percent opacity in the top-left quadrant.
- Contact shadows are flat ellipses at 16 to 18 percent black under bodies, plates and decor. Canvas drop shadows are reserved for plates and cards (blur 6 to 30, offset down 2 to 12).
- No rim light, no specular sparkles except on the fish tank glass.

## Characters

Seven diners, one per colour, each a different silhouette so a 6x6 grid reads at a glance:

| Character | Body     | Prop               | Personality      |
| --------- | -------- | ------------------ | ---------------- |
| Sal       | circle   | bandana knot       | cheerful regular |
| Tobi      | squircle | square glasses     | bookish critic   |
| Tama      | circle   | conical straw hat  | sleepy farmer    |
| Kyu       | egg      | two-leaf sprout    | health nut       |
| Nasu      | circle   | top hat with band  | fancy gourmet    |
| Ebi       | circle   | antennae and scarf | jittery tourist  |
| Wasa      | circle   | headphones         | chill DJ         |

States: `idle`, `blink`, `happy` (closed happy eyes, open mouth), `chew` (round mouth, puffed cheeks; the game alternates chew and idle at 6 Hz), `grumpy` (brows and frown), `walk` (feet, forward gaze, code adds a 6 degree sway). VIP guests swap their prop for a crown and get a gold ring.

Layer order inside a sprite: shadow, feet, body, highlight, cheeks, face, prop. See `src/art/characters.ts`. Sheets: `docs/art/characters-40px.png`, `characters-96px.png`, vectors in `characters.svg`.

## Sushi

Nigiri share one rice base (cream oval with grain dots) so the topping is the identity: salmon with white fat stripes, dark tuna with pink sheen, tamago block with a nori band, glossy purple eggplant with a green calyx, striped prawn with a tail. Cucumber maki is a cross-section: nori ring, rice, green centre. Wasabi is a green mound with a leaf. Sheets: `docs/art/plates-30px.png`, `plates-96px.png`, vectors in `plates.svg`.

## Room

Four layers, back to front: wall (light wood slats above a rail, paper below), ledge inside the belt loop with a sake bottle, bowls and a teapot, counter (three planks with grain and a lit front edge), floor (two tatami mats). Decor items are separate sprites so they can move: noren panels sway, lanterns swing, the bonsai and fish tank sit on the ledge, the neon sign is canvas text with a glow. See `src/art/background.ts`.

## Restaurants

Every twenty levels the room changes restaurant (docs/themes.md). A restaurant is a room palette in `src/data/themes.ts`; the renderer and the SVG room read nothing but that table, so this section is the only place a new environment colour may be introduced. Gameplay colours, plates, glyphs and UI chrome do not change with the restaurant.

| Restaurant (levels)  | Header    | Upper wall            | Lower wall | Counter               | Floor                 | Belt rail / track / dash          | Accent    | Outfit        |
| -------------------- | --------- | --------------------- | ---------- | --------------------- | --------------------- | --------------------------------- | --------- | ------------- |
| Street stall (1-20)  | `#2B2622` | `#D9A86C` / `#C8955A` | `#FBF3E4`  | `#C9924F` / `#A86F35` | `#EFE4C8`             | `#33373F` / `#4A4F5C` / `#5B6170` | `#E5484D` | none          |
| Family diner (21-40) | `#3A2F3A` | `#F6EFE6` / `#EDE3D8` | `#FBF7F2`  | `#C63D3D` / `#9E2B2B` | `#F2F2EE` / `#2E2A2A` | `#2E3A4A` / `#4A5A70` / `#7EA0C8` | `#E63946` | red bow tie   |
| Rooftop bar (41-60)  | `#101529` | `#24304E` / `#1A2440` | `#2B3550`  | `#3F2E22` / `#2B1E15` | `#4B3A2E`             | `#1C2030` / `#2C3245` / `#5A6688` | `#F2B705` | black tie     |
| Ryokan (61-80)       | `#3B2F26` | `#F4EEE0` / `#EFE7D5` | `#F7F1E3`  | `#B9834E` / `#8E6238` | `#DCE3B8`             | `#4A3B30` / `#5E4B3C` / `#7A6350` | `#2FB36B` | yukata collar |
| Space station (81+)  | `#0B0F1E` | `#1F2A3A` / `#172231` | `#263445`  | `#3C4A5E` / `#2A3646` | `#2C3A4A`             | `#0F1522` / `#1E2A40` / `#6EE7FF` | `#6EE7FF` | silver collar |

Outfits are chest-level accessories (`outfitSvg` in `src/art/characters.ts`): they never touch a character's head prop, so silhouettes stay readable at 40 px in every restaurant. Decor is three pieces per restaurant (`DECOR` in `src/data/themes.ts`), each in a fixed slot (hanging pair, band over the rail, left ledge, right ledge, sign), drawn only in its own room. The sheets in `docs/art/rooms-192px.png`, `decor-64px.png` and `outfits-64px.png` are regenerated by `node tools/art-sheet.mjs`.

## Type scale

Baloo 2, weights 700 and 800. Falls back to Trebuchet MS.

| Size | Weight | Use                                  |
| ---- | ------ | ------------------------------------ |
| 34   | 800    | coin total on the win card, ad title |
| 30   | 800    | level intro                          |
| 28   | 800    | HUD level label                      |
| 26   | 800    | card titles                          |
| 22   | 800    | coin counter, pause level            |
| 19   | 800    | settings row labels                  |
| 17   | 800    | button labels                        |
| 15   | 700    | body text, toasts (800)              |
| 13   | 800    | badges, small captions               |
| 12   | 700    | button sub labels, footnotes         |
| 11   | 800    | micro labels under icons             |

Numbers that matter in play (appetite, belt count, timer) are always 800 weight on a solid contrasting disc.

## Motion notes

Motion is Phase 1.2. The art is built to allow it: the body and the face are separate layers, props sit on top so they can bounce independently, and every sprite has a baked contact shadow so squash and stretch does not need a shadow pass.

## Do and do not

- Do keep the plate rim and the glyph badge on every plate variant, including covered and double-decker.
- Do draw new characters in the 100 unit box with the body centred at (50,56), radius 36.
- Do not add text to SVG art; fonts are not guaranteed at rasterisation time. Text is drawn by the canvas layer.
- Do not use pure black or pure white for large areas; ink and cream instead.
- Do not let a prop hide the eyes. Hats end at y=46, glasses frame the eyes at their own size.
