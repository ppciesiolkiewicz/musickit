# Looper: rules for every iteration

The looper is a self-contained feature. Treat it as its own small product that happens to live in this repo. These notes apply to everything in `src/lib/looper/`, `src/components/looper/` and `src/app/looper/`. The behaviour spec is `spec/looper.md`.

## Keep it separate
- `src/lib/looper/*` (engine, mixer, frames, worklet) imports nothing outside `src/lib/looper`. No `@/lib/audio`, no theory, no React.
- The app injects what the engine needs through options: `getContext` (shared AudioContext) and `getExternalSource` / `externalLabel` (the piano's output bus). Wiring lives only in `LooperApp.tsx`.
- Looper UI lives in `src/components/looper/`. It may use generic shared pieces (`Modal`, `FloatingWindow`, `Piano`) but nothing from chordKit, and no other feature may import from the looper.
- Never edit non-looper files for looper reasons except the single injection point and the nav link.

## Audio and permissions
- Never open the microphone without a person's action. No device strip exists by default. A device strip asks for permission only when it is added in the Add input dialog, when "Detect devices" is pressed, or when a restored strip's "Connect" is pressed. The engine itself starts on the first click or key press and opens no device.
- Raw signal: echo cancellation, noise suppression and auto gain stay off.
- Streams are shared and ref-counted per deviceId; release them when the last strip using them goes. Stop tracks on remove.
- Channel routing: left/right via the splitter, stereo straight through, "sum" via a mono summer. Everything meets in `mixer.output`, which feeds the recorder worklet.
- Latency compensation applies only while a connected device strip is live (not for the keyboard alone). Keep `hasLiveDevice()` honest when adding strip kinds.
- Mute, solo and levels: solo silences every non-solo strip; meters keep working while muted; "Hear it" monitoring never reaches the recording.
- A failing input shows its own error and never stops the others.
- Recorded audio must stay sample-aligned: do not change the worklet chunking or frame maths in `frames.ts` without updating its tests.

## State and storage
- Saved strips live in localStorage `musickit.looper.inputs`; other keys: `musickit.looper.midi`, `musickit.looper.keyboard`, `musickit.looper.keyboardWindow`. Wrap every read and write in try/catch, validate on load, and keep old saves loading (add fields with defaults).
- Restored device strips come back disconnected.
- Max 8 inputs (`MAX_INPUTS`).

## UI
- No "start" button, no explanatory walls of text. Short labels, details in popovers or the spec.
- The keyboard window opens only from the keyboard strip in the mixer. It is draggable and resizable (`FloatingWindow`), keyboard-operable, and remembers its place.
- Everything is keyboard reachable with visible focus; buttons that toggle use `aria-pressed`; errors use `role="alert"`.
- Tight side padding; layouts must work at laptop width (13 inch) and phone width.

## Every iteration, before finishing
1. Add or update unit tests for any logic change (`frames.test.ts` and siblings). Run: `npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts` (all must pass).
2. Type check. Without node_modules the stub check is used; otherwise `npx tsc --noEmit` and `npm run lint` must be clean. Fix, never silence, type errors.
3. Update `spec/looper.md` when behaviour, storage keys or permission rules change.
4. Check the engine in a real browser when audio paths change (Chromium with fake media devices: `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`). Real interfaces and MIDI keyboards cannot be tested in CI, so say what was and was not verified.
5. Commit with the required trailers (`Co-Authored-By` and `Claude-Session`), push to `main`, wait about 80 s and confirm Vercel is green: `gh api repos/ppciesiolkiewicz/musickit/commits/main/status --jq '.state'`.
6. Leave nothing uncommitted.
