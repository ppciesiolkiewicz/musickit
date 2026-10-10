# Sampler

Page `/theory/sampler`. Builds instruments from samples and makes them available in every instrument picker (`useInstrumentOptions`).

## Model
- **Sample**: audio blob in the store plus `SampleMeta` (name, source `upload` | `elevenlabs`, prompt).
- **Instrument**: label, attack, release and **pads**: note → sample. A played note uses the nearest pad and is tuned by playback rate (the same rule as the built-in instruments). Instruments are registered in the sound engine as `user:<id>`.
- Deleting a sample removes its pads. Malformed saves are repaired by `sanitiseProject`.

## Sources
| Source | Status |
|---|---|
| Upload | works; a note in the file name (`pad_F#3.wav`) picks the pad |
| ElevenLabs sound generation | works with the site's key + site password, or a person's own key |
| Splice | not built: no public API known, and its samples are licensed |
| Login with a provider account | not built: no provider is known to offer OAuth for third-party apps. The option is a person's own API key |

The ElevenLabs endpoint, header and 0.5–22 s duration limits are written from memory and not yet tested against the live service.

## Keys and abuse
- Vercel env: `ELEVENLABS_API_KEY` (the site's key) and `SAMPLER_SITE_PASSWORD`. Without the password the site key is never used. The old name `SAMPLER_ACCESS_CODE` still works. One key per provider: `<PROVIDER>_API_KEY`.
- `GET /api/sampler/generate` reports only which providers are usable. `POST` takes `{provider, prompt, seconds}`, headers `x-access-code` or `x-provider-key`.
- Prompts ≤ 300 characters, 20 site-key calls per hour per address per server instance (a brake, not a quota).

## Persistence
- IndexedDB `musickit-sampler`: store `project` (the structure) and `audio` (blobs by sample id). Per browser.
- Export / import: one JSON file with the structure and all audio (base64).
- Not built: cloud persistence across devices. It needs a login and storage (for example Vercel Blob and a database); `SamplerStore` is the seam.

Files can also be dropped anywhere on the sampler page; they are handled like the upload button.
