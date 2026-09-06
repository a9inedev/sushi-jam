# Audio

Every sound and note in Sushi Jam is authored in this repository. There are no third-party samples, loops or libraries, so the whole set is licensed for commercial use under the project's own terms with nothing to attribute.

## Where things are

| Piece             | File                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| Sound designs     | `src/audio/patches.ts` (one Patch per sound, plus the six music instruments)          |
| Synth renderer    | `src/audio/synth.ts` (oscillators, noise, ADSR, biquad filters, vibrato, drive, echo) |
| Music             | `src/audio/music.ts` (8-bar loop as note events, calm and tense layers)               |
| Engine and mixer  | `src/audio/engine.ts` (buses, playback, sequencer, unlock, interruptions)             |
| Game-facing API   | `src/audio/audio.ts` (`sfx.*`, `applyVolumes`, `setTension`)                          |
| Reference renders | `docs/audio/*.wav`, written by `node tools/audio-render.mjs`                          |

## Licence and sources

- **Source:** all patches, instruments and the composition were written for this game and live in `src/audio/`. The WAVs in `docs/audio/` are renders of that code at 22.05 kHz mono.
- **Licence:** same as the rest of the repository. The rendered files carry no separate licence and may be used, modified and shipped commercially with the game. No sample packs, no Creative Commons material, no stock libraries were used, so there is nothing to attribute and no licence text to bundle.
- **Fonts and text:** none in audio.

If a sound is ever replaced with a purchased or downloaded asset, add its source, licence and attribution here before it ships.

## Pipeline

The game ships no audio bytes. On the first user gesture (pointer, touch or key) the engine creates the AudioContext, resumes it, plays a one-sample silent buffer (the iOS unlock), and renders every patch and instrument into AudioBuffers with the pure synth. That takes a few milliseconds and is deterministic, so what the reference WAVs contain is exactly what the game plays. Sounds are then buffer sources routed through the mixer.

## Mixer

```
master (mute switch, background mute)
 ├─ music bus (Settings: Music)
 │    ├─ calm layer
 │    └─ tense layer (gain follows belt tension)
 ├─ sfx bus   (Settings: Sound effects)
 └─ ui bus    (Settings: Interface)
```

Bus gains ramp over 50 ms. The master gain drops to zero when sound is switched off or the app is in the background.

## Sound effects

Length is the buffer length; most sounds are much shorter than they feel because the tails are echo.

<!-- sfx-table -->

| Name      | Trigger                                                    | Length  | Bus   | Layering                                                                                            |
| --------- | ---------------------------------------------------------- | ------- | ----- | --------------------------------------------------------------------------------------------------- |
| `tap`     | a diner is tapped and starts walking                       | 90 ms   | sfx   | short triangle blip 520 to 470 Hz over a 10 ms high-passed click                                    |
| `click`   | any UI button, tab or toggle                               | 50 ms   | ui    | high-passed noise tick with a 1.2 kHz sine body, 30 ms                                              |
| `swish`   | blocked bump, first half: the diner lunges                 | 100 ms  | sfx   | band-passed noise sweeping 1.2 kHz to 300 Hz, 90 ms                                                 |
| `thud`    | blocked bump, second half: the diner hits the blocker      | 220 ms  | sfx   | sine drop 110 to 55 Hz under low-passed noise, plus a 70 Hz square thump with drive                 |
| `bell`    | a diner lands on a seat                                    | 600 ms  | sfx   | three sines (1320, 2640, 1760 Hz) with fast attacks and a light echo: a counter bell                |
| `pop`     | a plate leaves the belt toward a diner                     | 110 ms  | sfx   | sine rising 600 to 950 Hz with a high-passed noise tick on the attack                               |
| `chew`    | the plate lands and the diner eats                         | 180 ms  | sfx   | two band-passed noise bites (900 and 700 Hz, 90 ms apart) each with a soft 180 Hz triangle          |
| `stamp`   | a diner pays: the PAID stamp                               | 120 ms  | sfx   | square 180 Hz thump with driven low-passed noise, 90 ms                                             |
| `cash`    | 220 ms after the stamp: the register                       | 450 ms  | sfx   | band-passed noise ka-ching, a 1568 Hz square and a 2093 Hz triangle ring with echo                  |
| `coin`    | each coin reaches the counter                              | 120 ms  | sfx   | two sines, 1568 then 2093 Hz 30 ms later, 80 ms                                                     |
| `tick`    | each of the last three seconds of a wasabi timer           | 40 ms   | sfx   | square 1 kHz, 30 ms                                                                                 |
| `chime`   | a chopstick lock opens, or the last ice cracks             | 600 ms  | sfx   | three rising sines (880, 1320, 1760 Hz) staggered by 90 ms, with echo                               |
| `crack`   | a tap on a frozen diner                                    | 120 ms  | sfx   | band-passed noise crack at 1.5 kHz, a 2.4 kHz square splinter and a high-passed shatter 20 ms later |
| `spoil`   | a wasabi plate expires                                     | 500 ms  | sfx   | driven saw sliding 420 to 140 Hz over 450 ms with a low-passed noise hiss                           |
| `locked`  | a tap on a chopstick-locked diner                          | 200 ms  | sfx   | two squares, 220 then 180 Hz, a falling "uh-uh"                                                     |
| `reveal`  | a covered plate shows its colour                           | 160 ms  | sfx   | triangle rising 500 to 900 Hz with a breathy high-passed noise                                      |
| `boost`   | a booster is used, a rescue lands                          | 300 ms  | sfx   | three-step square rise 740, 1100, then a 1480 Hz sine, 70 ms apart                                  |
| `fail`    | kitchen jam: every seat taken and nothing matches          | 700 ms  | sfx   | two driven saws (300 Hz, then 200 Hz at 220 ms) over a low-passed rumble                            |
| `win`     | level cleared (sound effect; the music sting plays on top) | 900 ms  | sfx   | five triangle notes C5 E5 G5 C6 E6 stepping every 90 ms, a 2093 Hz sine shimmer, echo               |
| `blocked` | a tap when no seat is free                                 | 160 ms  | sfx   | square 140 Hz buzz with low-passed noise, 130 ms                                                    |
| `sting`   | level cleared: the music sting on the music bus            | 1600 ms | music | koto pluck arpeggio D5 F#5 A5 D6 every 110 ms with a bell on the last note and long echo            |

