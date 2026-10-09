# Music Kit — Sound

One module, `src/features/sound/`, makes every sound in the app: the piano and its MIDI input, the chord, scale and arpeggio pages, the improvisation page and the looper's Scale Piano.

- `engine/`: the one AudioContext and output bus (`context.ts`), note names and numbers and picking the nearest sample (`notes.ts`, tested), sample loading and caching (`samples.ts`), the instrument catalogue (`instruments.ts`, samples in `public/instruments`) and `createPlayer` (`player.ts`): a voice with its own instrument, note on and off, and a destination node.
- `playback/`: timed notes on a player: `playSequence`, `playMelody`, `strum`, `silence`, and `getSharedPiano`, the sampled piano that the chord, scale, arpeggio and pentatonic playback use.
- `keyboard/`: the Piano component, MIDI input, the scale highlighting it needs, and `PreloadPiano`, which starts loading the samples when a page opens.

Other features import from `@/features/sound`. The looper keeps no import from it in `src/lib/looper`: the app passes `createVoice` to the looper engine so the Scale Piano plays the same piano samples (a built-in synth is the fallback). A keyboard picks its own instrument without changing what other pages play.
