# Looper — actions, history, macros, widgets

Code: `src/lib/looper/actions.ts`, `history.ts`, `macros.ts`, `widgets.ts` (tests beside them). UI: `HistoryPanel`, `MacroPanel`, `WidgetBoard`, top buttons in `LooperApp`.

## Rule
Every user-driven state change goes through `engine.do(action)`. Never call the engine's setters directly from a control, or undo, history and macros will miss it.

## Actions
A `LooperAction` is plain JSON, `{ type, ... }`. Types: `loop.volume|mute|solo|rename|move|active`, `group.set|active`, `master.volume`, `metronome.set`, `playback.set`, `effect.param|bypass|post`, `sequencer.move|playing|dest`, `batch` (a list of actions as one).

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
Top button toggles `musickit.looper.widgetMode`. Mixer and Looping become widgets on a board: drag by the header, resize from the corner. They can never leave the board (`clampWidget`, minimum 260×140). Layout in `musickit.looper.widgets`; the reset button restores the default (mixer 42% left, looping right). Mixer alignment (`musickit.looper.mixerAlign`): `rows` or `columns` (strips side by side). History and Macros are floating windows (`musickit.looper.historyWindow`, `musickit.looper.macrosWindow`).
