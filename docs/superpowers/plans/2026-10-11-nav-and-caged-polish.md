# Nav, page padding and CAGED polish: one work list

Feedback from 2026-10-11, checked against the code. Six tasks, each small and separate. Do them in order (1–2 touch routing and the nav, 3–6 the CAGED page).

## 1. Nav: theory articles left, cheatsheet + looper right

File: `src/components/SiteNav.tsx`

Today: `SITE_LINKS` = Home, Looper, Theory, Tuner, then the theme switcher pushed right (`ml-auto`). Theory pages get a second row from `THEORY_LINKS`, which ends with "Cheatsheet builder".

Change:
- Left group: Home, **Theory articles** (was "Theory", still `/theory`), Tuner.
- Right group (after a spacer): **Cheatsheet** (link to the new route, task 2), then **Looper** with a visible border (e.g. `border border-sky-500/60`, filled when current), then the theme switcher.
- Remove "Cheatsheet builder" from `THEORY_LINKS`. `/theory` redirects to `THEORY_LINKS[0]`, which stays Chords.
- Split the links into `SITE_LINKS` (left) and `SITE_ACTIONS` or similar (right) so the order is data, not markup.
- Note: the looper page (`src/app/looper/page.tsx`) does not render `SiteNav` at all. Nothing changes there; the border is for when you reach it from other pages.

## 2. Creator out of /theory, full width like the looper

The "creator" is the cheatsheet builder (`src/features/creator`, page `src/app/theory/cheatsheet/page.tsx`).

- New route `src/app/cheatsheet/page.tsx` (same content, `active="/cheatsheet"`).
- `src/app/theory/cheatsheet/page.tsx` becomes a redirect to `/cheatsheet` that keeps the query string (`?key=&family=&mode=`). Copy the pattern from `src/app/creator/page.tsx`, which then also points to `/cheatsheet`.
- Padding: `PageShell` (`src/components/PageShell.tsx`) gives every page `max-w-[96rem] px-3 sm:px-5`. Add a `bleed` prop: the nav and header keep their padding, `<main>` goes edge to edge with no max width. Use it only on `/cheatsheet`. Theory pages and the tuner keep the padded shell. The looper already has its own full-bleed layout.
- Update links: home page tool card (`src/app/page.tsx`, "Cheatsheet builder" → `/cheatsheet`), `src/features/creator/CLAUDE.md` (says it lives at `/theory/cheatsheet`), and `spec/creator.md`, `spec/architecture.md`, `spec/guitar-tools.md`, `spec/README.md`, `spec/looper.md` wherever they name the route or the nav.

## 3. CAGED box sections: more contrast, title clearly owns its section

Files: `src/components/ui.tsx` (`Section`), `src/components/chordKit/CagedExplorer.tsx` (`BoxCard`)

Today the level-1 `Section` is `border-slate-800 bg-slate-900/40` and the four panels inside are `border-slate-800 bg-slate-950/50`, so section, panels and page background are nearly the same tone (screenshot 1). The heading is a plain `text-sm` row and reads as loosely floating above the panels.

Change, in `BoxCard` only (other pages use `Section` too, so pass a class or add a `tone` prop instead of changing the default):
- Section frame tinted by its lane colour: left border 3–4px in `LANE_COLOURS[index]` and a stronger border/background step than the inner panels (e.g. section `bg-slate-900/70 border-slate-700`, panels stay `bg-slate-950/60`).
- Header as a band attached to the box: slightly larger title (`text-base`), its own background strip with a bottom border, the letter chip already there. Frets meta and (i) stay right.
- Check in all five themes (dark, light, funky, modern, sandstorm); the slate scale flips in light/sandstorm.

## 4. Note bubbles in light themes

Files: `src/components/chordKit/CagedExplorer.tsx` (`NotesTable`, `Overview`), also `ScalePage.tsx`, `ScalesIndex.tsx`, `ModeCompare.tsx`, `src/features/creator/plugins/ScalePlugin.tsx` (same pattern).

