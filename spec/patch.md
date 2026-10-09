# Patch canvas (design, stage 1 of 4)

Goal: one canvas where every sound source, effect, bus and loop group is an element, connections are visible lines, and everything is drag and drop. It replaces the Mixer and Looping widgets. Groups stay; a loop must sit inside a group to be connected.

## Model (`src/lib/looper/patch.ts`, done)
- Elements (`PatchKind`): `input` (audio interface or mic), `sequencer`, `piano` (scale piano, standalone), `synth` (sound generator played by MIDI, later), `fx` (an effect chain as its own element), `switch`, `bus` (a group's bus), `loop`, `recorder`, `master`.
- Links go from an element's output to another's input. Loops have no input (they get sound from the recorder) and join a bus by sitting inside its group. Recorder and master have no output.
- Rules (`whyNot`): no self links, no duplicates, no feedback loop (a link that would make sound reach itself is refused).
- Mute: a link or an element can be muted (`activeLinks` leaves them out).
- Switch: one input, several outputs, one open (`selected`). Used for one guitar going to several effect chains.
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
