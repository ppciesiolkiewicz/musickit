# Teacher studio: record a guitar lesson with any theory view on screen

## Intent

Teachers (starting with the site's owner) record lesson videos. Today, showing a chord, a scale position or a drone on camera means juggling other apps. The studio is a **separate app inside Music Kit** at `/teachers/studio`. It's a recording studio where a fixed 16:9 frame holds your camera plus any Music Kit view (chord, scale, position, CAGED shape, circle of fifths, drone…). You bring each view up with a Spotlight-style palette (`/ e6` → Enter), then move and resize it in the frame. You record the lesson in one take, cut out the mistakes on a simple timeline and download the finished MP4.

It takes its ideas from the looper (floating, movable widgets; real audio-interface inputs; amp models) but is its own product. `/teachers` is the start of a teacher-only area that will later sit behind a login.

## Goals

1. **Route and separation.** New app at `/teachers/studio`, with `/teachers` reserved as the teacher area (a login will gate it later; none now). It's built like the looper and creator: its own folder with its own `CLAUDE.md` rules. It uses shared features (`@/features/theory`, `sound`, `instruments`, `nam`, `widgets`, `tuner`, shared `@/components`) and is imported by no other feature.
2. **Studio layout (chosen: "Studio view", OBS-like).** A fixed **16:9 recording frame** in the middle. Anything inside the frame is in the video, and nothing outside it is. Around the frame:
   - Left: a **Layers** list (show/hide, delete, reorder on top/below) and **Scenes** (saved arrangements of layers, switched with one key).
   - Below: the **record bar** (record, pause, stop, mark cut, timer) and **input meters**.
   - Beside the frame: a **Keys panel** listing the shortcuts that work right now. `?` opens the full list.
   - Reference mockup (throwaway): `.superpowers/brainstorm/71778-1792343754/content/stage.html`, option A.
3. **Camera layer.** The webcam is a layer like any other. It fills the frame or sits as a portrait in a corner, with quick keys to switch between those.
4. **Plain screen share.** Share another window or screen into the frame as the background layer, with the camera staying in a corner on top. Widgets can still be added over it.
5. **Spotlight palette.** `/` (also ⌘K) opens a centred search box over the studio. It's never recorded. Typing gives ranked results and Enter puts the chosen widget in the frame, where it can be moved and resized and stays live. Queries it must understand, for example:
   - a chord symbol: `e6`, `cmaj7`, `f#m7b5` → chord diagram, or chord shapes on the neck
   - a scale or mode with a key: `a dorian`, `e minor pent`, `g major` → scale on the fretboard
   - a position or shape: `e minor pent pos 1`, `caged c`, `c triads` → that position on the neck
   - `circle`, `circle g` → circle of fifths
   - `drone e`, `drone a 5th` → starts a drone (an audio layer with a small on-screen badge that can be hidden)
   - `tuner`, `metronome 80`
   - studio commands: `screen share`, `camera corner`, `camera full`, `scene 2`, `clear`
   Every theory view that exists today (the creator's plugins: Scale, Chords, Circle, Keys, Progressions, Modes, Triads, CAGED, Arpeggios, Improv, Tunings) should be reachable from the palette.
6. **Each widget has its own subject.** An E6 chord and an A dorian scale can be on screen together, each following its own chord or key. This differs from the creator, where every plugin follows one shared key.
7. **Audio inputs.**
   - **Voice:** any mic (camera, laptop, or an interface channel).
   - **Guitar DI:** an audio-interface channel through the shared NAM amp model and effects, with presets such as Clean, Crunch and Lead (reuse the looper's starter rig choices).
   - Per input: a level meter, gain and mute. Which channel is voice and which is guitar is remembered, and an audio interface is preferred, as in the looper.
   - Raw signal: echo cancellation, noise suppression and auto gain off.
   - **Monitoring:** the amped guitar is heard live in headphones.
   - The metronome click is never recorded. The drone and any backing sound brought up from the palette are.
   - Interface latency is compensated so picking matches sound on video.
   - No mic or camera prompt without a click.
8. **Recording.** Records the frame's video and the mixed audio in one take. Pause and resume are allowed. Mark-cut (key and button) drops a split marker on the timeline while recording.
9. **Edit.** After stop, the take opens on a simple timeline with a preview, playhead, thumbnail strip and audio waveform. **Split** at the playhead (key `C`), **select and delete** a piece, and the remaining pieces close up. Undo. That's the whole editor.
10. **Export.**
    - **Download MP4** of the edited video with the mixed soundtrack.
    - **Download dry DI** as a WAV of the raw guitar, with the same cuts applied, for re-amping later.
    - Nothing is uploaded.
11. **Keyboard-first.** Every common action has a key, and the Keys panel shows them. Keys use `KeyboardEvent.code` so non-English layouts work, as elsewhere in the repo.

## Non-goals (for now)

- No login, accounts, cloud storage, uploading or publishing. (The route is structured so a teacher login can wrap `/teachers/*` later.)
- No titles, captions, transitions, music beds, zooms or multi-take merging in the editor.
- No vertical (9:16) export in v1, though the frame model shouldn't make it hard later.
- No phone or tablet support. Desktop only.
- No live streaming.

## Anti-goals (failure even if it "works")

- Anything outside the frame (palette, panels, Keys panel, cursor-hover chrome) shows up in the video.
- Audio drifts out of sync with the camera over a 20–30 minute take.
- A long take is lost because the tab ran out of memory or the browser crashed mid-recording.
- Bringing up a view takes more than a few keystrokes, or needs the mouse.
- Editing on camera looks messy: big handles, focus rings or panel chrome flashing over the lesson.

## Live mouse while recording (decided by the user)

The teacher uses the mouse inside the frame during the take. They can add, move and resize widgets, click fretboard notes and chords so they play or light up, and point at things. So:
- The pointer is **visible in the video**. Capture with the cursor shown, plus an optional highlight ring or "laser pointer" around it that viewers can follow.
- Move and resize handles inside the frame are **minimal and appear only on hover**. They are part of the video, so they must look tidy on camera. No focus rings appear on mouse clicks (keyboard focus only).
- Every move and resize can also be done by keyboard (arrow keys nudge, with modifiers to resize).

## Screen share (decided by the user)

The teacher doesn't work in the shared app while recording, so the studio keeps keyboard focus and no floating controls are needed. The shared app's own sound isn't recorded.

## Target machine (decided by the user)

MacBook Pro M3. Use hardware H.264 encoding (WebCodecs/VideoToolbox through Chrome), with a forced keyframe every ~1 s so cuts can be made at keyframes without re-encoding.
- The studio copies code out of the looper or creator instead of sharing it through features.

## Constraints

- **Browser: desktop Chrome and Edge only.** This is my call. Recording uses the browser's ability to capture just one element of the current tab (Element Capture, `restrictTo`, or Region Capture as a fallback), so the frame is recorded exactly as seen while overlays outside it are excluded. Other browsers get a clear "use Chrome or Edge" message. This means the teacher has to approve "share this tab" once per session.
- **Web app, not Electron, for v1 (decided by the user).** Disk access comes from the File System Access API: the teacher picks a folder once (e.g. `~/Movies/Lessons`), the take is saved there as it records, and exports land there too. OPFS is the fallback when no folder is picked. The recording, buffering and export code is a self-contained module with no React or page code, so an Electron wrapper (native ffmpeg, no tab-share prompt) can be added later without a rewrite.
- **Next.js in this repo is a newer version with breaking changes.** Read `node_modules/next/dist/docs/` before writing routes (see `AGENTS.md`).
- **Separation rules** follow the existing features' `CLAUDE.md` files.
  - The looper rule "no other feature may import from the looper" stands. Anything the studio needs from the looper (device listing and choice, input presets/rigs, latency compensation) must first move into a shared feature (e.g. `src/features/audioInput`), and the looper then uses it from there.
  - The creator rule "nothing imports from the creator except its page" also stands. Its plugins need to become reusable theory widgets in a shared place, or gain a per-widget subject (goal 6), before the studio can use them. Moving them is part of this work, and the creator must keep working the same.
- Storage: localStorage for layout, scenes, input choices and palette history, with every read and write in try/catch, as elsewhere. Large media (recording chunks) must not go into localStorage.
- Specs and rules: add `spec/studio.md` (behaviour) and a `CLAUDE.md` for the studio folder, and update `spec/features.md`.

## Decided by the user

- Separate app at `/teachers/studio`, with app separation through shared modules. The teacher-only area comes later.
- Studio view layout (fixed 16:9 frame, controls around it).
- Spotlight-style palette: type, pick, the widget appears in the frame, then move and resize it.
- Plain screen share with the portrait camera in a corner.
- Basic editing: record in one go, cut, join, download.
- Inputs include a DI guitar.
- Export both the mixed video and the dry DI.
- On-screen info showing which keys work.

## My calls (Claude), open to change

- Chrome/Edge-only recording via element capture (see Constraints).
- Starter widget list = every creator plugin + drone + tuner + metronome.
- Scenes exist in v1.
- Monitoring the amped guitar in headphones; drone and backing recorded, click not.
- Export format MP4 (H.264/AAC) for the video and WAV for the dry DI.
- No vertical export in v1.
- **Resolution:** target 1080p export. While recording, the side panels collapse or overlay so the frame takes most of the screen. On a Retina display, element capture at device pixels then gives at least 1080p. If the captured size comes out under 1080p, warn before recording.
- **A/V sync** means audio against the camera picture, not the looper's loop-alignment latency. It's a manual offset (ms) with a one-time clap test to set it. The offset is applied at mux/export time and remembered per camera and interface.
- **What's recorded:** voice, amped guitar, drone, backing, and the sounds widgets make when clicked (chord strums, scale playback), so viewers hear what's shown. The click is not recorded. When another voice mic is chosen, the camera's mic isn't used. Hearing your own voice in the headphones is off by default, with a toggle.
- **Takes:** one current take at a time. It's written in chunks to OPFS/IndexedDB as it records, survives a reload or crash, and can be edited and re-exported later until the teacher discards it or starts a new take (with a confirm). No library of takes in v1.

## Left to the builder

- Exact key bindings (avoid clashes with browser shortcuts; `/`, ⌘K, `C`, `?` as above).
- The palette's query parser and ranking, and how results are grouped.
- The exact muxer and container details (WebCodecs H.264 + AAC into MP4, keyframe every ~1 s, saved to the chosen folder or OPFS). The anti-goals above are the bar.
- Cut accuracy: cutting at keyframes (~1 s) is the default; if that feels too coarse, re-encode only the GOP around each cut.
- Visual design within the site's existing style system.
- What `/teachers` itself shows for now (a minimal landing that links to the studio is fine).
- Build order. A sensible first slice is frame + camera + palette with a few widgets + record + download, then inputs/DI, then the editor, then dry DI export and scenes.
