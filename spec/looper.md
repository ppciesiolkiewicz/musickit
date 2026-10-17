# Music Kit — Looper

A multi-channel audio looper at `/looper`. The engine lives in `src/lib/looper/` and imports nothing outside it. The app hands it extras through `LooperOptions`: a shared `AudioContext` and `createVoice`, the sound of its instruments (the sampler's generator voice, `makeGeneratorVoice`). The UI is in `src/components/looper/`. The only shared piece is the top navigation (`src/components/SiteNav.tsx`).

## Vocabulary

- **Inputs**: sound makers that feed the rest: an audio device (interface, mic) or the keyboard. Effects belong to an input.
- **Sequencers**: step sequencers (drums, bass) and the **Drone**, a third instrument of the same kind. Each is a circle on the stage and a widget of its own settings.
- **Buses**: anything sound is sent to and leaves from, with effects and a mute. Two kinds: a **Bus** is a standalone block you connect things to and add effects (the old "effect chain"); a **Group** is a special bus that also holds loops inside (a coloured box on the stage, with a recorder for its loops). The **master bus** is the last bus, bundled with the buses in the Widgets view.
- **Output buses of an input**: an input's block (in Canvas) can hold buses of its own. With none it shows "Add output bus". With one it shows that bus. With two or more the block is also a switch: a radio (one bus at a time) or a checkbox (any combination of buses) beside each bus, its effects under its name; a click anywhere on a bus card (not on its buttons) picks it like its radio or checkbox. The buses start locked for switching: each card shows only its name and its effects as text, so a click always switches. The pencil in the header unlocks editing (the effects button, mute, remove and "Add output bus"); it is remembered per input (`musickit.looper.folds`, key `<input>:busEdit`). The input has one output for all its buses: one connector on the right of its block. Click it for a checkbox list of where it sends (the master, each group's recorder, other buses), each place on or off for every bus at once, with a remove button; drag from it to add a place (every bus gets the link). Same behaviour as the earlier separate switch, in one block. A stand-alone **Switch** block still exists for older saves and the round + button.
- Effects are never blocks of their own: they sit on an input or a bus.
- **Widgets** (called "Controls" on screen): blocks that only control something that exists elsewhere: an effect, an input's "Switch between buses", its outputs ("Groups and buses") and the Inputs list. Deleting a widget deletes the block only (the effect, input or bus stays); add it again from Controls (the round +). The switch and outputs widgets show the same controls as the input's block (the block keeps them too), always unfolded; the wires end on the block, never on a widget. Widgets and the Tuner are **pinnable**: the pin button in the title keeps them in place on the screen, at 100%, while the canvas pans and zooms (pinned, the frame is blue; Auto position and "Show every widget" leave them alone; pins are saved with the canvas layout in `musickit.looper.board2`). The Tuner is not a widget (deleting it deletes the tuner). Loops, groups, inputs, sequencers and buses are neither. Blocks are deleted (a trash button whose title says what goes), never closed or hidden.

## Behaviour

- **Channels**: 4 to start, up to 8 (`+ Add channel`, `− Remove last`). Each has a name, volume, mute, solo, clear, and a waveform with a moving playhead.
- **First take** (any channel) is free length: press Record, play, press Stop. Its length becomes the loop length.
- **Later takes** are armed: the channel waits for the loop to come round, then records exactly one loop, in sync with everything else. Re-recording a channel replaces its take.
- **Transport**: one Play/Stop (in the metronome bar and again in the Looping header), Clear every loop, a short label and the bar timeline (see Transport below).
- **Audio input**: pick any input device the browser lists (for example a Focusrite Scarlett), choose which channels to record from (any single input, or a pair in stereo or mixed to mono; see Device channels), and watch a live level meter. The chosen device is remembered in `localStorage`. Echo cancellation, noise suppression and auto gain are switched off so an instrument is recorded cleanly.
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

