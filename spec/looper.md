# Music Kit — Looper

A multi-channel audio looper at `/looper`. It is fully independent of the other features: the engine lives in `src/lib/looper/`, the UI in `src/components/looper/`, and nothing there imports from the chord, scale, piano or audio code. The only shared piece is the top navigation (`src/components/SiteNav.tsx`).

## Behaviour

- **Channels**: 4 to start, up to 8 (`+ Add channel`, `− Remove last`). Each has a name, volume, mute, solo, clear, and a waveform with a moving playhead.
- **First take** (any channel) is free length: press Record, play, press Stop. Its length becomes the loop length.
- **Later takes** are armed: the channel waits for the loop to come round, then records exactly one loop, in sync with everything else. Re-recording a channel replaces its take.
- **Transport**: Stop / Play from the top, Clear everything, a position bar.
- **Audio input**: pick any input device the browser lists (for example a Focusrite Scarlett), choose which channel to record from (Input 1, Input 2, stereo or mixed to mono), and watch a live level meter. The chosen device is remembered in `localStorage`. Echo cancellation, noise suppression and auto gain are switched off so an instrument is recorded cleanly.
- **Monitoring**: optional, off by default (browser monitoring adds delay; direct monitoring on the interface is better).
- **Latency fix**: a slider (0–250 ms) that shifts new takes earlier to compensate for input latency. It starts from the browser's reported latency.

## Design

- `frames.ts`: pure frame and loop arithmetic (cutting an exact window out of recorded chunks, loop phase, next boundary, peaks, input-channel mixing, mute/solo gain). Unit tested.
- `recorderWorklet.ts`: an AudioWorklet (loaded from a Blob URL) that posts each block of input with its audio-clock frame number, so takes are cut at exact sample positions rather than by timers.
- `engine.ts`: `LooperEngine`, a plain class with `subscribe` / `getSnapshot` for `useSyncExternalStore`. Playback uses looping `AudioBufferSourceNode`s that join the running loop at the correct phase.
- `LooperApp.tsx`: the UI.

## Limits

Microphone permission and a secure context (HTTPS or localhost) are required. The first take is capped at 120 s. Takes are held in memory only; nothing is saved or uploaded. Output device selection and overdubbing onto an existing channel are not implemented.
