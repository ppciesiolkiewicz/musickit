# Looper: rules for every iteration

The looper is a self-contained feature. Treat it as its own small product that happens to live in this repo. These notes apply to everything in `src/lib/looper/`, `src/components/looper/` and `src/app/looper/`. The behaviour spec is `spec/looper.md`.

## Definitions (the vocabulary of the looper)

Routing: Input → (input effects) → recorder → Loop → Bus (of its Group) → Master bus.
- **Inputs**: hardware (audio interface, USB or built-in mic), software (the on-screen keyboard, the Scale Piano, which plays the computer keys in a chosen key and scale) and sequencers. Every input has a strip with effects (pre or post fader).
- **Routed to master by default.** Sequencers and software inputs are heard on master. Status: "routed to all buses by default" is NOT implemented; a loop or sequencer goes to the bus of the group it sits in, or to master outside every group.
- **Bus**: one per group, with routing (its group), a connection (what feeds it, shown in the Mixer and the Signal flow), effects and a volume. Five groups and so five buses exist by default.
- **Master bus**: everything ends here. Meter and volume are in the Mixer.
- **Plugins / effects**: `effects.ts`; on inputs and buses; each effect is pre-fader or post-fader.
- **Loops**: recorded from the inputs, played into the bus of their group.
- **Loop groups**: coloured boxes on the stage. Sequencers also live on the stage (circles) and can sit in a group. Every group has a start/stop button. Starting and stopping loops and sequencers must stay easy, and always lands on a beat.

## Loop lengths (rule, not built yet)
- A new loop may be 2^n times longer or 2^n times shorter than any other loop (1/4, 1/2, 1, 2, 4 ... times the length of an existing loop), always starting on the grid. Longer loops start when the longest running loop wraps; shorter ones repeat inside it. Status: NOT implemented. Today every later take is exactly one first-loop long, and the loop length is locked by the first take (`loopLength`). When it is built, `frames.ts` holds the maths (with tests), each channel needs its own length, and the position rings and the quantising must follow each loop's own length.

