# Sampler

A dev tool at `/dev/sampler` (`SamplerLab`): a sample library in the browser. Nothing else in the app uses it; the looper's instruments play the built-in sounds only (see `spec/looper.md`, Instruments).

## Library
- **Sample**: audio blob plus `SampleMeta` (name, source `upload` | `elevenlabs`, prompt). One library per browser: IndexedDB `musickit-sampler`, stores `project` (the sample list) and `audio` (blobs by sample id). Instruments saved by the old sampler page are ignored; their samples stay.
- Added by Generate (prompt + seconds), upload, or files dropped on the list. A file the browser cannot decode is refused with a message and not stored.
- Each sample can be played, renamed, deleted, and its note found: YIN over short windows of the first 4 s, the median of the pitched windows, the nearest note; "No clear pitch" when fewer than half the windows are pitched.

## Sources
| Source | Status |
|---|---|
| Upload / drop | works |
| ElevenLabs sound generation | works in development with the server's `ELEVENLABS_API_KEY` |

## Server
- `GET /api/dev/sampler` reports which providers have a key. `POST` takes `{provider, prompt, seconds}` and returns the audio. Both answer 404 in a production build (`devGate`).
- Prompts ≤ 300 characters; seconds clamped to the provider's range (ElevenLabs 0.5–22 s).
