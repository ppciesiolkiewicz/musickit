<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Music theory facts: use the calculator

For any fretboard or theory fact in a plan, lesson or exercise (which triads sit in a CAGED box, the chords of a key or mode, scale positions, which keys fit a progression), run `npm run theory -- help` and use its answers instead of working them out by hand. It calls the same chordKit/theory code the app draws with, so frets and boxes match the screen. Examples:

```
npm run -s theory -- triads G --box E --group 321,432
npm run -s theory -- box A minor C
npm run -s theory -- scale D dorian
npm run -s theory -- fit Am F C G
```
