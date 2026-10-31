# Learning components: rules

Layout and layers: `README.md`.

- Layers 0 and 2 (`timeline/`, `shapes/`, `cues/`) stay pure: no React, no sound, no `localStorage`. They depend only downward.
- The AI never writes events, frets, strings, derived note names or seconds; components derive them.
- **Add a basic:** `basics/<name>/index.tsx` (View) and `<name>.props.ts` with a `@component` JSDoc and documented props; run `npm run docs:exercises`; add its parse to `TOOLS` in `src/features/plan/model/tools.ts`; add a view in the plan's `ui/ExerciseTool.tsx`; test.
- **Add a shape:** a file in `shapes/` expanding to a timeline, registered in `shapes/index.ts`, documented in `shapes.props.ts`; regenerate docs; parse in the plan registry; test in `shapes.test.ts`.
- Never hand-edit `docs/docs.generated.json`; the freshness test in `docs/extract.test.ts` fails when it is stale.
- Embedded components never write the address bar.
- Every change: tests (cached tsx), `tsc --noEmit`, eslint on this feature.
