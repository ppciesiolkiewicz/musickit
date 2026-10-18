# Teacher studio

`/teachers/studio`. A recording studio for guitar lessons. Design: `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`.

## Now
- **Teacher area:** `/teachers` links to the studio. A login will wrap it later.
- **Browsers:** desktop Chrome and Edge, at least 1024 px wide. Anywhere else the page says "The studio needs desktop Chrome or Edge."
- **Layout:** a 16:9 frame in the middle (exactly what a recording will show), the Layers panel on the left, the Keys panel on the right.
- **Layers:** every widget in the frame, top first. Each row selects its widget and has hide/show, bring forward, send backward and delete.
- **Palette:** `/` or ⌘K opens a search over the page (never in the frame). It understands chords (`e6`), keys (`a dorian`), positions (`e minor pent pos 1`, `c major 3nps box 2`), theory panels (`circle g`, `caged`), the Drone section (`drone`, `drone a dorian`), scale sections (`every chord g`, `same notes`, `sus`, `on guitar`), the Key widget (`key`) and the camera and screen-share commands (below). ↑ ↓ Enter picks, Escape closes. Before anything is typed it lists everything that can go on the stage (recent picks first): the Key widget, the Drone section, every theory panel and scale section in the stage key, a scale position, the camera and screen share.
- **Widgets:** a chord box (click to strum, ‹ › for other shapes), any cheatsheet panel in its own key, a scale position on the neck, the scale page's Drone section (click, drone, drums, bass), scale-page sections, and the Key widget. Each widget keeps its own key; changing the Key widget re-keys every widget except chord boxes.
- **Moving:** drag a widget (from its top strip at once, from anywhere after a few pixels, so clicks still play), resize from its corner dot. The outline and dot show only on hover or when selected.
- **Add a widget:** the one button on the right (`/` or ⌘K) opens the palette. **Keys** (all of them with `?`): `/` or ⌘K add, `C` camera (minimized), `F` fullscreen or minimize the camera, ⇧F the same for the screen share, arrows move (Shift: more), ⌥+arrows resize, ⌫ delete, Esc deselect. None fire while typing in a field.
- **Camera:** a layer like any other: drag, resize, reorder, hide or delete it. The palette offers whichever applies: **Camera** (adds it, minimized), **Fullscreen camera** / **Minimize camera** (whichever it is not now; minimized = the bottom-right portrait corner) and **Close camera**. Hovering the camera shows the same fullscreen/minimize and close buttons in its top-right corner (never recorded). It never opens on its own: the layer shows "Start camera" until clicked (also after a reload). Refused or unplugged, it says "Camera off: click to retry". With more than one camera, a picker shows under the Layers list. Video only; the camera's choice is remembered in `musickit.studio.camera`.
- **Screen share:** **Screen share** asks Chrome for a window or screen and adds it as a layer at the bottom, full frame, shown whole (letterboxed). Then the palette offers **Fullscreen screen share** / **Minimize screen share** (minimized = bottom left) and **Close screen share**, and hovering it shows the same corner buttons. No sound. Stopping it from Chrome's bar or closing or deleting the layer ends it. After a reload the layer asks to share again.
- **Saved:** the stage (layers, their place and size as fractions of the frame, the Key widget's key) is saved in `musickit.studio.stage` and comes back on the next visit.

## Later (see the plans)
Recording into tracks, the editor, video import and overdub, audio inputs and DI, scenes.
