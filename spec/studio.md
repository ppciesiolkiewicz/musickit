# Teacher studio

`/teachers/studio`. A recording studio for guitar lessons. Design: `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`.

## Now
- **Teacher area:** `/teachers` links to the studio. A login will wrap it later.
- **Browsers:** desktop Chrome and Edge, at least 1024 px wide. Anywhere else the page says "The studio needs desktop Chrome or Edge."
- **Layout:** a 16:9 frame in the middle (exactly what a recording will show), the Layers panel on the left, the Keys panel on the right.
- **Layers:** every widget in the frame, top first. Each row selects its widget and has hide/show, bring forward, send backward and delete.
- **Saved:** the stage (layers, their place and size as fractions of the frame, the Key widget's key) is saved in `musickit.studio.stage` and comes back on the next visit.

## Later (see the plans)
Recording into tracks, the editor, video import and overdub, audio inputs and DI, scenes.