- The recorder is fed by an **input mixer** (`src/lib/looper/mixer.ts`): a list of input strips, up to 20 (sequencers and instruments count). A strip is an audio device input (an interface such as a Scarlett, or the built-in mic), an instrument (see Instruments) or a sequencer. By default (once per project) the project has four rigs: a guitar on Input 1 with the tone buses and a vocal on Input 2 with the vocal buses ("Guitar" / "Vocal" until an audio interface is seen, then "Guitar · <interface>" / "Vocal · <interface>"; any known interface maker, see `deviceChoice.ts`; without one, "Detect devices" puts the vocal on the computer's own mic, mono, and the guitar keeps waiting; an input that already has a device is never moved, even when that device is missing, `adoptPlan`), a Piano instrument with the piano buses, and one Scale Piano instrument with theirs. Adding a guitar (role Guitar), a Piano, a Scale Piano or a Soundboard from Add input brings the same rig: buses inside the block, one on at a time, each to the master and recording into every group. Hardware inputs added as Guitar or Vocal are named "Guitar · <device> input 1" / "Vocal · …". Each strip has its own device, channel choice (Input 1, Input 2, stereo, mono mix), gain, mute, solo, "hear it" monitoring and a level meter that reads before mute.

### Device channels (any audio interface, e.g. a BOSS RC-505)

- A strip takes channels by `mode` and `pair` (saved; old saves load as pair 0): pair 0 is inputs 1-2, pair 1 inputs 3-4 and so on; within the pair Input (left), Input (right), the pair in stereo, or the pair mixed to mono (`inputChannels`, `channelChoices`, `channelLabel` in `frames.ts`, tested). The strip's channel select lists what the device gives; a choice past the device's channels stays selectable and shows "… is silent".
- Opening a device asks for every channel (`channelCount` ideal 32). The count is the track settings' `channelCount`, else its capabilities' maximum (`detectChannels`), 0 when unknown (treated as 2). Chrome gives at most 2 channels per device; a bigger interface shows only inputs 1-2 there.
- Add input, Hardware: once the browser already allows the microphone, the dialog listens to the chosen device without a strip (`probeDevice`, shared with any strip on that device, released when the dialog closes or the device changes) and shows a meter per channel. **Channel detection**: until the person picks, one channel with sound picks that channel, and both channels of one pair pick that pair in stereo; the last detected choice stays after the sound stops. "Every channel separately" makes one strip per channel (`eachChannel`), so each channel has its own effects; the guitar rig or the preset goes on the first one only.
- Which device is the interface (`deviceScore` in `deviceChoice.ts`): a known name (Scarlett, BOSS RC-505 and others) scores 2; any other named device that is not the computer's own part, a virtual device, a headset, a camera or a phone scores 1, so an interface we have no name for is still preferred over the built-in mic.
- The BOSS RC-505 is treated as an input device only: its stereo sound comes in as one input (Inputs 1-2); nothing in the app separates or syncs what it plays.
- Strips can be added and removed at any time (`+ Interface 1 & 2` adds both jacks of an interface as two strips). Several strips can share one device; the stream is opened once. The strip list is remembered in `localStorage`.
- Mute and solo behave like a mixing desk: muted strips are not recorded, and when any strip is soloed only soloed strips are.
- The latency fix applies only while a microphone or interface strip is live; a keyboard-only take gets none.
- An **instrument's play window** opens from its strip (the keyboard button) as a floating window (`src/components/FloatingWindow.tsx`): drag the title bar, resize from the corner, scales its content to fit, position and size remembered; arrow keys move it and Shift + arrows resize it when the title bar is focused.
- Settings now holds the MIDI keyboard choice, the latency fix and the mix level.

## Starting and microphone permission

The page stays covered until the audio runs (browsers need a gesture to start it): a "Start the looper" screen, which a click on it or any key press dismisses, then the startup loader. Starting opens no microphone. A device strip asks for microphone access only when the person adds it in the Add input dialog, presses "Detect devices" there, or presses "Connect" on a saved strip (saved device strips come back disconnected). New projects start with the default rigs (see Mixer). An instrument's play window opens only from its strip.

## Metronome and quantising

The metronome clicks while the transport plays (see Transport). Tempo (40 to 240 bpm), beats per bar, click volume, audible on/off, beat dots on/off, count-in (0 to 2 bars) and quantise (bar, beat, off) are in Settings, with quick tempo, click and quantise controls in the page header. The click is never recorded. The first take starts on beat 1 after the count-in and is rounded to the nearest whole bar or beat, so the loop is a whole number of bars and every later layer lines up with the click. With quantise off the first take is free length and the beat restarts at the loop start. Tempo and bar length are locked while a loop exists. Settings are saved in localStorage `musickit.looper.metronome`.

## Sequencer

An optional input (Add input, Sequencer) holds a step sequencer, a drum machine by default (kick, snare, clap, hats, tom) with a bass synth as the other instrument. Sounds are synthesised in the browser; nothing is downloaded. The grid is sixteenth notes, one or two bars, in time with the metronome. Click a step to switch it on, again for an accent, again to clear; load a preset pattern, preview it, or switch it off with the power button. It plays while a take records or a loop plays. Its strip in the mixer decides whether it is recorded (mute keeps it out of the take). Pattern and instrument are saved in localStorage `musickit.looper.sequencer`.

## Icons

Icons come from Lucide, copied into `src/components/Icon.tsx` as plain SVG (ISC licence), so there is no extra dependency. Add an icon by copying its markup.

## Looping stage, groups and effects

The page has a Mixer section (inputs) and a Looping section. Each loop is a circle on a stage: click it to record, stop or re-record, drag it to move, and a ring shows progress through the loop (a spinner during the free first take). Under it, two rows of controls: mute, solo and its volume slider, then play/stop, waveform edits and clear. Coloured groups are boxes you can drag by their title bar and resize from the corner. Five exist by default, each named after its own effects (Room: short reverb; Echo: tape delay; Wide: chorus and reverb; Lo-fi: low-pass filter and tremolo; Space: phaser and long reverb), each with four empty loops two by two (loops 1 to 4 in Room, and so on). A group is renamed by clicking its name in the title bar and typing (Enter or Esc finishes). The number of loops is saved with the layout; older saves keep theirs. A loop whose circle centre is inside a group plays through that group's bus. The bus has its own volume and an effect chain (tape delay, reverb), edited from the group's effects button; loops outside every group play dry. Alt with the arrow keys moves a focused circle or group, Alt+Shift with the arrows resizes a group. The metronome can be started on its own from the tempo box. Layout, groups and effects are saved in localStorage `musickit.looper.layout`.

## Metronome bar

The metronome floats at the top of the page under the main nav (it sticks to the top as you scroll): the transport's Play/Stop button, tempo as a slider plus a number box with minus and plus, and the beat dots, all in one group. A button opens a popover with every other option: beats per bar, count-in, quantise, click volume, hear the click, show beat dots. Play also plays the count-in first.

## Drone

The Drone is a sequencer instrument (`instrumentId: "drone"`, `src/features/instruments/drone/drone.ts`, shared with the /theory/drone page) with no pattern: one held note made from a few oscillators (the note twice, detuned a little each way so it breathes, plus a fifth, the octave above and the octave below, each with its own level), a filter, a modulator and a volume. Settings: note (C to B), octave 1 to 5, waveform (sine, triangle, saw, square), volume, octave below, fifth, octave above, detune (0 to 30 cents); filter type (low-pass, band-pass, high-pass), cut-off (200 Hz to 6.4 kHz) and resonance; modulation (an LFO) on the filter (up to two octaves each way), the pitch (up to 50 cents each way) or the volume (down to silence), or off, with its shape (a waveform), speed (0.05 to 8 Hz) and depth. By default a slow sine moves the filter. Above the settings two pictures: the wave the drone makes (live while it sounds on the theory page; the bare oscillator otherwise) and the modulation running right to left with its range in words. Reset puts every setting back to the default (greyed out when nothing changed). It is added from the round + button (Looping section, Drone), from the Add dialog or with `sequencer.add` with `instrument: "drone"`; it is a circle on the stage that lives in a group like any sequencer and plays through the bus of the group it sits in (master outside every group, or the recorder as well when switched). Start and stop happen on the next beat with a 1.2 s fade; changing the note while it sounds glides to it. Its settings are saved in `musickit.looper.sequencers` (`drone`). The same sound is the Drone page of the theory section (`/drone`, `DroneWidget`): standalone, straight to the speakers, no group, settings in `musickit.drone`.

Its window (and every sequencer's) has no play button: it starts and stops from its circle on the stage (or its group), on the beat. The circle's label shows the note (Drone · C2). The window shows the live wave while it sounds.

## Sequencers on the stage and the signal flow

Add input, Sequencer can be used more than once; each sequencer has its own strip, pattern, instrument and window. A sequencer is also a circle on the loop stage: drag it into a group and it plays through that group's bus; outside every group it plays to master. Its strip has a destination chip (a group, master, or the recorder, which is set by a switch in its window). Start and stop happen on the next beat of the metronome, so one can be stopped while another is started. Each group box has a start/stop button that starts or stops every loop and sequencer inside it. Its circle card and its window have Mute and a volume slider: they set the sequencer's strip, and what is heard (to its group bus or master) follows them as well as what is recorded. Loops and sequencers sit on bordered cards so they stand out from the stage. Sequencers are saved in localStorage `musickit.looper.sequencers`.

## Header

Only a cogwheel sits at the top right (settings), in the same sticky row as the metronome. There is no title bar or master meter; errors show in a banner.

## Buses, master and effects

The Mixer section lists the inputs, then the buses (one per group, five by default, with the master bus last). A bus row shows its colour, name, how many loops and sequencers feed it, a level meter, volume, mute and a + button. The master row has a meter and a volume. Below is the Signal flow diagram, open by default.

Every input, sequencer and bus has a + after its fader marker in the effect stack that opens an effects dialog: the dialog has a Before-fader section, the fader, and an After-fader section, each with its own + to add an effect. An arrow button moves an effect to the other side (pre: cut by mute and volume; post: keeps ringing, so a reverb tail survives a mute). Settings fold away; bypass or remove from the card. Effects are saved with the strip or group.

## Instruments

An instrument input is one block made of a **controller** (what you play) and a **sound generator** (what makes the sound). Any controller works with any generator; every instrument strip has a **Sound generator** row in plain view: a picker (Built-in instruments, ElevenLabs sampler), what it plays now ("Cello", "Glass hit", "5 pads", with a warning dot when a sample is missing) and a button that opens its settings in the play window (for the sampler: generate, upload, choose samples). The strip's pencil opens "Play with" (Piano, Scale Piano, Soundboard). The play window is headed "Sound generator · <name>". Every change is an `instrument.set` action, so it can be undone and recorded.

- Controllers: **Piano** (the on-screen keyboard with its MIDI button), **Scale Piano** (below) and **Soundboard**: 1 to 32 pads (8 by default), clicked or played from the keys `1–0`, `Q–P`, `A–L`, `Z–M` (key codes); pad i plays note 36 + i; pads light while held; never while typing in a field.
- Generators: **Piano**, the built-in sampled instruments (on a Soundboard each pad plays a chosen note), and **Sampler**: under a Piano or Scale Piano one sample tuned across the keys from its root note (a root picker and **Detect**, which reads the pitch; "No clear pitch" when it cannot), under a Soundboard one sample per pad, unpitched (a pad without one is silent).
- Samples come from the browser's sample library (IndexedDB `musickit-sampler`, see `spec/sampler.md`): generated with ElevenLabs from a description, uploaded, or dropped on the sampler settings (they go to the selected pad, or become the instrument's sample) or on a pad. A file that does not decode is refused with a message. The sample picker plays, renames and deletes samples. A deleted sample leaves what used it silent with a warning dot until another is chosen.
- Saved in localStorage `musickit.looper.instruments` (by instrument id). Old projects are moved once on load: the keyboard strip and every Scale Piano strip become instruments with the same strip ids (so buses and connections stay), `musickit.looper.scalePianos` is removed, and a Scale Piano that used an instrument from the old sampler page plays the Piano. Removing an instrument cannot be undone.

### Scale Piano

Add input, Scale Piano adds a piano played from the computer keyboard and locked to a key and scale (major, minor, modes, harmonic and melodic minor, pentatonics, blues). Four rows of keys (Z row, A row, Q row, number row) are stacked octaves: each row starts on the root, one octave above the row below. The window shows every key with the note it plays (the roots in blue, the notes being played in amber) and a three-octave piano with the notes of the scale marked. Keys can also be clicked. The window listens to the keyboard only while it is open and never while typing in a field. Octave buttons move the whole range. Its sound is the instrument's generator (the Piano by default). It is heard on master (unless patched) and recorded through its strip.

## Effect stack and diagram

Every input, sequencer and bus row shows its effect stack like a DAW insert chain: pre-fader effects, the fader, then post-fader effects, in the order the signal passes through them. Click a name to bypass, use the arrows to reorder, + to add. In the Signal flow diagram sequencers sit with the loops on the stage and connect to their group's bus (or master); they appear under inputs only when switched to record, so no line crosses the recorder.

## Transport

One transport owns the beat grid (`transport.ts`): stopped, count-in, running, or stopping on the next line. **Play** (`transport.set`; the button in the metronome bar and the same button in the Looping header) starts the clock with the count-in, and every armed loop and sequencer starts from its top on beat 1. **Stop** ends everything, clock included, on the next bar or beat line (the quantise setting; at once when quantise is off or during the count-in); pressing Play before that line carries on. Stop during a take ends the take first (rounded as usual), then stops. The bell is the only way to silence the click; it never stops anything.

**Armed**: each loop and sequencer has an on/off (a loop's `active`, a sequencer's `playing`). Its button shows Stop only while it is armed and the transport plays; otherwise Play, which arms it and, when the transport is stopped, starts it (no count-in). A group's button does the same for everything in the group. Disarming the last item leaves the clock running, like a metronome. Stopping the transport never disarms anything, so Play brings back the same set. Sequencers start disarmed, so Play on a new project starts only the click.

The Looping header shows Play/Stop, Clear, a short label (what exists when stopped: "2 bars · 4.80 s", "1 bar" with sequencers only, "Record or start a sequencer" when there is nothing; "count-in" or "● rec" while they run) and the timeline: one segment per bar of the longest armed loop (one bar without loops), beat ticks, the current bar lit, a playhead and "bar 2 / 4". A take adds segments as it grows (red), so a free take shows the length it would have if stopped now; a count-in shows hollow segments.

With the transport already playing a take needs no count-in: it starts on the next bar (or beat) line. Stopped, recording plays the transport with the count-in. Quantising recordings (whole bars, whole beats or off) is in Looper settings, Timing.

## Dragging in the diagram

In "How it is connected" a loop or sequencer can be dragged onto a bus (it moves into that group on the stage), onto the master (to a free spot outside the groups; the default groups leave a free strip at the bottom) or, for a sequencer, onto the recorder. The mixer rows, bus counts and the stage update with it. The first take now plays on at once, in phase, when it ends, instead of waiting a round.

## Loop lengths (planned)

New loops may be 2^n times longer or shorter than any other loop. Not built yet.

## Page chrome

The looper page has no site navigation. The top row holds the metronome on the left and, on the right, the settings cog and an x that returns to the home page. The page has the same side gutters as the other pages. On a phone the top row wraps and the tempo slider hides (the number box stays), so the page never scrolls sideways. The home page lists every tool as a card with a piano underneath.

## Stage zoom

The looping stage is drawn at a fixed size and scaled as a whole (circles, groups and text together). It fits the page width by default; the − and + buttons zoom (40% to 250%), the middle button returns to fit, and the area scrolls when it is larger than the page. The looper page uses the full width with small margins.

## Actions, history, macros, widgets
Undo/redo, a history list, recordable macros and a movable/resizable widget layout. See `spec/looper-actions.md`. All user changes go through `engine.do`: inputs, drums, groups, loops, effects (ten kinds, incl. filter, distortion, chorus, phaser, tremolo, compressor, EQ and the NAM amp model), so a macro or an AI script can build a whole setup.

## Amp model (NAM) effect

A tenth effect kind, `nam`, runs Neural Amp Modeler models (`.nam`, including A2) on a guitar input. The effect is injected by `LooperApp` (`setNamFactory`, `registerChoice("nam-model")`); the looper itself does not import the feature, and the effect passes the signal through until a model is chosen. The model is a numeric library id in the `model` parameter, so actions, undo, macros and AI scripts need no new action type. In the effects dialog the Model row is a picker with an add button; `.nam` files can also be dropped on the row. Parameters: input and output gain (dB), noise gate (-90 = off), level match, size (for slimmable models), mix. Details: `spec/nam.md`.

## Master bus effects, effect widgets and the stage canvas

- The master bus is the global output. Its chain is: everything -> pre-fader effects -> master fader -> post-fader effects -> speakers and meter. The same controls (level, volume, effects button) are in the mixer's Master row and in Looper settings under "Output (master bus)". Master effects are actions (`fx.*` with target `{ master: true }`), so undo, macros and AI scripts cover them, and they are saved in the layout (`masterEffects`).
- Every group effect is pinned by default, once per project (`widgetDefaults`, flag `musickit.looper.groupPinsDone`), so the group effects are on show from the start. Any effect (on an input, a bus, a group or the master) can be pinned as a widget: the dashboard button on its card in the effects dialog, or the round + button, Controls, Effect widget (listed by owner). A widget is a small panel with the effect's power switch and full controls; the trash deletes the widget (the effect stays). In the two widget views it is a canvas widget of its own (placed and remembered by the canvas); in the fixed layout it sits on the stage, dragged by its title. Pins are saved in localStorage `musickit.looper.fxWidgets` and dropped when their effect is removed.
- The stage has no zoom of its own and is always drawn at 100%: resizing its widget (or section) or a group shows more or less and never scales the loops, sequencers or text (zoom the whole canvas for that). It scrolls and pans by dragging empty space. The (i) button explains this.
- **Auto layout** (the grid button above the stage): the groups go side by side in their order on the stage (rows of five), each as tall as its cards need (at least a default group; a row shares one height), its loops two by two and its sequencers in rows at its bottom; loops and sequencers outside every group go in a row under the groups. Nothing changes group. One undo step (`arrangeStage` in `layout.ts`, a batch of `group.set`, `loop.move` and `sequencer.move`).

## Live monitoring, input gain and the output device

- "Hear it" plays what the strip sends to the recorder: pre-fader effects, the fader and post-fader effects. (It used to tap before the fader, so post-fader effects and the fader were not heard live.) Muting a strip also silences its monitoring.
- Input gain goes up to 400% (`MAX_INPUT_GAIN`) because an instrument straight from an audio interface is often quiet; the recording level follows the strip gain.
- Looper settings, "Output (master bus)", has "Play through": the audio output for everything (loops, monitoring, metronome, piano), set with `AudioContext.setSinkId` in browsers that have it (Chrome, Edge). The choice is saved in `musickit.looper.output` and restored when the device is still listed. Device names need microphone permission to show, which a connected input gives.

## Canvas layout (widget mode, now the default)

The Mixer and Looping sections sit on a canvas that fills the window below the header. The canvas is much larger than the screen (8000 x 6000), zooms from 15% to 200% (buttons, Ctrl/Cmd and the wheel, trackpad pinch) and pans with the wheel or by dragging empty space (Shift with a drag there selects); the fit button shows every widget and the (i) button explains this. The widget layout button switches back to the stacked page. Layout and view are saved in `musickit.looper.widgets`.

The wheel zoom on the canvas is proportional to the wheel movement (gentle on a trackpad). The metronome bar shows a bell-off button while the click is silenced; pressing it turns the click back on. In the Canvas the **Inputs** list is a widget: the first time it is on show (flag `musickit.looper.inputsWidgetDone`), pinned at the top left under the metronome, so it never moves with the canvas; delete it or add it again from Controls, Inputs list. It has a **Master** mute in its header (the master bus: silences everything you hear except the metronome click; the same mute sits next to the master volume) and lists the played inputs (devices and instruments; not the sequencers) with a level meter, a volume slider, mute and, for each instrument, a button that brings its play window on screen. Its header folds it; each row unfolds to that input's switch options (its output buses and where the output goes). In the widget and in the canvas blocks, "Switch between buses" and "Output goes to" fold on their own, showing what is on while folded; a fold is the same in both places and is remembered (`musickit.looper.folds`).

## Stage size and canvas limits

- The stage is 2400 x 2200 stage units. Loops and sequencers are cards of a fixed size (`CARD_W`, `LOOP_CARD_H`, `SEQ_CARD_H` in `layout.ts`); every placement (defaults, new loops, drops from the diagram, the free strip, auto layout) keeps whole cards apart and inside their group. The default groups (324 x 736, two columns of cards, two rows of loops above a row of sequencers) sit in the first 1812 x 1048 (the part in view at 100%, with a free strip a card tall under them), so the rest is room to grow into. A new group starts at the default group size. In widget mode the stage fills the Looping widget (it scrolls and pans), and the widget can be resized freely. Older saved layouts keep their places.
- Pinned effect widgets show only on the canvas (in the fixed layout they covered the loops; effects are edited from the group, input or master there). On the canvas, widgets can be dragged anywhere (including up and left of the starting point), and a widget that is added later (an input, a bus, a switch, an effect widget) appears in the centre of the screen, on top. The Looping widget is always drawn under the other widgets, and clicks in a dialog opened from it (the group effects) do not raise it. Auto position puts each effect widget under (vertical) or to the right of (horizontal) the widget it belongs to: the Looping stage for a group's effects, else its input, bus or the master; what comes after moves on to make room.

## Mixer sections and widget resizing

- The mixer is three accordions: Inputs, Buses and master, and How it is connected. Each folds away (remembered in `musickit.looper.mixerSections`); in widget mode the open connection diagram takes all the space that is left and scales to fit.
- Canvas selection: Shift and a mouse drag over empty space draws a selection box that adds every widget it touches to the selection; Shift-click on a title adds or removes one; selected widgets get a blue outline. Dragging a selected widget's title moves all of them. Delete or Backspace (not while typing) removes the selected Buses, Switches and Tuners in one undo step and unpins selected effect widgets; Looping, the master and inputs are never removed this way. Escape, a click on empty space or working in an unselected widget lets go. A plain drag on empty space pans, as do the wheel and two-finger scroll.
- Canvas widgets resize from all four corners (the opposite corner stays put; minimum 260 x 140).

Output channels: when the chosen output has more than two channels (an interface such as a Scarlett), Looper settings shows "Output channels" and the whole mix (loops, monitoring, metronome, piano) plays to the chosen pair (1-2, 3-4, ...). The pair is saved in `musickit.looper.output.pair`. Pair 1-2 keeps the plain stereo path. Chrome reports an interface's channel count only after the device is chosen.

"Hear it" now starts on for audio interface inputs (a device strip whose name does not look like a built-in or USB microphone) and off for built-in microphones, which would feed back into the speakers. It can still be switched per strip.

## Later takes, the add button, noise removal
- A later take (armed, then recording) runs to the end of the loop on the next boundary. Pressing its circle while it is armed cancels it (X); once it has started the circle shows a filled dot and the press is ignored, so the take is looped, never thrown away.
- One add button for everything: the round + at the bottom right (every view). Its menu is grouped: Looping (loop, sequencer, drone, group), Sound (input; bus and switch in Canvas), and Controls (Tuner; Effect widget, a list of every effect grouped by owner, to add or delete its widget; in Canvas, Input buses and outputs, each input's "Switch between buses" and "Groups and buses" widgets; and the Inputs list). Loops, sequencers and groups always go on the stage inside the Looping section and a toast says so (`toast.tsx`: short notices at the bottom, three at most, gone after a few seconds). Everything else appears in the centre of the screen.
- Noise removal (`denoise`): hum high-pass, hiss low-pass and a gate built from native nodes (rectifier, smoothing filter, gate curve driving a gain). The audio is delayed 10 ms so the gate opens before a note. Threshold, reduction, smooth (10-120 ms), hum cut, hiss cut. It is a gate and filters, not spectral denoising; verified only by unit test of the curve, not by ear.

## Loop lengths, badges, recording pulse
- A later take is no longer fixed to the first loop's length. Each empty loop has a length menu (badge under the circle): free (default) or 1, 2, 4, 8, 16. For the first loop the numbers are bars (beats when quantising to beats); for later loops they are times the first loop (shown as bars when the first loop is a whole number of bars, else x n). Free: the take runs until stopped and is rounded up to 1, 2, 4, 8 or 16 loops (`lengthMultiple` in `frames.ts`). It always starts on a boundary of the first loop. Action `loop.plan`.
- A recorded loop shows its length (bars or x n). Each loop plays with its own ring (`getChannelPosition`) counted from its own recording start (`origin`), so a x4 loop stays in phase with the first loop.
- Not built: loops shorter than the first loop (1/2, 1/4), and the plan is not saved across reloads. A planned take cannot be stopped early (only cancelled while armed).
- A recording loop shows a pulse, not progress: it swells and shivers with the signal reaching the recorder (`getCaptureLevel`, peak of the recorder chunks).

## Countdown on a loop
While a take waits to start (count-in or next loop boundary) the loop circle shows the beats left in amber. After stop is pressed on a free take, or on a planned take, it shows the beats left until the take ends in red. `getCaptureCountdown(id)`; shown by the loop circle each frame. Not checked in a browser.

## Take status
- While a take waits, the circle counts the beats down to its start; after stop (or on a planned take) it counts the beats down to its end. While recording, under the circle: `bar/total · beat`, for example `3/4 · 2`. A free take heads for the next 1, 2, 4, 8, 16 bars, so it reads 3/4 and then 5/8 (`takeStatus` in `frames.ts`, `getTakeStatus` on the engine).

## New project
- The "New project" button (top bar) asks first, then clears the project from storage (`inputs`, `layout`, `sequencers`, `instruments`, `scalePianos`, `patch`, `fxWidgets`, `widgets`, the canvas layout `board2`, the sequencer and instrument windows, and the flags of the defaults: `rigDone3`, `keysRigDone`, `pianoRigDone2`, `seqRigDone`, `groupPinsDone`) and reloads, so it starts with the defaults again (the canvas laid out Vertical): the guitar, the vocal, the Piano, one Scale Piano, the five named groups with their loops and the sequencers. Settings, macros and amp models are kept. There is no list of saved projects yet.
- The NAM model picker returns the same options array until the library changes (a new array on every read made React loop: error 185).

## Gear: auto-connect, remembered choices, input presets
- `deviceChoice.ts` ranks devices by name: audio interfaces first, the computer's own microphone, speakers, displays and virtual devices last. The last input and output the person chose are saved (`musickit.looper.preferred`), matched by id and then by name (ids can change), and tried first.
- After the engine starts, the output chosen last time comes back if it is still there; nothing is chosen otherwise. If the browser already allows the microphone, the saved input strips reconnect (waiting a few seconds for their devices to show up). Devices are only ever connected for inputs that already exist: no input is added, and no input or output is suggested.
- At the start a "Your devices" dialog lists the detected inputs and outputs. It never closes by itself; the Close button or the Continue button (bottom right) closes it. Inputs that are not connected, whose device is not plugged in, or that failed are shown as amber warnings (`snapshot.gear`, from `gearIssues`). A "Detect devices" button is always there: it asks for access, lists the devices again and connects idle inputs (that is the person's action, so a permission prompt is fine). The inputs column only lists devices and says to add one as an Input with the round + button. Clicking an output card (or "System default") plays everything through it, when the browser can choose an output; otherwise a note says it plays to the system output.
- Adding a hardware input asks what it is (Clean, Guitar, Vocal) and offers preset stacks (`inputPresets.ts`: gate, compressor, EQ, amp model, distortion, delay, reverb as fits). The effects go on the first strip only. Vocal starts with "Hear it" off (a mic near speakers feeds back). "Amp model (NAM)" adds the effect with no model chosen; pick one in it.
- Not verified in a browser: the permission query, device ranking on real names, the dialog. Ranking is by name patterns, so an unusual interface name may not be recognised.

## Startup loader
- While the audio starts (right after the Start click or a key press) a full-page loader shows the output the sound goes to, so nothing can be used half started; it goes away as soon as the engine is ready. A start error is a dialog (with "Try again"). It stays a little longer only while it waits for a remembered interface (see above). Removing the last device input forgets it as the preferred input, so the Connect dialog does not offer it again.
- The metronome bar always shows the click button: a bell when the click is audible, a crossed bell when silenced; it only changes the click, never the beat or quantising.

## Views and connections
- Canvas widgets other than Looping are as tall as their content (`fit` on a board widget): folding a section shrinks the block and opening it grows it; only the width is resized by hand. A canvas with no saved layout (a new project, or the view reset) runs Vertical exactly as Auto position, Vertical does (`start` on the board): placed by the real heights once they are known, then zoomed to show everything; until the person moves something. Vertical and Horizontal leave wide gaps (64 px between widgets, 160 px between rows), and zooming to show everything leaves a 56 px margin round the edge (`fitMargin`).
- The view button in the top bar (a dropdown) chooses how the page looks: **Fixed layout** (everything in its place: the Looping stage on top, the Mixer below it; no floating Inputs panel, since the Mixer lists the inputs) or **Canvas** (freeform: zoom at the pointer with Ctrl/Cmd and the wheel or the buttons, pan with the wheel or by dragging empty space, Shift-drag a box to select and Delete to remove, fit button. No Mixer or Looping sections: the Looping stage (groups with their loops, sequencers), the master bus, every input and each Bus, switch and tuner are widgets you place anywhere, saved in `musickit.looper.board2`. The settings of a group or a sequencer are reached by clicking it, so there are no bus or sequencer strips. Connections are drawn as lines over the widgets, leaving and arriving on whichever sides of two blocks face each other, with an arrow into the target, in the colour of the group they reach. A Bus is a standalone block to connect things and add effects; a Group is a box with loops inside). Saved in `musickit.looper.view` as `fixed` or `canvas`; older saves (`widgets`, `lines`, and the old widget on/off switch) open as Canvas or Fixed. The colour-only Widgets view is gone and `musickit.looper.widgets2` is no longer used.
- Each sound maker has its own colour (`patchView.ts`); a connection carries the colour of the sound maker behind it.
- Make a connection by dragging from a connector on the right edge of an input strip, bus or switch to a group (top half: what its loops record, bottom half: what you hear through its bus and effects), the master, a bus or a switch; the targets light up while you drag and refusals are named. Click a connector (or the arrow of a wire) for the checkbox list of where that block sends: tick a place on or off, or remove it. A switch chooses its outputs on its own card instead. The fixed route of a group into the master is not drawn.
- The round + button in Canvas has Bus, Switch, Tuner and Group. A Bus, a Switch and the rig's blocks are widgets on the board (drag by the title, mute, remove). A switch lists its inputs and outputs as radio rows or checkboxes by its mode; a Bus opens the effects dialog. They stay active in the fixed layout but are only shown in Canvas.
- The connections are the patch (`spec/patch.md`): an input with any connection beyond the plain "can be recorded" wiring is heard and recorded only as drawn.

- Moving a group (not resizing it) carries the loops and sequencers inside it; undo moves them back.

## Default rigs, wires into Looping, devices dialog

- Default guitar rig (the default guitar, a new project, and every Guitar added from Add input): buses inside the guitar's block, one open at a time: Clean sparkle (open at first), one bus per amp model named after the amp (`GUITAR_AMPS` in `rig.ts`: Fender Twin Reverb, Fender Super Reverb, Vox AC15 Top Boost, Marshall JCM800, Marshall JCM2000 Crunch, Mesa Dual Rectifier, 5150 Stealth Red, Mesa Mark IV Lead; each gate, NAM amp, reverb), then Crunch and Lead. Every bus plays straight to the master and records into every group (bus → master; bus → Looping). The rig's **Tuner** stands on its own: it hears the guitar input itself (dry, before any amp) and sends nowhere, so it is never in the way of the sound or the recording. Default vocal rig (`vocalRig`): a bus per vocal preset (Natural open, Radio, Big room), each to the master and into every group. An amp bus's NAM effect carries `amp` (words of the model's file name) instead of a model: when that bus is the open one, the app finds the model in the browser's library or the online library (`nameMatches`, `find` on the `nam-model` choice source), copies it in and sets it without a history entry. Only the chosen amp is downloaded. Not found (no online library, or no file matching): the amp stays empty. Choosing a model by hand ends the search.
- **Tuner** (patch kind `tuner`, `TunerWidget.tsx`): sound passes through unchanged; the widget shows the note, the cents and a needle (pitch detection from the tuner feature: CREPE, a small neural network loaded on first use from `public/models/crepe`, with YIN until it has loaded or when it cannot; read 30 times a second, each reading shown as heard, the needle gliding between them). Muted, it still hears what comes in (links into a muted tuner stay active) but lets nothing out. Muted with the M button (`NodeMute.tsx`), which every Bus, Switch and Tuner block has in the same style and place as an input's M: a 32 px button at the right of the block's first row (a Bus: beside its effects line); a muted tuner says "Muted: tuning in silence" there. Added with the round + button (Widgets, Tuner) in every view; it is wired in Canvas.
- Default piano setup (once, `musickit.looper.pianoRigDone2`, no device needed): one Scale Piano instrument (C major) with four buses inside its block (Dry piano, Room, Hall, Dreamy: reverbs, the last with chorus and tape delay), one open at a time. More instruments can be added any time (Add input: Piano, Scale Piano, Soundboard). An instrument that is patched is heard only through the patch.
- Default sequencers (once, `musickit.looper.seqRigDone`, skipped when sequencers already exist): a drum machine and a bass synth in each of the five default groups, side by side under the loops, each group with its own grooves (Room: Rock and Root pulse, Echo: Four on the floor and Octaves, Wide: Hip-hop and Walk, Lo-fi: Eighth groove and Offbeat, Space: Half-time and Syncopated). They are named after their group (Room drums, Room bass and so on), play through their group's bus and are stopped until started. Removing them sticks.
- Sequencers and loops are not connected by wires: sitting inside a group is enough (they play into its bus; outside every group, the master). They have no connector, and links from them are refused (old saves lose them).
- Wires: only connections that carry sound are drawn; one that is muted, closed by a switch, or leads only into a closed switch output is not drawn at all (it stays in the connector's list). All the links from one block to another are one wire: a connection into any group ends at the **Looping** widget, striped in the colours of every group it reaches (one group: one colour); the connector dot shows the same colours. The Looping widget is always connected to the master bus by one fixed arrow that cannot be selected, muted or removed.
- "Your devices": two columns (inputs, outputs) of device cards with the cleaned-up name and badges (audio interface, built in, virtual, used by an input, in use). Output cards are buttons that switch the output. Input cards are buttons too, for a device whose name gives nothing away (an RC-505 can show up as just "OUT"): the picked device is remembered as the input (`musickit.looper.preferred`), and the main input (the first device strip, the default guitar) switches to it and connects at once (`chooseInput`); a "Guitar" or "Guitar · …" name follows the device, and a default vocal still waiting takes the same device on Input 2. With no device input yet, a guitar input with its rig is added. It stays open until closed. It shows at every start, so also after New project.

- The round **+** button is the only add button (see "Later takes, the add button").
- The on-screen keyboard in the looper plays into a node of its own (not the app's output, which goes straight to the speakers) and is heard only through its Piano strip, so its mute, volume and effects and the master volume and mute apply to it. Before, the master volume did not change it.

## Loop waveform and edits
- Every take keeps up to 1 s of sound before it (the count-in or the end of the previous round, whatever reached the recorder while the take was armed) and 1 s after it (the recorder stays open that long after the take ends, or until the next take starts). `TAKE_MARGIN_SECONDS` in `loopEdit.ts`; the take is `getTake(id)` on the engine. Takes are not saved across reloads.
- The waveform button under a recorded loop opens its editor: the whole take, the loop window in the group colour, the margins dimmed, and a play head. Edits never change the loop's length, so it stays in time:
  - Slide: drag the waveform or nudge by 1 or 10 ms; the window moves within the kept margins (fixes a take that started early or late).
  - Gain (dB) and Normalise (loudest peak to 0.95).
  - Reverse.
  - Fade in, fade out (0 to 1 s).
  - Smooth seam: crossfades the loop end into the sound that came just before its start, so the loop wraps without a click (needs sound before the window).
  - Reset back to the take as recorded. Start, stop and solo are there too, for listening.
- Edits are plain data on the loop (`ChannelInfo.edit`, `LoopEdit`); the playing buffer is always `renderLoop(take, edit)`, so edits are undoable and recordable: action `loop.edit` with only the fields that change. Re-recording or clearing a loop resets its edit.