Cause: bubbles use fixed degree colours (`DEGREE_COLOURS` in `src/features/theory/scales.ts`) but `text-slate-950` for the label. In light and sandstorm, `--color-slate-950` is ~98% lightness, so labels turn white on yellow/green/teal, and the root (degree colour `#f1f5f9`, near white) shows a white label on a white dot: unreadable (screenshot 2). The root ring is `ring-white`, also invisible on a light page.

Change:
- Label ink fixed dark on coloured dots, the same as `BoxNeck` already does (`fill="#0d1526"`). Use one shared constant (e.g. `DOT_INK` next to `DEGREE_COLOURS`) instead of `text-slate-950`.
- Root ring and outline: use a theme token so it is white on dark themes and dark on light ones (`ring-slate-100` already flips that way; `BoxNeck` root stroke `#ffffff` and its legend swatch need the same).
- Light themes only: check that the paler degree colours (lime `#a3e635`, amber `#fbbf24`) still separate from the cream/blue page; add an outline if not.

## 5. Whole-neck overview colouring (CAGED "five boxes" map)

File: `src/components/chordKit/CagedExplorer.tsx`, `Overview` → `fillFor`.

Wanted (per string, independently): note 1 → colour 1, note 2 → colour 2, and so on, along each string.

Today: each string is split at the **midpoint between neighbouring notes**, so a note's colour spreads half way to each neighbour. Because strings hold different numbers of chord tones (e.g. top/low E have 5 in frets 0–17, B and A have 4), the fifth colour only appears on some strings, the boundaries zig-zag mid-fret, and the bands don't line up with the shape labels above (which are an average of those midpoints). Fill alpha is also `42` (~26%), so in sandstorm/light the blue lane looks grey.

Change:
- Boundaries at the notes, not between them: on each string, the section from note k up to (not including) note k+1 is colour k; frets before the first note are colour 1 as well. A fret holding a note is that note's colour. Drop the half/half split cell.
- Recompute the label spans from the same boundaries (or place each label over the median start of its section across strings) so text sits over its colour.
- Raise the fill alpha on light themes (or use a theme token) so all five lanes read as their colour.
- Pull `fillFor` into a pure function in `src/lib/chordKit/caged.ts` with a test (strings with 4 vs 5 notes, open-string note, note on fret 0).

Decided (2026-10-11): colour k *starts at* note k and runs until the next note. It is not centred on note k, which is today's behaviour.

## 6. Fret spacing inside the small diagrams

Files: `src/components/chordKit/Fretboard.tsx` (`fretWidthFactor`), `VerticalFretboard.tsx` (`vGeometry`, used by `BoxNeck`), `ChordDiagram.tsx`.

Today every diagram uses the absolute-neck factor `1.41 · 2^(-(f-1)/12)`, clamped at 0.7. A box at frets 9–13 is all ~0.75–0.9 rows, so high boxes look squashed (screenshot 4) and the rows barely shrink within one box.

Change: in the small diagrams, size rows by **position inside the diagram**, not position on the neck.
- New `boxRowFactor(i)` with `i = f - from`: first row large and a steeper drop, e.g. `1.3 · 0.9^i` (5 rows: 1.30, 1.17, 1.05, 0.95, 0.85). So fret 14 as the first row of a box is wider than fret 14 as the last row of another box, as asked.
- Use it in `vGeometry` (BoxNeck) and `ChordDiagram`. Keep `fretWidthFactor` for the whole-neck views (`Overview`, `NeckDiagram`), which show the real neck.
- Check the open/nut row (fret 0) and that dots (r = 14) still fit the smallest row.

## Every change
- `npx tsx --test src/features/*/*.test.ts src/features/*/*/*.test.ts` plus any new `lib/chordKit` test.
- `tsc --noEmit` and lint.
- Look at `/theory/caged`, `/cheatsheet` and the nav in dark, light and sandstorm.
- Update the specs listed in task 2. Push to `main`, wait ~85 s, check Vercel.
- Leave the unrelated uncommitted widget-board/looper changes in the tree alone.
