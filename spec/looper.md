# Music Kit — Looper

A multi-channel audio looper at `/looper`. The engine lives in `src/lib/looper/` and imports nothing outside it. The app hands it extras through `LooperOptions` (a shared `AudioContext` and an extra source node, which is the piano's output bus). The UI is in `src/components/looper/`. The only shared piece is the top navigation (`src/components/SiteNav.tsx`).

## Behaviour

- **Channels**: 4 to start, up to 8 (`+ Add channel`, `− Remove last`). Each has a name, volume, mute, solo, clear, and a waveform with a moving playhead.
- **First take** (any channel) is free length: press Record, play, press Stop. Its length becomes the loop length.
- **Later takes** are armed: the channel waits for the loop to come round, then records exactly one loop, in sync with everything else. Re-recording a channel replaces its take.
- **Transport**: Stop / Play from the top, Clear everything, a position bar.
- **Audio input**: pick any input device the browser lists (for example a Focusrite Scarlett), choose which channel to record from (Input 1, Input 2, stereo or mixed to mono), and watch a live level meter. The chosen device is remembered in `localStorage`. Echo cancellation, noise suppression and auto gain are switched off so an instrument is recorded cleanly.
- **Monitoring**: optional, off by default (browser monitoring adds delay; direct monitoring on the interface is better).
- **Latency fix**: a slider (0–250 ms) that shifts new takes earlier to compensate for input latency. It starts from the browser's reported latency.

## Sources and settings

- **Piano as an input**: the piano page's sound passes through one output bus (`getOutputBus()` in `src/lib/audio.ts`). The looper taps that bus, so whatever the piano plays is recorded into a channel as audio and drawn as a waveform. No microphone or cable is needed; piano-only takes work without any audio permission.
- **Audio interface and piano can be recorded together**, mixed into one take, or either one alone (`setSources`). The latency fix applies only when the audio interface is on.
- **Piano panel** on the looper page: the same on-screen piano, computer keyboard and MIDI keyboard as the Piano page.
- **Settings modal** (⚙): audio interface on/off, device, which input channel, monitoring; piano on/off; level meter; **MIDI keyboard** (connect, and choose which MIDI device plays the piano, remembered); latency fix.

## Design

- `frames.ts`: pure frame and loop arithmetic (cutting an exact window out of recorded chunks, loop phase, next boundary, peaks, input-channel mixing, mute/solo gain). Unit tested.
- `recorderWorklet.ts`: an AudioWorklet (loaded from a Blob URL) that posts each block of input with its audio-clock frame number, so takes are cut at exact sample positions rather than by timers.
- `engine.ts`: `LooperEngine`, a plain class with `subscribe` / `getSnapshot` for `useSyncExternalStore`. Playback uses looping `AudioBufferSourceNode`s that join the running loop at the correct phase.
- `LooperApp.tsx`: the UI.

## Limits

Microphone permission and a secure context (HTTPS or localhost) are required. The first take is capped at 120 s. Takes are held in memory only; nothing is saved or uploaded. Output device selection and overdubbing onto an existing channel are not implemented.

## Mixer and floating keyboard

- The recorder is fed by an **input mixer** (`src/lib/looper/mixer.ts`): a list of input strips, up to 8. A strip is either an audio device input (an interface such as a Scarlett, or the built-in mic) or the extra source the app provides (the keyboard). Each strip has its own device, channel choice (Input 1, Input 2, stereo, mono mix), gain, mute, solo, "hear it" monitoring and a level meter that reads before mute.
- Strips can be added and removed at any time (`+ Interface 1 & 2` adds both jacks of an interface as two strips). Several strips can share one device; the stream is opened once. The strip list is remembered in `localStorage`.
- Mute and solo behave like a mixing desk: muted strips are not recorded, and when any strip is soloed only soloed strips are.
- The latency fix applies only while a microphone or interface strip is live; a keyboard-only take gets none.
- The **keyboard** opens from the mixer's keyboard strip or the header button as a floating window (`src/components/FloatingWindow.tsx`): drag the title bar, resize from the corner, scales its content to fit, position and size remembered; arrow keys move it and Shift + arrows resize it when the title bar is focused.
- Settings now holds the MIDI keyboard choice, the latency fix and the mix level.

## Starting and microphone permission

There is no "Start looper" button. The audio engine starts on the first click or key press on the page (browsers need a gesture) and opens no microphone. A device strip asks for microphone access only when the person adds it in the Add input dialog, presses "Detect devices" there, or presses "Connect" on a saved strip (saved device strips come back disconnected). New installs start with only the software keyboard strip. The keyboard window opens only from the keyboard strip in the mixer.

## Metronome and quantising

A metronome runs whenever a take is recording or a loop is playing. Tempo (40 to 240 bpm), beats per bar, click volume, audible on/off, beat dots on/off, count-in (0 to 2 bars) and quantise (bar, beat, off) are in Settings, with quick tempo, click and quantise controls in the page header. The click is never recorded. The first take starts on beat 1 after the count-in and is rounded to the nearest whole bar or beat, so the loop is a whole number of bars and every later layer lines up with the click. With quantise off the first take is free length and the beat restarts at the loop start. Tempo and bar length are locked while a loop exists. Settings are saved in localStorage `musickit.looper.metronome`.
