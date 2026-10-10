# Music Kit — Looper

A multi-channel audio looper at `/looper`. The engine lives in `src/lib/looper/` and imports nothing outside it. The app hands it extras through `LooperOptions` (a shared `AudioContext` and an extra source node, which is the piano's output bus). The UI is in `src/components/looper/`. The only shared piece is the top navigation (`src/components/SiteNav.tsx`).

## Vocabulary

- **Inputs**: sound makers that feed the rest: an audio device (interface, mic) or the keyboard. Effects belong to an input.
- **Sequencers**: step sequencers (drums, bass). Each is a circle on the stage and a widget of its own settings.
- **Buses**: anything sound is sent to and leaves from, with effects and a mute. Two kinds: a **Bus** is a standalone block you connect things to and add effects (the old "effect chain"); a **Group** is a special bus that also holds loops inside (a coloured box on the stage, with a recorder for its loops). The **master bus** is the last bus, bundled with the buses in the Widgets view.
- **Switch**: takes several inputs and outputs; each side is "one at a time" or "any combination".
- Effects are never blocks of their own: they sit on an input or a bus.

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

The Mixer section lists the inputs, then the buses (one per group, five by default, with the master bus last). A bus row shows its colour, name, how many loops and sequencers feed it, a level meter, volume, mute and a + button. The master row has a meter and a volume. Below is the Signal flow diagram, open by default.

Every input, sequencer and bus has a + after its fader marker in the effect stack that opens an effects dialog: the dialog has a Before-fader section, the fader, and an After-fader section, each with its own + to add an effect. An arrow button moves an effect to the other side (pre: cut by mute and volume; post: keeps ringing, so a reverb tail survives a mute). Settings fold away; bypass or remove from the card. Effects are saved with the strip or group.

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

## Page chrome

The looper page has no site navigation. The top row holds the metronome on the left and, on the right, the settings cog and an x that returns to the home page. Page padding is minimal. The home page lists every tool as a card with a piano underneath.

## Stage zoom

The looping stage is drawn at a fixed size and scaled as a whole (circles, groups and text together). It fits the page width by default; the − and + buttons zoom (40% to 250%), the middle button returns to fit, and the area scrolls when it is larger than the page. The looper page uses the full width with small margins.

## Actions, history, macros, widgets
Undo/redo, a history list, recordable macros and a movable/resizable widget layout. See `spec/looper-actions.md`. All user changes go through `engine.do`: inputs, drums, groups, loops, effects (ten kinds, incl. filter, distortion, chorus, phaser, tremolo, compressor, EQ and the NAM amp model), so a macro or an AI script can build a whole setup.

## Amp model (NAM) effect

A tenth effect kind, `nam`, runs Neural Amp Modeler models (`.nam`, including A2) on a guitar input. The effect is injected by `LooperApp` (`setNamFactory`, `registerChoice("nam-model")`); the looper itself does not import the feature, and the effect passes the signal through until a model is chosen. The model is a numeric library id in the `model` parameter, so actions, undo, macros and AI scripts need no new action type. In the effects dialog the Model row is a picker with an add button; `.nam` files can also be dropped on the row. Parameters: input and output gain (dB), noise gate (-90 = off), level match, size (for slimmable models), mix. Details: `spec/nam.md`.

## Master bus effects, effect widgets and the stage canvas

- The master bus is the global output. Its chain is: everything -> pre-fader effects -> master fader -> post-fader effects -> speakers and meter. The same controls (level, volume, effects button) are in the mixer's Master row and in Looper settings under "Output (master bus)". Master effects are actions (`fx.*` with target `{ master: true }`), so undo, macros and AI scripts cover them, and they are saved in the layout (`masterEffects`).
- Any effect (on an input, a bus or the master) can be pinned to the stage as a widget with the dashboard button on its card in the effects dialog. A widget is a small panel with the effect's full controls, placed to the right of the stage; drag its title to move it, the x removes the widget (the effect stays). Pins are saved in localStorage `musickit.looper.fxWidgets` and dropped when their effect is removed.
- The stage has no zoom of its own: it fits the width of its widget (resize the widget, or zoom the whole canvas), scrolls, and pans by dragging empty space. Pinned effect widgets sit to the right of the stage, reached by scrolling. The (i) button explains this.

## Live monitoring, input gain and the output device

- "Hear it" plays what the strip sends to the recorder: pre-fader effects, the fader and post-fader effects. (It used to tap before the fader, so post-fader effects and the fader were not heard live.) Muting a strip also silences its monitoring.
- Input gain goes up to 400% (`MAX_INPUT_GAIN`) because an instrument straight from an audio interface is often quiet; the recording level follows the strip gain.
- Looper settings, "Output (master bus)", has "Play through": the audio output for everything (loops, monitoring, metronome, piano), set with `AudioContext.setSinkId` in browsers that have it (Chrome, Edge). The choice is saved in `musickit.looper.output` and restored when the device is still listed. Device names need microphone permission to show, which a connected input gives.

## Canvas layout (widget mode, now the default)

The Mixer and Looping sections sit on a canvas that fills the window below the header. The canvas is much larger than the screen (8000 x 6000), zooms from 15% to 200% (buttons, Ctrl/Cmd and the wheel, trackpad pinch) and pans with the wheel or by dragging empty space; the fit button shows every widget and the (i) button explains this. The widget layout button switches back to the stacked page. Layout and view are saved in `musickit.looper.widgets`.

The wheel zoom on the canvas is proportional to the wheel movement (gentle on a trackpad). The metronome bar shows a bell-off button while the click is silenced; pressing it turns the click back on.

## Stage size and canvas limits

- The stage is 2000 x 1200 stage units; the default groups sit in the first 1000 x 460 (the part in view at 100%), so the rest is room to grow into. In widget mode the stage fills the Looping widget (it scrolls and pans), and the widget can be resized freely. Older saved layouts keep their places.
- Pinned effect widgets can sit anywhere on the stage; a new one appears at the visible corner. On the canvas, widgets can be dragged anywhere (including up and left of the starting point), and a widget that is added later appears where you are looking.

## Mixer sections and widget resizing

- The mixer is three accordions: Inputs, Buses and master, and How it is connected. Each folds away (remembered in `musickit.looper.mixerSections`); in widget mode the open connection diagram takes all the space that is left and scales to fit.
- Canvas widgets resize from all four corners (the opposite corner stays put; minimum 260 x 140). The stage scales up to 4x so a large Looping widget is filled by the stage.

Output channels: when the chosen output has more than two channels (an interface such as a Scarlett), Looper settings shows "Output channels" and the whole mix (loops, monitoring, metronome, piano) plays to the chosen pair (1-2, 3-4, ...). The pair is saved in `musickit.looper.output.pair`. Pair 1-2 keeps the plain stereo path. Chrome reports an interface's channel count only after the device is chosen.

"Hear it" now starts on for audio interface inputs (a device strip whose name does not look like a built-in or USB microphone) and off for built-in microphones, which would feed back into the speakers. It can still be switched per strip.

## Later takes, "+ widget" menu, noise removal
- A later take (armed, then recording) runs to the end of the loop on the next boundary. Pressing its circle while it is armed cancels it (X); once it has started the circle shows a filled dot and the press is ignored, so the take is looped, never thrown away.
- The Looping toolbar has one "+ widget" button. Its menu adds a loop or a group, opens an "Effect widget" list (pin or unpin any existing input, group or master effect on the stage) and removes the last empty loop. The Mixer's add button reads "+ instrument or bus".
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
- The "New project" button (top bar) asks first, then clears the project from storage (`inputs`, `layout`, `sequencers`, `scalePianos`, `patch`, `fxWidgets`, `widgets`, and the sequencer and scale piano windows) and reloads. Settings, macros and amp models are kept. There is no list of saved projects yet.
- The NAM model picker returns the same options array until the library changes (a new array on every read made React loop: error 185).

## Gear: auto-connect, remembered choices, input presets
- `deviceChoice.ts` ranks devices by name: audio interfaces first, the computer's own microphone, speakers, displays and virtual devices last. The last input and output the person chose are saved (`musickit.looper.preferred`), matched by id and then by name (ids can change), and tried first.
- After the engine starts, the output chosen last time comes back if it is still there; nothing is chosen otherwise. If the browser already allows the microphone, the saved input strips reconnect (waiting a few seconds for their devices to show up). Devices are only ever connected for inputs that already exist: no input is added, and no input or output is suggested.
- At the start a "Your devices" dialog lists the detected inputs and outputs. It never closes by itself; the Close button closes it. Inputs that are not connected, whose device is not plugged in, or that failed are shown as amber warnings (`snapshot.gear`, from `gearIssues`). A button connects idle inputs, or detects devices when none are listed (that is the person's action, so a permission prompt is fine).
- Adding a hardware input asks what it is (Clean, Guitar, Vocal) and offers preset stacks (`inputPresets.ts`: gate, compressor, EQ, amp model, distortion, delay, reverb as fits). The effects go on the first strip only. Vocal starts with "Hear it" off (a mic near speakers feeds back). "Amp model (NAM)" adds the effect with no model chosen; pick one in it.
- Not verified in a browser: the permission query, device ranking on real names, the dialog. Ranking is by name patterns, so an unusual interface name may not be recognised.

## Startup loader
- While the audio starts (right after the first click or key press) a small pill at the top shows the output the sound goes to; it goes away as soon as the engine is ready and never blocks the page. Only a start error is a dialog (with "Try again"). It stays a little longer only while it waits for a remembered interface (see above). Removing the last device input forgets it as the preferred input, so the Connect dialog does not offer it again.
- The metronome bar always shows the click button: a bell when the click is audible, a crossed bell when silenced; it only changes the click, never the beat or quantising.

## Views and connections
- The view button in the top bar (a dropdown) chooses how the page looks: **Fixed layout** (everything in its place), **Widgets** (drag and resize four independent widgets: Looping, Inputs, Sequencers and Buses (groups and the master bus together), saved in `musickit.looper.widgets2`; the signal-flow diagram is not shown here; every connection is shown as a coloured connector: a ring or dot on the right edge of each sound maker, Bus and switch, and coloured tabs on the left edge of a group, the master or a card for each connection arriving), **Widgets with wires** (freeform, on the same board as Widgets: zoom at the pointer with Ctrl/Cmd and the wheel or the buttons, pan with the wheel or by dragging empty space, fit button. No Mixer or Looping sections: the Looping stage (groups with their loops, sequencers), the master bus, every input and each Bus and switch are widgets you place anywhere, saved in `musickit.looper.board2`. The settings of a group or a sequencer are reached by clicking it, so there are no bus or sequencer strips. Connections are drawn as lines over the widgets, leaving and arriving on whichever sides of two blocks face each other, with an arrow into the target, in the colour of the group they reach. A Bus is a standalone block to connect things and add effects; a Group is a box with loops inside). Saved in `musickit.looper.view` (older saves of the widget on/off switch map to widgets or fixed).
- Each sound maker has its own colour (`patchView.ts`); a connection carries the colour of the sound maker behind it.
- Make a connection by dragging from a connector on the right edge of an input strip, bus or switch to a group (top half: what its loops record, bottom half: what you hear through its bus and effects), the master, a bus or a switch; the targets light up while you drag and refusals are named. Click a tab or a wire to mute or remove it. The fixed route of a group into the master is not drawn.
- "+ widget" in Widgets with wires has Switch, Guitar rig, Bus and Group. A Bus, a Switch and the rig's blocks are widgets on the board (drag by the title, mute, remove). A switch lists its inputs and outputs as radio rows or checkboxes by its mode; a Bus opens the effects dialog. They stay active in the fixed layout but are only shown in Widgets with wires.
- The connections are the patch (`spec/patch.md`): an input with any connection beyond the plain "can be recorded" wiring is heard and recorded only as drawn.

- Moving a group (not resizing it) carries the loops and sequencers inside it; undo moves them back.