<!-- /sfx-table -->

Layering by timing in the game code: a **blocked bump** is `swish` on the lunge and `thud` on impact 60 to 110 ms later; a **paid diner** is `stamp` at once, `cash` 220 ms later, and one `coin` per coin as it lands; a **level clear** is `win` on the sfx bus with the `sting` on the music bus while the loop ducks to 35 percent for 1.6 s.

## Music

- **Calm loop:** D major pentatonic, 84 bpm, 4/4, eight bars (22.9 s). A koto-style pluck carries a sparse melody that resolves to D every fourth bar; a soft pad holds D, Bm, G and A voicings every two bars; a round bass plays roots. The loop restarts seamlessly because every event is scheduled from a running loop clock.
- **Tension layer:** taiko on beats one and three (plus the and-of-four on even bars), shaker eighths, and a low drone every two bars. Its gain follows belt tension (`L.tension`, which rises when every seat is taken and the belt is nearly full) with a 300 ms smoothing, scaled to 90 percent.
- **Win sting:** a four-note pluck arpeggio D5, F#5, A5, D6 with a bell on the last note and a long echo, 1.6 s.
- **Instruments:** pluck, pad, bass, taiko, shaker, drone, each a Patch rendered at a base pitch and repitched with the buffer's playback rate (`2^((midi-base)/12)`).

The sequencer runs a 40 ms timer with a 150 ms lookahead and schedules notes on the AudioContext clock, the standard pattern for glitch-free timing under main-thread jitter.

## Interruptions and platforms

- **Unlock:** `pointerdown`, `touchend` and `keydown` on the document all call `engine.unlock()`; the canvas tap handler calls it as well, so iOS gets the gesture it needs.
- **Backgrounding:** `visibilitychange`, `pagehide`/`pageshow`, and Capacitor's `appStateChange` all route to `engine.setBackground()`. Going to the background mutes the master gain and suspends the context; coming back resumes it and re-syncs the loop clock, so no burst of missed notes plays and the loop starts cleanly from bar one.
- **iOS interruptions** (a call, Siri, another app taking audio): the context reports `interrupted`; when it returns to `running`, `onstatechange` re-syncs the loop. If iOS leaves it `suspended`, the next tap resumes it.
- **Android Chrome:** same paths; `--autoplay-policy` is not needed because the first tap starts everything.

The smoke test drives the background path with the DevTools protocol (`Page.setWebLifecycleState`) and checks the context state and the engine's event log on the way out and back.

## Settings

Sound (master switch), Music, Sound effects and Interface sliders. Values live in the save (`volMusic`, `volSfx`, `volUi`, schema v5) and are applied through `applyVolumes()`.

## Listening to the set

```
node tools/audio-render.mjs
```

writes one WAV per sound, one per instrument and a four-bar `music-preview.wav` with both layers into `docs/audio/`, and rebuilds the table above.
