/**
 * Preloading for the first note and the first mic reading, after the page has loaded and the browser is idle:
 * - the piano: `PreloadPiano` (keyboard/) makes the shared piano then, which loads and decodes its samples and readies Tone.js;
 * - the CREPE pitch model and the tfjs code it runs on: fetched into the HTTP cache here, nothing decoded and no AudioContext made.
 * The page is never slowed, and when a tool later asks for them they come from the cache.
 */

/** Waits for the page's `load` event (unless it has fired), then for idle time (at most 2 s), then runs. */
export function whenIdleAfterLoad(
  win: { document: { readyState: string }; addEventListener(type: "load", fn: () => void, opts?: { once: boolean }): void; requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number; setTimeout(fn: () => void, ms: number): number },
  run: () => void,
): void {
  const idle = () => (win.requestIdleCallback ? win.requestIdleCallback(run, { timeout: 2000 }) : win.setTimeout(run, 1500));
  if (win.document.readyState === "complete") idle();
  else win.addEventListener("load", idle, { once: true });
}

/** Fetches each url once into the HTTP cache; failures are ignored (the tool that needs it will try again). */
export async function warmCaches(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).catch(() => undefined)));
}

const MODEL = "/models/crepe/model.json";

/** The pitch model's files: model.json and the weight shards it lists. */
async function modelUrls(): Promise<string[]> {
  try {
    const m = (await (await fetch(MODEL)).json()) as { weightsManifest: { paths: string[] }[] };
    return m.weightsManifest.flatMap((g) => g.paths.map((p) => `/models/crepe/${p}`));
  } catch {
    return [];
  }
}

let started = false;
/** Once per page load: the pitch model and tfjs, warmed after load and idle time. */
export function preloadPitchModel(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  whenIdleAfterLoad(window as never, () => {
    void modelUrls().then(warmCaches);
    // the tfjs chunk itself, so the tuner's first reading does not wait for its code either
    void import("@tensorflow/tfjs").catch(() => undefined);
  });
}
