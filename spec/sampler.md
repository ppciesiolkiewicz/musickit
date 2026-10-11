# Sampler

The sound generator of looper instruments (see `spec/looper.md`, Instruments). There is no page of its own any more.

## Library
- **Sample**: audio blob plus `SampleMeta` (name, source `upload` | `elevenlabs`, prompt). One library per browser: IndexedDB `musickit-sampler`, stores `project` (the sample list) and `audio` (blobs by sample id). Instruments saved by the old sampler page are ignored; their samples stay.
- Added from an instrument's sampler settings: Generate (prompt + seconds), upload, or drop files there or on a pad. A file the browser cannot decode is refused with a message and not stored. A new sample goes to the selected pad (Soundboard) or becomes the instrument's sample.
- The sample picker plays, renames and deletes samples. Deleting a sample leaves instruments pointing at it silent, with a warning dot, until another is chosen (the library deletes the audio first, then announces the change; every instrument voice rebuilds on it).

## Playing
- `makeGeneratorVoice` (injected by `LooperApp`) turns an instrument's sound spec into a sample player with a hidden runtime instrument of its own. Pitched: the sample on its root note, other notes tuned by playback rate. Pads: one sample per pad note, `strict` (no tuning from a neighbour; empty pads are silent).
- **Detect** finds the root: YIN over short windows of the first 4 s, the median of the pitched windows, the nearest note; "No clear pitch" when fewer than half the windows are pitched.

## Sources
| Source | Status |
|---|---|
| Upload / drop | works |
| ElevenLabs sound generation | works with the site's key + site password, or a person's own key |
| Splice | not built: no public API known, and its samples are licensed |
| Login with a provider account | not built: no provider is known to offer OAuth for third-party apps. The option is a person's own API key |

The ElevenLabs endpoint, header and 0.5–22 s duration limits are written from memory and not yet tested against the live service.

## Keys and abuse
- Vercel env: `ELEVENLABS_API_KEY` (the site's key) and `SAMPLER_SITE_PASSWORD`. Without the password the site key is never used. The old name `SAMPLER_ACCESS_CODE` still works. One key per provider: `<PROVIDER>_API_KEY`.
- `GET /api/sampler/generate` reports only which providers are usable. `POST` takes `{provider, prompt, seconds}`, headers `x-site-password` or `x-provider-key`.
- Prompts ≤ 300 characters, 20 site-key calls per hour per address per server instance (a brake, not a quota).
- The site password and a person's own keys are kept in `musickit.sampler.settings`; own keys only when "Remember my keys" is ticked.

## Not built
Export/import and cloud persistence across devices (a login and storage; `SamplerStore` is the seam).
