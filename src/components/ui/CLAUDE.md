# Design system: rules

The app's shared controls. Use them instead of styling raw elements in a page.

- **Import from `@/components/ui` only.** Each component has its own folder; its `index.ts` is the public API and the other files are private. Lint (`no-restricted-imports` in `eslint.config.mjs`) blocks deep imports from outside, and inside `ui/` a component reaches another through that folder, never a file in it.
- **Levels** (atomic design): `atoms/` one element with one job (Button, Checkbox, Chip, Badge, Tag, Select, Slider, NumberField, InfoButton, InfoBox); `molecules/` a few atoms together (ChipRow, Field, Info, InfoTip, Stepper); `organisms/` self-contained blocks (Section, Modal). Music-specific pieces (DegreeLegend, fretboards) live with their feature, not here: `ui/` imports nothing from `@/features`.
- **New component**: a folder `<level>/<Name>/` with `<Name>.tsx`, any private helpers next to it, and `index.ts` exporting only what callers need; then add one `export *` line to `ui/index.ts`.
- **Select**: never a raw `<select>`. `Select` renders a themed Radix menu with a mouse and the system picker on touch screens (`(pointer: coarse)`), keeps value types (numbers stay numbers), takes `options` and/or `groups`, and `size` 2xs/xs/sm/md/lg. `className` is for layout only (width, flex).
- **NumberField**: a typed number (tempo). Typing edits a draft; the value is clamped and set only on blur or Enter (Escape undoes), so a half-typed "1" never snaps to the minimum.
- **Keyboard**: controls are not tabbable and never keep focus after a click (`NoControlFocus` in the root layout), so the computer keyboard always reaches the piano and shortcuts. Radix pieces must do the same: `tabIndex={-1}` on triggers and no focus return on close.
- **Colours** are theme tokens (slate = neutral, sky = accent), never hex, so every theme restyles them.
- **Colour coding**: a row or grid of many look-alike options gives each its own `Hue` (`hueAt(i)`, or a fixed map when an option should keep its colour), via `Tile` (icon over name), `Chip`'s `hue`, or `hueClass(hue, on)` on a custom button. Keep it off rows where colour already means something (in tune, recording, muted).
- `src/components/controls.ts`, `Modal.tsx`, `Slider.tsx` and `InfoTip.tsx` are deprecated re-exports kept for looper files being edited elsewhere; move those imports to `@/components/ui` and delete the shims.