## Keep it separate
- `src/lib/looper/*` (engine, mixer, frames, worklet) imports nothing outside `src/lib/looper`. No `@/lib/audio`, no theory, no React.
- The app injects what the engine needs through options: `getContext` (shared AudioContext) and `getExternalSource` / `externalLabel` (the piano's output bus). Wiring lives only in `LooperApp.tsx`.
- Looper UI lives in `src/components/looper/`. It may use generic shared pieces (`Modal`, `FloatingWindow`, `Piano`) but nothing from chordKit, and no other feature may import from the looper.
- Never edit non-looper files for looper reasons except the single injection point and the nav link.

## Audio and permissions
- Never open the microphone without a person's action. No device strip exists by default. A device strip asks for permission only when it is added in the Add input dialog, when "Detect devices" is pressed, or when a restored strip's "Connect" is pressed. The engine itself starts on the first click or key press and opens no device.
- Raw signal: echo cancellation, noise suppression and auto gain stay off.
- Streams are shared and ref-counted per deviceId; release them when the last strip using them goes. Stop tracks on remove.
- Channel routing: left/right via the splitter, stereo straight through, "sum" via a mono summer. Everything meets in `mixer.output`, which feeds the recorder worklet.
- Latency compensation applies only while a connected device strip is live (not for the keyboard alone). Keep `hasLiveDevice()` honest when adding strip kinds.
- Mute, solo and levels: solo silences every non-solo strip; meters keep working while muted; "Hear it" monitoring never reaches the recording.
- A failing input shows its own error and never stops the others.
- Recorded audio must stay sample-aligned: do not change the worklet chunking or frame maths in `frames.ts` without updating its tests.

## Metronome and quantising
- `metronome.ts` schedules clicks ahead on the AudioContext clock. The click goes to the speakers only, never into the recorder.
- The metronome runs whenever anything runs: a take, a playing loop, a playing sequencer, or the metronome button. If anything else is running, the button only silences or restores the click. The button never starts a loop or sequencer.
- The click runs whenever a take is recording or a loop is playing, and stops otherwise. It can be silenced (`audible`) without losing the beat or the quantising.
- If the grid is already running, a first take has no count-in and starts on the next bar or beat line. Only when nothing runs does it start the metronome with a count-in. The start and stop quantising (bars, beats, off) is a global setting in Looper settings, not in the metronome popover.
- The first take starts on beat 1 after the count-in; its length is rounded to the nearest whole bar or beat (`quantise`), so the loop restarts on the grid. Later takes already start on loop boundaries.
- Tempo and beats per bar are locked while a loop exists or a take is running (the engine ignores those changes). Anything new that depends on tempo (a drum machine, sequencer) must follow the same grid: `gridAnchor` plus `period`.
- Pure maths (units, rounding, beat position) lives in `frames.ts` with tests; keep new timing logic there.

## Sequencers (drum machine)
- `sequencer.ts` is a step sequencer with swappable synthesised instruments (drums by default, bass synth too). No sample files are downloaded: add sounds as oscillator and noise recipes and register them in `INSTRUMENTS`. Pure pattern maths and presets live in `sequencerPattern.ts` with tests.
- There can be several, each with its own pattern, instrument and destination, each with a mixer strip of kind `sequencer` (the strip's `sourceId` is the sequencer id). Destination is automatic: the bus of the group whose box holds the sequencer's circle, or master outside every group. The switch `record` additionally feeds the recorder through the strip. Routing lives in the engine (`routeSequencer`). Start and stop happen on the next beat (`setSequencerPlaying`, `setGroupActive`).
- They play in time with the metronome grid while a take records, a loop plays or the metronome runs, or while previewing. Keep output levels modest so a full kit does not clip the recording.
- The Signal flow panel (`SignalFlow.tsx`) draws inputs (what feeds the recorder), the recorder, the loops and sequencers (the stage), group buses and master from the snapshot. A sequencer sits on the stage and only appears under inputs when it is switched to record. When routing changes, keep that picture true.
- Effect stacks (`EffectStack.tsx`) show pre-fader effects, the fader, then post-fader effects in processing order; `moveEffect` (tested) reorders within a section.

## Looping stage, groups, buses and effects
- The page has two sections: Mixer (inputs) and Looping (loops on a stage). Keep them separate: inputs feed the recorder, loops play back.
- The Signal flow diagram is also a control: drag a loop or sequencer onto a bus (puts it in that group), onto the master (a free spot outside every group; `spotOutside`, the default groups leave a free strip for it) or a sequencer onto the recorder (record). It only calls engine actions, so the mixer and the stage follow from the snapshot.
- Loops are circles with a progress ring. Groups are coloured boxes that can be moved and resized. A loop whose circle centre is inside a group plays through that group's bus (`buses.ts`: input, effect chain, volume, speakers); a loop outside every group plays straight to the speakers. Where groups overlap, the one drawn on top wins. Geometry and its tests are in `layout.ts`.
- Effects (`effects.ts`) are described by `EFFECT_DEFS`; the UI is generated from it. To add one: a def, a case in `createEffect`, a test for any new maths. Saved effect lists go through `sanitiseEffects`.
- Input strips and buses share `effects.ts` and `EffectsModal`. Effects are pre-fader (cut by mute and volume) or post-fader (keep their tail). Add new effects only in `EFFECT_DEFS` and `createEffect`.
- Scale Piano (`scalePiano.ts`): layout maths is pure and tested; the DOM key handling is in `ScalePianoPanel` and only active while its window is open. Keep key codes (`KeyboardEvent.code`) so non-English layouts work.
- The metronome can run on its own (`toggleMetronome`), and the sequencer follows it.

## Actions, history, macros, widgets
- Every user-driven state change goes through `engine.do(action)` (`actions.ts`), never a direct engine setter from a control: that is what makes undo, the history list and macro recording work. New control = new action type (apply, inverse, describe, validate, test). Format and rules: `spec/looper-actions.md`.
- Widget mode (`widgets.ts`, `WidgetBoard.tsx`): sections stay inside the board; keep the layout maths pure and tested.

## State and storage
- Saved strips live in localStorage `musickit.looper.inputs`; other keys: `musickit.looper.layout` (groups, effects, loop positions), `musickit.looper.metronome`, `musickit.looper.sequencers`, `musickit.looper.scalePianos`, `musickit.looper.scalePianoWindow.<id>`, `musickit.looper.sequencerWindow.<id>`, `musickit.looper.midi`, `musickit.looper.keyboard`, `musickit.looper.keyboardWindow`, `musickit.looper.macros`, `musickit.looper.widgets`, `musickit.looper.widgetMode`, `musickit.looper.mixerAlign`, `musickit.looper.historyWindow`, `musickit.looper.macrosWindow`. Wrap every read and write in try/catch, validate on load, and keep old saves loading (add fields with defaults).
- Restored device strips come back disconnected.
- Max 8 inputs (`MAX_INPUTS`).

## UI
- No "start" button, no explanatory walls of text. Short labels, details in popovers or the spec. Use the shared `Icon` component (Lucide icons copied in as SVG, no dependency) rather than emoji. Prefer small icon buttons (with `title` and `aria-label`) over text buttons, and keep rows tight.
- The keyboard window opens only from the keyboard strip in the mixer. It is draggable and resizable (`FloatingWindow`), keyboard-operable, and remembers its place.
- Everything is keyboard reachable with visible focus; buttons that toggle use `aria-pressed`; errors use `role="alert"`.
- Tight side padding; layouts must work at laptop width (13 inch) and phone width.

## Every iteration, before finishing
1. Add or update unit tests for any logic change (`frames.test.ts` and siblings). Run: `npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts` (all must pass).
2. Type check. Without node_modules the stub check is used; otherwise `npx tsc --noEmit` and `npm run lint` must be clean. Fix, never silence, type errors.
3. Update `spec/looper.md` when behaviour, storage keys or permission rules change.
4. Check the engine in a real browser when audio paths change (Chromium with fake media devices: `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`). Real interfaces and MIDI keyboards cannot be tested in CI, so say what was and was not verified.
5. Commit with the required trailers (`Co-Authored-By` and `Claude-Session`), push to `main`, wait about 80 s and confirm Vercel is green: `gh api repos/ppciesiolkiewicz/musickit/commits/main/status --jq '.state'`.
6. Leave nothing uncommitted.
