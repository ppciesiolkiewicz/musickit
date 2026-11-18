# Intro (quick tours)

Two short animated tours with narration, each about a minute and a half. `solo` is for a person who practises on their own: the questions, today's plan, the exercises, rating, the daily habit, free in beta and the early price. `teachers` is for teachers and schools: adding a student, their week, the sliders and the next week, a lesson note, founding partners, the demos and the call. Both are on `/intro` behind a switch; each home page shows its own (`/players` the solo one, `/` the teachers' one) and `/demo` shows the teachers' one. They play in the page from React components, not from a video file, so they stay sharp at any size and need no ffmpeg.

What a tour may say is the offer on `/dev/kickstarter`: `src/features/devtools/model/kickstarterStudents.ts` (the pillars, the terms, "Never say") for `solo`, `kickstarter.ts` (`FACTS`, `VOICE`) for `teachers`. A price or a number of days is never in the narration, so a recording doesn't go stale when it changes: the scene draws it from `src/lib/studentOffer.ts` or `src/lib/foundingOffer.ts`.

| File | What |
| --- | --- |
| `script.json` | The narration of both tours (`videos.solo`, `videos.teachers`), one entry per scene: `id`, `caption` (the scene's chip), `text` (what is said, also shown under the stage as subtitles, a sentence at a time), `cues` (cue name → a phrase of `text`; the animation step fires when the narrator starts that phrase). A scene id is unique across both tours (`solo-…`, `teach-…`), since one voice file holds every take. A test checks that every phrase is in its text and that no text says what the offer forbids (AI, hype, an exclamation mark). |
| `voices/george.json` | The recorded narration, in the tour's one voice, George: for each scene the text it was recorded from, its file (`/intro/george/<id>.mp3` in `public/`), its length and the second each cue starts. Written by `scripts/intro/voice.mjs`; don't edit it by hand. |
| `timeline.ts` | Pure. Scene start times and lengths, cue times, and the subtitles: a scene's text one sentence at a time, each timed from the cue times around it (a recording stores no time per sentence). A scene whose text matches its recording uses the recording; otherwise the length is estimated from its word count and the scene plays silent with its caption. |
| `data.ts` | The two scripts (`VIDEOS`, and `VIDEO_LIST` with the words on the switch) and the recorded voice (`VOICE`), typed. |
| `scenes.tsx` | The scenes on a 960 × 540 stage. Each is a pure function of the time into the scene and its cue times. They use the app's own pieces (wordmark, icons), drawn still: a tour never starts the mic or the sound engine. |
| `IntroPlayer.tsx` | One tour (`video`): the stage, scaled to fit its column, with the subtitle under it (the sentence being said), Play/Pause (Space), a slider, mute and a chip per scene. The clock follows the audio while a scene's recording plays, and the frame clock otherwise. `spaceKey={false}` lets Space scroll the page instead. |
| `IntroVideos.tsx` | Both tours with the switch "attunr for [Solo musicians \| Teachers and schools]", one player at a time. On `/intro`. |
| `TourCard.tsx` | One tour (`video`) small beside other content (`compact`: no scene chips, smaller subtitles), with a Cinema mode button that opens the same player over the page; Escape or Close goes back. On `/demo` beside the title, and in the "Quick tour" section of both home pages. |

## Recording the narration (ElevenLabs)

```
node scripts/intro/voice.mjs                  # records the scenes whose text changed
node scripts/intro/voice.mjs --all            # records every scene again
node scripts/intro/voice.mjs --only solo-hello,teach-end
```

The script needs `ELEVENLABS_API_KEY`, read from the environment or else from `.env.local` or `.env`. The tour has one voice, George (`VOICE` in the script: ElevenLabs voice `JBFqnCBsd6RMkjVDRZzb`, warm and calm, with the settings it is recorded with). `ELEVENLABS_MODEL` (default `eleven_multilingual_v2`) picks the model. Changing the voice id or the model records every scene again, so the tour stays one voice. It uses the `with-timestamps` endpoint, so the cue times come from the voice itself. "attunr" is sent as "attuner" so the voice says it right (`SAY` in the script). Commit `public/intro/george/*.mp3` together with `voices/george.json`. A test fails when only some scenes match their recording.

## Changing the tour

- Text: edit `script.json` with the `teaching-voice` skill's "Words about the app" (plain, short, no hype, the labels as they appear on screen) and only from what `/dev/kickstarter` allows, then record the scene again. A scene keeps playing on its estimate until it is recorded.
- A new animation step: add a cue phrase to the scene in `script.json`, then use it in its scene component (`past(p, "name")`).
- A new scene: add it to its tour in `script.json` and its component to `SCENES` in `scenes.tsx` (a test fails a scene with no component).
- Facts on the stage (the neck, chords) come from `npm run theory`. The lesson-note scene shows minor pentatonic position 1 in A, frets 5 to 8, and in C, frets 8 to 11; the tab in the exercises scene is the low two strings of that position.
