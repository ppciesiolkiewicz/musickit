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
