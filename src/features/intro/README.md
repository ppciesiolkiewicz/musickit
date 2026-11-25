# Intro (quick tours)

Two short animated tours with narration, each about a minute and a half. They show what is in the app, scene by scene: no questions to the viewer, no price, no offer. `solo` is for students: a few questions, today's plan, the exercises and their tools, rating, the reminder, timer and day streak. `teachers` is for teachers: adding a student, their week, the learning path with the student on it (as on `/admin/content/path`), their progress and what the next plan picks from it (`plan/model/reach.ts`), the sliders and the next week. Both are on `/intro` behind a switch; each home page shows its own (`/players` the students' one, `/` the teachers' one) and `/demo` shows the teachers' one. They play in the page from React components, not from a video file, so they stay sharp at any size and need no ffmpeg.

| File | What |
| --- | --- |
| `script.json` | The narration of both tours (`videos.solo`, `videos.teachers`), one entry per scene: `id`, `caption` (the scene's chip), `text` (what is said, also shown above the slider as subtitles, a sentence at a time), `cues` (cue name → a phrase of `text`; the animation step fires when the narrator starts that phrase). A scene id is unique across both tours (`solo-…`, `teach-…`), since one voice file holds every take. A test checks that every phrase is in its text and that no text asks the viewer a question, sells (free, price, beta, trial…) or says what /dev/kickstarter forbids (AI, hype, an exclamation mark). |
| `voices/charlie.json` | The recorded narration, in the tours' one voice, Charlie: for each scene the text it was recorded from, its file (`/intro/charlie/<id>.mp3` in `public/`), its length and the second each cue starts. `estimated: true` on a take whose cue times were spread over it by character position instead of read from the voice's timings. Written by `scripts/intro/voice.mjs`; don't edit it by hand. |
| `timeline.ts` | Pure. Scene start times and lengths, cue times, and the subtitles: a scene's text one sentence at a time, each timed from the cue times around it (a recording stores no time per sentence). A scene whose text matches its recording uses the recording; otherwise the length is estimated from its word count and the scene plays silent with its caption. |
| `data.ts` | The two scripts (`VIDEOS`, and `VIDEO_LIST` with the words on the switch) and the recorded voice (`VOICE`), typed. |
| `scenes.tsx` | The scenes on a 960 × 540 stage. Each is a pure function of the time into the scene and its cue times. They use the app's own pieces (wordmark, icons) and copy the app's screens (the path's blocks and step marks, the star scale), drawn still: a tour never starts the mic or the sound engine. |
| `IntroPlayer.tsx` | One tour (`video`): the stage, scaled to fit its column, then Play/Pause (Space) with the subtitle beside it (the sentence being said) above the slider and mute, and a chip per scene. The clock follows the audio while a scene's recording plays, and the frame clock otherwise. `spaceKey={false}` lets Space scroll the page instead. |
| `IntroVideos.tsx` | Both tours with the switch "attunr for [Students \| Teachers]", one player at a time. On `/intro`. |
| `TourCard.tsx` | One tour (`video`) small beside other content (`compact`: no scene chips, smaller subtitles), with a Cinema mode button that opens the same player over the page; Escape or Close goes back. On `/demo` beside the title, and in the "Quick tour" section of both home pages. |

## Recording the narration (ElevenLabs)

```
node scripts/intro/voice.mjs                  # records the scenes whose text changed
node scripts/intro/voice.mjs --estimated      # also records again the takes with estimated cue times
node scripts/intro/voice.mjs --all            # records every scene again
node scripts/intro/voice.mjs --only solo-hello,teach-end
```

The script needs `ELEVENLABS_API_KEY`, read from the environment or else from `.env.local` or `.env`. The tours have one voice, Charlie (`VOICE` in the script: ElevenLabs voice `IKne3meq5aSn9XLyUdCD`, Australian, natural and relaxed, with the settings it is recorded with). `ELEVENLABS_MODEL` (default `eleven_multilingual_v2`) picks the model. Changing the voice id or the model records every scene again, so the tours stay one voice. It uses the `with-timestamps` endpoint, so the cue times come from the voice itself. "attunr" is sent as "attuner" so the voice says it right (`SAY` in the script). The manifest is saved after every take, so a run that runs out of credits keeps what it recorded. Commit `public/intro/charlie/*.mp3` together with `voices/charlie.json`. A test fails when only some scenes match their recording.

## Changing the tour

- Text: edit `script.json` with the `teaching-voice` skill's "Words about the app" (plain, short, no hype, the labels as they appear on screen). Say what is on the screen; never ask the viewer a question or name a price. Then record the scene again. A scene keeps playing on its estimate until it is recorded.
- A new animation step: add a cue phrase to the scene in `script.json`, then use it in its scene component (`past(p, "name")`).
- A new scene: add it to its tour in `script.json` and its component to `SCENES` in `scenes.tsx` (a test fails a scene with no component).
- Facts on the stage (the neck, chords) come from `npm run theory`. The week scene shows A minor pentatonic position 1, frets 5 to 8; the tab in the exercises scene is the low two strings of that position. The path scene names steps as `/admin/content/path` does.
