# Patch canvas (design, stage 1 of 4)

Goal: one canvas where every sound source, effect, bus and loop group is an element, connections are visible lines, and everything is drag and drop. It replaces the Mixer and Looping widgets. Groups stay; a loop must sit inside a group to be connected.

## Model (`src/lib/looper/patch.ts`, done)
- Elements (`PatchKind`): `input` (audio interface or mic), `sequencer`, `piano` (scale piano, standalone), `synth` (sound generator played by MIDI, later), `fx` (an effect chain as its own element), `switch`, `bus` (a group's bus), `loop`, `recorder`, `master`.
- Links go from an element's output to another's input. Loops have no input (they get sound from the recorder) and join a bus by sitting inside its group. Recorder and master have no output.
- Rules (`whyNot`): no self links, no duplicates, no feedback loop (a link that would make sound reach itself is refused).
- Mute: a link or an element can be muted (`activeLinks` leaves them out).
- Switch: takes several inputs and has several outputs. Each side has its own mode: **one at a time** (radio) or **any combination** (checkboxes). A connection a switch has closed is just a muted link, so the switch changes link mutes (`switchChoice`, one undoable batch) and its mode is `patch.switch {id, side, multi}`. A new link on a radio side starts closed when another is open. Old saves (a single open output) keep every input open and only the chosen output. Used for one guitar going to several effect chains.
- `pathTo(from, target)` answers "what is this connected to" over active links; `sanitisePatch` cleans saves; `defaultPatch` builds the graph that equals today's fixed routing, so old saves open unchanged.

## Stages
1. Model and rules, with tests. Done.
2. Engine routes from the patch: connect/disconnect Web Audio nodes from `activeLinks`, actions `patch.connect`, `patch.disconnect`, `patch.mute`, `patch.switch` (undoable, recordable), saved in `musickit.looper.patch`. Default patch reproduces today's sound. Needs a real-browser check of every path (monitor, recorder, buses, master).
3. Canvas UI: vertical elements (effects stacked, then a decorative fader line, the real fader beside the level meter), drag to move, drag from an output to an input to connect, click a line to mute or delete it, groups with loops inside. Replaces `Mixer.tsx`, `LoopStage` and `SignalFlow`.
4. Switch element, effect chains as elements, MIDI keyboard to a `synth` element (sound generator).

Not decided yet: how loops outside a group behave (silent, as stated), and whether the "Hear it" monitor becomes a link from an element to master.

## Stage 2 status (engine)
- Changed from stage 1: there is no global recorder element. Every group has its own recorder (input port `rec`) and a bus (port `bus`); the loops inside a group record what reaches its recorder (`feeds` in `patch.ts`) and play into its bus. A link into a group carries `port: "rec"` or `"bus"`.
- Done: the engine keeps the patch (`musickit.looper.patch`, `syncPatch` adds elements and default links for new inputs, sequencers and groups and drops those whose backing thing is gone); actions `patch.link`, `patch.unlink`, `patch.mute`, `patch.switch` (undoable, recordable); recording is gated per group: only the strips patched into the recording loop's group reach the recorder (`InputMixer.setRecordSources`). Defaults connect every input to every group's recorder, so nothing sounds different until you rewire. A loop outside every group still records all inputs (old behaviour). Sequencer strips are still governed by their own "record" setting.
- Not done: playback follows the patch (sequencers still go to the bus of the group they sit in; buses always go to master), several loops recording at once, the canvas UI, effect chains and switches as elements, MIDI generators. Not tried in a browser.

## Stage 3a status (patch audio and the Patch window)
- `patchAudio.ts` (`PatchGraph`) builds the audio: every connection is a gain node (1 when active, 0 when muted or closed by a switch, ramped over ~15 ms so nothing clicks), effect chains are `EffectChain`s, switches are one gain node, each group has a recorder input gain that opens only while one of its loops records (every one when a loop outside every group records).
- A sound maker is **patched** once it has any link other than the plain input-to-group-recorder wiring (`isPatched`). A patched strip's own recorder gate and "Hear it" stay shut (`InputMixer.setPatched`); what it records and what is heard is exactly what is drawn. Unpatched strips keep the old behaviour. To hear a patched input, connect it to the master or to a group's bus.
- Groups keep their fixed route into the master and sequencers their own routing (`whyNot` refuses a sequencer into a chain or switch, a group into anything but the master, and generators for now).
- Actions: `patch.node` (add an effect chain or switch, caller makes the id), `patch.removeNode` (undo restores node, effects, links, switch choice), `patch.move` (coalesced), effects of a chain through `fx.*` with target `{element}`.
- UI: first a separate Patch window, now replaced by the view menu and `ConnectionLayer.tsx` over the page (see `spec/looper.md`, "Views and connections"): connectors measured from the page elements (`data-patch-id`), chains and switches as floating cards. Positions are laid out once for older saves (`musickit.looper.patch.layout = "2"`).
- Checked in headless Chromium with the real engine and a fake microphone (the window bundled with React, real mouse drags): wires are made by dragging output dot to input dot; input into a chain into a switch with outputs to the master and a group bus; the radio moves the sound between them; muting the chain silences both; adding an effect to a chain through `fx.add {element}` changes the sound; a loop recorded through the patch plays back after the input path is muted. Not checked: real audio interfaces and amp models (NAM) in a chain, touch screens, looks on a phone, undo of every patch action in the browser.
- Still to do: replace the Mixer and Looping widgets with the canvas, vertical box design with the fader line, patched sequencers, MIDI generators, several loops recording at once.

- Starter guitar rig (`rig.ts`, `engine.addRig`, one undoable batch): the input feeds four chains (Clean sparkle, Crunch, Lead, Amp model from the guitar presets), a switch named Sound (inputs: one at a time, outputs: any combination) takes them, and plays to the master and into every group's recorder; the direct input-to-group recorder links are removed so only the rig records. It is offered in the "Connect your gear" dialog for a fresh project when an audio interface is plugged in (Connect adds the interface input and the rig), and in the + widget menu. Not verified with a real Scarlett or a real NAM model.
