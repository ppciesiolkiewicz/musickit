# Sampler: rules

A dev tool: the sample library at `/dev/sampler`. Behaviour spec: `spec/sampler.md`. Nothing outside `/dev` uses it; the looper plays built-in instruments only.

- Imports only `@/features/sound`, `@/features/tuner/pitch` (pure maths), `@/features/devtools/gate` and shared components. Never the looper, creator or guitar tools.
- Generation is development only: `src/app/api/dev/sampler/route.ts` starts with `devGate()` and uses the server's key (`ELEVENLABS_API_KEY`). No site password, no person's own key. The key never reaches the browser.
- Never forward a provider's error body to the client (`server/elevenlabs.ts` maps statuses to fixed messages).
- Samples and audio persist through `SamplerStore` (`store/types.ts`), IndexedDB. The library (`library.ts`) is one shared store per page; it deletes audio before announcing a change.
- New provider: add it to `PROVIDERS`, a `server/<name>.ts` with an injectable `fetch`, a case in the route, a test.
- Model code (`model/`) is pure and tested. Run the tests and the type check before every commit.
