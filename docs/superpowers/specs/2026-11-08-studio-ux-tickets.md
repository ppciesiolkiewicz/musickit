# Notes generator and video studio: UX tickets

Date: 2026-11-08. The notes generator is the creator at `/cheatsheet`; the video studio is `/teachers/studio`. Both use the stage's
widgets (`src/features/stage`) and one palette (`src/features/teachers/studio/Palette.tsx`). Purpose: teachers share notes and put
theory on screen quickly. Ticket 1 has its own design: `2026-11-08-studio-widget-families-design.md`.

Order is the suggested build order. Each ticket is independent after 1.

1. **Widget families in the spotlight** (designed). One palette entry per family (Pentatonic, Scale positions, 3 notes per string,
   CAGED); picking it shows its options in the same spotlight; "Add another" on families that repeat; existing widgets listed with
   key and props in the name and props in an accordion. CAGED works like pentatonic. Covers the "3 notes per scale" setup.
2. **Small fixes.** Remove Progressions from the palette and cheatsheet list. New Text widget with free text. Labels: "Scale notes"
   → "Intervals within each mode"; "Modes with the same notes" → "Relative modes"; "Fretboard positions" → "Fretboard".
3. **Beta notice.** Disclaimer that this is a beta, with how to scroll and how to add a widget. Closes itself after a few seconds;
   "Don't show this again" (localStorage `musickit.studio.beta`). Copy via the ux-copy skill.
4. **Minimap.** Small map in a corner of the canvas showing every widget and the visible viewport, so off-screen widgets are findable.
   Chrome only (`data-chrome`), never recorded.
5. **Layout.** Free drag-and-drop is the default; an auto-layout mode is the alternative. A new widget lands mid-screen, or at the
   bottom when the bottom is on screen. Widgets drag between slots in auto-layout.
6. **Arpeggios on the fretboard.** Replace the current arpeggio view with the `arpeggio-neck` learning component (needs ticket 1).
7. **Tool audit and plan.** Research ticket: go through each tool/plugin, list what is weak or missing, produce the plan for a useful
   set. Start from the learning components not offered in ticket 1 (melody-singer, run-singer, interval-singer, interval-ears, note-finder, tuning-ears, click-drone, backing-band, strum-along, chord-backing, drills). Includes embedding melodies and singing (the `melody` subject exists but is video-only) and any shared components on other pages that
   must change to make this work.
8. **Inline key/scale selector.** Move the per-widget key/scale picker from a framed control into the widget's own header; same
   behaviour (`pinned`, `withOwnKey`, `followMaster`).
9. **Key regions (replaces the master key widget).** Maybe drop the Key & scale master, or make it a region on the canvas: any widget
   inside it, even partly, takes the region's key; dragging a widget out restores its own key. Needs layout (ticket 5) first and a
   change to `withMaster`/`followMaster`/`pinned`. Design separately.
