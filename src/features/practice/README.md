# Practice

`/practice`: every tool, drill and lesson page as a wall of flat tiles (Windows Phone style). It is the app's third
place, after Plan and Notes (the nav, `src/components/SiteNav.tsx`). Design:
`docs/superpowers/specs/2026-11-14-autoplan-centre-design.md`.

- `tiles.ts`: `practiceTiles()` groups `THEORY_SECTIONS` (`src/features/theory/sections.ts`) into Guitar, Singing,
  Play along, Tuning & theory and Learn. The plan and the notes creator are left out (they are in the nav). A page added
  to `THEORY_SECTIONS` gets a tile with no change here; `wide: true` there makes its tile wide.
- `PracticeTiles.tsx`: the tiles. One solid colour per tile from the page's `tone`, the icon at the top, the name at the
  bottom; a wide tile adds its `desc`.
