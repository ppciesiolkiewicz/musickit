# Intro (quick tour)

`/intro`: a short animated tour with narration. It covers what's in the four menus, the AI practice plan, the notes creator, the help on every page and in every exercise, and the keys (⌘K / Ctrl K opens any page, Space on tool pages, number keys in ear training). It plays in the page from React components, not from a video file, so it stays sharp at any size and needs no ffmpeg.

| File | What |
| --- | --- |
| `script.json` | The narration, one entry per scene: `id`, `caption` (the scene's chip), `text` (what is said, also shown under the stage), `cues` (cue name → a phrase of `text`; the animation step fires when the narrator starts that phrase). A test checks that every phrase is in its text. |
| `voice.json` | The recorded narration: for each scene the text it was recorded from, its file (`/intro/<id>.mp3` in `public/`), its length and the second each cue starts. Written by `scripts/intro/voice.mjs`; don't edit it by hand. |
| `timeline.ts` | Pure. Scene start times and lengths, cue times. A scene whose text matches its recording uses the recording; otherwise the length is estimated from its word count and the scene plays silent with its caption. |
| `data.ts` | The two JSON files, typed. |
| `scenes.tsx` | The scenes on a 960 × 540 stage. Each is a pure function of the time into the scene and its cue times. They use the app's own pieces (wordmark, icons, the nav's section list, the compass button), drawn still: the tour never starts the mic or the sound engine. |
| `IntroPlayer.tsx` | The stage, scaled to fit its column, with Play/Pause (Space), a slider, mute, a chip per scene and the caption. The clock follows the audio while a scene's recording plays, and the frame clock otherwise. Used on `/intro` and in the "Quick tour" section of the home page (`SchoolsHome`), which passes `spaceKey={false}` so Space still scrolls there. |
| `TourCard.tsx` | The player small beside other content (`compact`: no scene chips or caption), with a Cinema mode button that opens the same player over the page; Escape or Close goes back. On `/demo`, beside the title. |

## Recording the narration (ElevenLabs)

```
node scripts/intro/voice.mjs            # records the scenes whose text changed
node scripts/intro/voice.mjs --all      # records them all again
node scripts/intro/voice.mjs --only menu,keys
```

The script needs `ELEVENLABS_API_KEY`, read from the environment or else from `.env.local` or `.env`. `ELEVENLABS_VOICE_ID` (default George, `JBFqnCBsd6RMkjVDRZzb`) and `ELEVENLABS_MODEL` (default `eleven_multilingual_v2`) choose the voice and model. Changing either records every scene again, so the tour keeps one voice. It uses the `with-timestamps` endpoint, so the cue times come from the voice itself. "attunr" is sent as "attuner" so the voice says it right (`SAY` in the script). Commit `public/intro/*.mp3` together with `voice.json`. A test fails when only some scenes match their recording.

## Changing the tour

- Text: edit `script.json` with the `teaching-voice` skill's "Words about the app" (plain, short, no hype, the labels as they appear on screen), then record the scene again. A scene keeps playing on its estimate until it is recorded.
- A new animation step: add a cue phrase to the scene in `script.json`, then use it in its scene component (`past(p, "name")`).
- A new scene: add it to `script.json` and its component to `SCENES` in `scenes.tsx`.
- Facts on the stage (the neck, chords) come from `npm run theory`. The notes scene shows minor pentatonic position 1 in A, frets 5 to 8, and in C, frets 8 to 11.
