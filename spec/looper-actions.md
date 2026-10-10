# Looper — actions, history, macros, widgets

Code: `src/lib/looper/actions.ts`, `history.ts`, `macros.ts`, `script.ts` (tests beside them). UI: `HistoryPanel`, `MacroPanel`, top buttons in `LooperApp`. The widget board is the shared `src/features/widgets`.

## Rule
Every user-driven state change goes through `engine.do(action)`. Never call the engine's setters directly from a control, or undo, history and macros will miss it.

## Actions
A `LooperAction` is plain JSON, `{ type, ... }`. Types:
- Loops: `loop.add|removeLast|clear|clearAll|record`, `record.stop`, `loop.volume|mute|solo|rename|move|active`.
- Inputs: `input.add|remove|set` (hardware `device` or the built-in `extra` keyboard; set: name, volume, muted, solo, monitor, mode).
- Drums: `sequencer.add|remove|set|step|playing|move|dest` (set: instrument, preset, rows, clear, cells, bars, dest, x, y).
- Groups: `group.add|remove|set|active`.
- Effects, on a group bus or an input (`target` is `{group: id}` or `{input: id}`): `fx.add|remove|move|param|bypass`. The older `effect.param|bypass|post` are the group-only forms.
- Globals: `master.volume`, `metronome.set`, `transport.set` (legacy `playback.set` and `metronome.toggle` still play/stop), and `batch` (a list of actions as one step).

Creators (`group.add`, `sequencer.add`, `input.add`, `fx.add`) take an optional id. `applyAction` returns the action as really done, with the id filled in, and that form is what the history and macros keep, so a replay uses the same ids. Refused actions (full, missing target) return null and are not recorded. Recording, clearing and `loop.record` run but are not undoable.

- `applyAction(target, action)` applies one. `inverseOf(action, snapshot)` builds the undo action from the state before. `describeAction` gives the history label. `coalesceKey` merges drags. `isAction` validates imported data.
- To add one: extend the union, then `applyAction`, `inverseOf`, `describeAction` and `isAction`, add a test that do-then-undo restores the state, and convert the control to `engine.do`.

## History
`engine.history` (`ActionHistory`): a list and a cursor. `undo`, `redo`, `jumpTo(i)`, `clear`. Doing a new action drops the redo tail. The same coalesce key within 700 ms merges into one line (a slider drag is one undo). Limit 200. Entries of one macro run share a `group` and are undone together. `onEvent` streams `do` (with `source: "ui" | "macro"`), `undo`, `redo`, `reset`.

Shortcuts: Ctrl/Cmd+Z undo, Ctrl+Shift+Z or Ctrl+Y redo (ignored while typing).

Not undoable yet: metronome on/off, effect reordering, input strips, adding or removing loops and groups, recording, clearing.

## Macros
Format (version 1):
```json
{ "version": 1, "id": "m1", "name": "Verse", "createdAt": 0, "duration": 4200,
  "steps": [ { "t": 0, "action": { "type": "loop.mute", "id": "c1", "on": true } } ] }
```
`t` is ms from the start; max 3000 steps. `engine.macroRecorder` records `do` events with `source: "ui"` (macro playback is ignored, so no loops). `playMacro` replays through the history, at the recorded timing, or instantly. Saved in localStorage `musickit.looper.macros`; the panel imports and exports the JSON (`parseMacros`, `serialiseMacros`; invalid steps are dropped).

## Widget mode
Top button toggles `musickit.looper.widgetMode`. Mixer and Looping become widgets on a board: drag by the header, resize from the corner. They can never leave the board (`clampWidget` in `features/widgets/board.ts`, minimum 260×140). Layout and board height in `musickit.looper.widgets`; the reset button restores the default (mixer 42% left, looping right). Mixer alignment (`musickit.looper.mixerAlign`): `rows` or `columns` (strips side by side). History and Macros are floating windows (`musickit.looper.historyWindow`, `musickit.looper.macrosWindow`).

## Scripts and AI
`script.ts`: `ACTION_CATALOG` documents every action with an example; `buildPrompt(snapshot, request)` adds the effects (with ranges), the sequencer sounds and the current ids, for pasting into an AI chat. The reply (a JSON array of actions, `{"actions": [...]}` or `{"steps": [{"t", "action"}]}`, code fences ignored) goes into Macros → Import; `parseScript` checks each action with `isAction` and reports the ones it left out. It becomes a macro that plays as one undoable step.

Example plan: "play drums and low-pass the guitar":
```json
[
  { "type": "input.add", "id": 10, "spec": { "kind": "device", "name": "Guitar", "mode": "left" } },
  { "type": "fx.add", "target": { "input": 10 }, "fx": { "kind": "filter", "id": "lp", "params": { "mode": 0, "cutoff": 900 } } },
  { "type": "sequencer.add", "id": "drums1" },
  { "type": "sequencer.set", "id": "drums1", "patch": { "preset": "rock" } },
  { "type": "sequencer.playing", "id": "drums1", "on": true }
]
```
A device input asks for the microphone when the plan runs, because a person pressed play.

## Effects
`effects.ts`, native Web Audio nodes (they run on the audio thread): tape delay, reverb, filter (low/high pass), distortion, chorus, phaser, tremolo, compressor, EQ. Add one in `DEFS` and `FACTORIES`; the UI and the AI prompt are generated from `DEFS`.
