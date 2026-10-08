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

## Sequencer

An optional input (Add input, Sequencer) holds a step sequencer, a drum machine by default (kick, snare, clap, hats, tom) with a bass synth as the other instrument. Sounds are synthesised in the browser; nothing is downloaded. The grid is sixteenth notes, one or two bars, in time with the metronome. Click a step to switch it on, again for an accent, again to clear; load a preset pattern, preview it, or switch it off with the power button. It plays while a take records or a loop plays. Its strip in the mixer decides whether it is recorded (mute keeps it out of the take). Pattern and instrument are saved in localStorage `musickit.looper.sequencer`.

## Icons

Icons come from Lucide, copied into `src/components/Icon.tsx` as plain SVG (ISC licence), so there is no extra dependency. Add an icon by copying its markup.

## Looping stage, groups and effects

The page has a Mixer section (inputs) and a Looping section. Each loop is a circle on a stage: click it to record, stop or re-record, drag it to move, and a ring shows progress through the loop (a spinner during the free first take). Small buttons under it mute, solo and clear; a slider sets its volume. Coloured groups are boxes you can drag by their title bar and resize from the corner; three exist by default. A loop whose circle centre is inside a group plays through that group's bus. The bus has its own volume and an effect chain (tape delay, reverb), edited from the group's effects button; loops outside every group play dry. Alt with the arrow keys moves a focused circle or group, Alt+Shift with the arrows resizes a group. The metronome can be started on its own from the tempo box. Layout, groups and effects are saved in localStorage `musickit.looper.layout`.

## Metronome bar

The metronome floats at the top of the page under the main nav (it sticks to the top as you scroll): a start/stop button, tempo as a slider plus a number box with minus and plus, and the beat dots, all in one group. A button opens a popover with every other option: beats per bar, count-in, quantise, click volume, hear the click, show beat dots. Starting the metronome by hand also plays the count-in first.

## Sequencers on the stage and the signal flow

Add input, Sequencer can be used more than once; each sequencer has its own strip, pattern, instrument and window. A sequencer is also a circle on the loop stage: drag it into a group and it plays through that group's bus; outside every group it plays to master. Its strip has a destination chip (a group, master, or the recorder, which is set by a switch in its window). Start and stop happen on the next beat of the metronome, so one can be stopped while another is started. Each group box has a start/stop button that starts or stops every loop and sequencer inside it. Sequencers are saved in localStorage `musickit.looper.sequencers`.

## Header

Only a cogwheel sits at the top right (settings), in the same sticky row as the metronome. There is no title bar or master meter; errors show in a banner.

## Buses, master and effects

The Mixer section lists the inputs, then the buses (one per group, five by default) and the master. A bus row shows its colour, name, how many loops and sequencers feed it, a level meter, volume, mute and a + button. The master row has a meter and a volume. Below is the Signal flow diagram, open by default.

Every input, sequencer and bus has a + button that opens an effects dialog: choose Tape delay or Reverb, set each effect before the fader (pre: cut by mute and volume) or after it (post: keeps ringing, so a reverb tail survives a mute), tweak, bypass or remove. Effects are saved with the strip or group.

## Scale Piano

Add input, Scale Piano adds a piano played from the computer keyboard and locked to a key and scale (major, minor, modes, harmonic and melodic minor, pentatonics, blues). Four rows of keys (Z row, A row, Q row, number row) are stacked octaves: each row starts on the root, one octave above the row below. The window shows every key with the note it plays (the roots in blue, the notes being played in amber) and a three-octave piano with the notes of the scale marked. Keys can also be clicked. The window listens to the keyboard only while it is open and never while typing in a field. Octave buttons move the whole range. It is heard on master and recorded through its strip. Saved in localStorage `musickit.looper.scalePianos`.

## Effect stack and diagram

Every input, sequencer and bus row shows its effect stack like a DAW insert chain: pre-fader effects, the fader, then post-fader effects, in the order the signal passes through them. Click a name to bypass, use the arrows to reorder, + to add. In the Signal flow diagram sequencers sit with the loops on the stage and connect to their group's bus (or master); they appear under inputs only when switched to record, so no line crosses the recorder.

## Metronome follows what is running

The metronome runs whenever anything runs (a take, a loop, a sequencer). Its button only starts or stops the metronome; when something else is running it only mutes or unmutes the click, and it never starts a sequencer. With the metronome already running a take needs no count-in: it starts on the next bar (or beat) line. With nothing running, recording starts the metronome with the count-in. Quantising recordings (whole bars, whole beats or off) is in Looper settings, Timing.

## Dragging in the diagram

In "How it is connected" a loop or sequencer can be dragged onto a bus (it moves into that group on the stage), onto the master (to a free spot outside the groups; the default groups leave a free strip at the bottom) or, for a sequencer, onto the recorder. The mixer rows, bus counts and the stage update with it. The first take now plays on at once, in phase, when it ends, instead of waiting a round.

## Loop lengths (planned)

New loops may be 2^n times longer or shorter than any other loop. Not built yet.
