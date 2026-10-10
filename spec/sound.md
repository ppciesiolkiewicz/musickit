# Music Kit — Sound

One module, `src/features/sound/`, makes every sound in the app: the piano and its MIDI input, the chord, scale and arpeggio pages, the improvisation page and the looper's Scale Piano.

- `engine/`: the one AudioContext and output bus (`context.ts`), note names and numbers and picking the nearest sample (`notes.ts`, tested), sample loading and caching (`samples.ts`), the instrument catalogue (`instruments.ts`, samples in `public/instruments`) and `createPlayer` (`player.ts`): a voice with its own instrument, note on and off, and a destination node.
- `playback/`: timed notes on a player: `playSequence`, `playMelody`, `strum`, `silence`, and `getSharedPiano`, the sampled piano that the chord, scale, arpeggio and pentatonic playback use.
- `keyboard/`: the two keyboards, bundled with the engine so both play the same sampled instruments. `Piano` (chromatic, with MIDI input, scale highlighting and an instrument picker) and `ScalePiano` (the computer keys locked to a key and scale; layout maths in `scaleKeys.ts`, tested). Each makes its own sample player unless it is given a voice. Also `PreloadPiano`, which starts loading the samples when a page opens.

Other features import from `@/features/sound`. The looper keeps no import from it in `src/lib/looper`: the looper's Scale Piano window renders the shared `ScalePiano` keyboard, and the app passes `createVoice` to the looper engine so its routed voice is a sample player (there is no synth fallback; without `createVoice` it is silent). The engine keeps only the saved state (`root`, `scale`, `octave`) and the nodes it routes. A keyboard picks its own instrument without changing what other pages play.
