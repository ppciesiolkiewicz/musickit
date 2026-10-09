# Creator: rules

The creator is music theory as plugins on a board, all following one key that can also be empty. Behaviour spec: `spec/creator.md`.

## Keep it separate
- Imports only `@/features/theory` (key contexts, modes, chords, progressions), `@/features/sound` (playing notes), `@/features/widgets` (the board) and the shared `@/components` (Icon, ui, PageShell). Never `src/lib/looper`, `src/components/looper`, `src/lib/chordKit` or `src/components/chordKit` (guitar), or the instruments. Nothing imports from the creator except its page.
- Music theory goes in `features/theory`, not here. If a plugin needs a fact the theory feature does not have, add it there with a test. What stays here is the creator's own choice (`model/key.ts`), how things are voiced for playing (`model/voicing.ts`), and the general (no key) content (`model/generic.ts`).

## The key
- One `KeyChoice` (`tonicPc | null`, family, mode) in `KeyProvider`, read with `useCreatorKey()`. It restores from `?key=&family=&mode=` and then `musickit.creator.key`.
- Every plugin must work with no key: `ctx === null` shows the plugin's general page (labelled "general"), never an empty panel or an error. A plugin may also change the key (the circle of fifths picks one).

## Plugins
- A plugin is a component with no props in `plugins/`, listed in `plugins/registry.tsx`. It reads the key from the hook and nothing else from the page. Sound only through `@/features/sound`.
- It must fit any size the board gives it (the widget scrolls) and stay keyboard reachable.
- Open plugins are in `musickit.creator.plugins`, the board layout and height in `musickit.creator.board`.

## Every change
1. Pure logic (`model/`) has tests; run `npx tsx --test src/features/*/*.test.ts src/features/*/*/*.test.ts`.
2. Type check (stub check without node_modules, otherwise `tsc --noEmit` and lint).
3. Update `spec/creator.md`. Push to `main`, wait about 85 s, check Vercel.
