# Teacher studio: rules

The page at `/teachers/studio`: the stage frame, the palette, the Layers and Keys panels, the camera and screen share. Behaviour spec: `spec/studio.md`. Design: `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`. Plans: `docs/superpowers/plans/2026-10-19-teacher-studio-*.md`.

- Imports `@/features/stage`, the creator's `PLUGINS` (for plugin ids) and shared `@/components`. Never the looper. Nothing imports the studio except its page.
- `/teachers` is the teacher area; a login will wrap it later. Keep teacher tools under `src/features/teachers/<tool>`.
- Desktop Chrome/Edge only (`isStudioSupported`); everything else gets the one message.
- Anything that must never be recorded (palette, panels, Keys panel, buttons like "Start camera") lives outside `[data-stage-frame]` or carries `data-chrome`. In-frame handles are thin and show only on hover or selection: they are in the video.
- No camera, mic or screen prompt without a click.
- localStorage keys start with `musickit.studio.`; every read and write in try/catch, loads sanitised.
- Shortcuts match `KeyboardEvent.code` and never fire while typing in a field.
- Type check and lint before every commit; update `spec/studio.md`.
