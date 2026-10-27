// npm run video -- <config.json or folder>… [--base http://localhost:3100] [--out out/videos] [--only 9x16] [--frames 0,45,last]
//
// Renders each video config to one MP4 per format it names, frame by frame: the render page (/teachers/video/render)
// runs under a stepped clock (clock.js), each frame is a screenshot piped into ffmpeg, and the page's offline soundtrack
// is muxed in. Needs the dev server running. See spec/video.md.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Pixel sizes; the page checks its window against its own copy, so the two can't drift silently. */
const FORMATS = { "16x9": [1920, 1080], "9x16": [1080, 1920] };
const FPS = 30;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const CLOCK = join(dirname(fileURLToPath(import.meta.url)), "clock.js");
/** the WAV comes over in slices: one evaluate result of a long video's whole soundtrack is too big for the protocol */
const AUDIO_SLICE = 8 << 20;

function parseArgs(argv) {
  const opts = { base: "http://localhost:3100", out: "out/videos", only: null, frames: null, inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => (i + 1 < argv.length ? argv[++i] : usage(`${a} needs a value`));
    if (a === "--base") opts.base = value().replace(/\/$/, "");
    else if (a === "--out") opts.out = value();
    else if (a === "--only") opts.only = value().split(",");
    else if (a === "--frames") opts.frames = value().split(",");
    else if (a.startsWith("--")) usage(`unknown option ${a}`);
    else opts.inputs.push(a);
  }
  if (!opts.inputs.length) usage("name at least one config file or folder");
  for (const f of opts.only ?? []) if (!Object.hasOwn(FORMATS, f)) usage(`--only ${f}: no such format (${Object.keys(FORMATS).join(" or ")})`);
  for (const f of opts.frames ?? []) if (f !== "last" && !/^\d+$/.test(f)) usage(`--frames ${f}: expected frame numbers or "last"`);
  return opts;
}

function usage(msg) {
  console.error(`${msg}\nusage: npm run video -- <config.json or folder>… [--base URL] [--out DIR] [--only 16x9,9x16] [--frames 0,45,last]`);
  process.exit(2);
}

/** Config files: each file named, and every .json directly inside each folder named. */
function configFiles(inputs) {
  return inputs.flatMap((p) => {
    if (!existsSync(p)) return [p]; // reported as an error when read
    if (!statSync(p).isDirectory()) return [p];
    return readdirSync(p)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => join(p, f));
  });
}

async function loadPlaywright() {
  let path = process.env.PLAYWRIGHT_PATH;
  if (!path) {
    const npx = join(homedir(), ".npm/_npx");
    const dir = existsSync(npx) ? readdirSync(npx).find((d) => existsSync(join(npx, d, "node_modules/playwright/index.mjs"))) : undefined;
    if (!dir) throw new Error("no Playwright in ~/.npm/_npx (set PLAYWRIGHT_PATH to its index.mjs)");
    path = join(npx, dir, "node_modules/playwright/index.mjs");
  }
  return import(pathToFileURL(resolve(path)).href);
}

/** A config's mistake, reported as `<path>: <message>`. */
class ConfigError extends Error {}

/** ffmpeg reading PNG frames on stdin and the WAV from disk; `done` settles when it exits. */
function startEncoder(wav, out) {
  const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-shortest", out], {
    stdio: ["pipe", "ignore", "pipe"],
  });
  let log = "";
  ff.stderr.on("data", (d) => (log += d));
  ff.stdin.on("error", () => {}); // a dead ffmpeg surfaces through `done`
  const done = new Promise((ok, fail) => {
    ff.on("error", fail);
    ff.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}: ${log.trim().split("\n").slice(-3).join(" / ")}`))));
  });
  const write = (buf) => (ff.stdin.write(buf) ? null : new Promise((ok) => ff.stdin.once("drain", ok)));
  done.catch(() => {}); // awaited after the last frame; a render that fails first kills it instead
  return { write, end: () => ff.stdin.end(), kill: () => ff.kill("SIGKILL"), done };
}

/** Prints "<label> 35%" on one line, every 5 %. */
function progress(label, total) {
  let shown = -1;
  const tty = process.stderr.isTTY;
  return {
    tick(i) {
      const pct = Math.floor(((i + 1) / total) * 20) * 5;
      if (pct === shown) return;
      shown = pct;
      if (tty) process.stderr.write(`\r${label} ${pct}%`);
    },
    clear() {
      if (tty) process.stderr.write("\r\x1b[K");
    },
  };
}

/** One config at one format: the lines to print (the MP4, or the debug PNGs). Throws ConfigError for the config's own mistakes. */
async function renderOne(browser, opts, config, format) {
  const [width, height] = FORMATS[format];
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await context.addInitScript({ path: CLOCK });
    await context.addInitScript((job) => {
      window.__VIDEO_JOB__ = job;
    }, { config, format });
    // the dev server's live-reload socket, answered by nothing: a rebuild or a dropped connection must not reload the page mid-render
    await context.routeWebSocket(/\/_next\/webpack-hmr/, () => {});
    const page = await context.newPage();
    let reloaded = false;
    await page.goto(`${opts.base}/teachers/video/render`);
    // polled on a timer: Playwright's default polls on animation frames, which only come when the clock is stepped
    await page.waitForFunction(() => window.__video && window.__video.state !== "loading", null, { timeout: 60000, polling: 100 });
    const video = await page.evaluate(() => ({ ...window.__video }));
    if (video.state === "error") throw new ConfigError(video.message);
    // anything that still reloads the page would restart its clock and score from 0 (a new document; the router's own
    // history updates are same-document and harmless)
    page.on("domcontentloaded", () => {
      reloaded = true;
    });

    const name = `${config.name}-${format}`;
    const tmp = join(opts.out, ".tmp");
    await mkdir(tmp, { recursive: true });

    // debug: just these frames as PNGs, for comparing runs
    const keep = opts.frames ? new Set(opts.frames.map((f) => (f === "last" ? video.frames - 1 : Number(f)))) : null;
    const lastFrame = keep ? Math.min(video.frames - 1, Math.max(...keep)) : video.frames - 1;

    let wav = null;
    let encoder = null;
    const out = join(opts.out, `${name}.mp4`);
    // encoded beside the WAV and moved into place once whole, so a failed render never leaves a short MP4 behind
    const part = join(tmp, `${name}.mp4`);
    if (!keep) {
      const len = await page.evaluate(async () => (window.__wav = await window.__video.audio()).length);
      let b64 = "";
      for (let at = 0; at < len; at += AUDIO_SLICE) b64 += await page.evaluate(([a, n]) => window.__wav.slice(a, a + n), [at, AUDIO_SLICE]);
      await page.evaluate(() => delete window.__wav);
      wav = join(tmp, `${name}.wav`);
      await writeFile(wav, Buffer.from(b64, "base64"));
      encoder = startEncoder(wav, part);
    }

    const bar = progress(name, lastFrame + 1);
    const started = Date.now();
    const written = [];
    let ok = false;
    try {
      for (let i = 0; i <= lastFrame; i++) {
        // the step that puts the clock on exactly i * 1000 / FPS (now + (t - now) is t for neighbouring doubles): adding
        // 1000 / FPS every frame drifts just under a beat that falls on a frame, which drew some note changes a frame late
        const ms = i === 0 ? 0 : (i * 1000) / FPS - ((i - 1) * 1000) / FPS;
        await page.evaluate(async (ms) => {
          window.__clock.step(ms);
          // two turns of the task queue: React's passive effects, then anything they scheduled
          await new Promise((r) => setTimeout(r, 0));
          await new Promise((r) => setTimeout(r, 0));
        }, ms);
        if (reloaded) throw new Error(`the page reloaded at frame ${i}; render again`);
        if (keep && !keep.has(i)) {
          bar.tick(i);
          continue;
        }
        const png = await page.screenshot({ type: "png" });
        if (keep) {
          const f = join(opts.out, "frames", `${name}-${i}.png`);
          await mkdir(dirname(f), { recursive: true });
          await writeFile(f, png);
          written.push(f);
        } else await encoder.write(png);
        bar.tick(i);
      }
      ok = true;
    } finally {
      bar.clear();
      if (ok) encoder?.end();
      else if (encoder) {
        encoder.kill();
        await rm(part, { force: true });
        await rm(wav, { force: true });
      }
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (keep) return written.map((f) => `${f} (${secs}s)`);
    try {
      await encoder.done;
      await rename(part, out);
    } catch (e) {
      await rm(part, { force: true });
      throw e;
    } finally {
      await rm(wav);
    }
    return [`${out} (${video.frames} frames, ${(video.durationMs / 1000).toFixed(1)}s, rendered in ${secs}s)`];
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = configFiles(opts.inputs);
  if (!files.length) usage("no .json configs found");
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  let failed = 0;
  try {
    for (const file of files) {
      try {
        let config;
        try {
          config = JSON.parse(await readFile(file, "utf8"));
        } catch (e) {
          throw new ConfigError(e.code === "ENOENT" ? "no such file" : `not valid JSON: ${e.message}`);
        }
        const named = config && typeof config.formats === "object" && config.formats !== null ? Object.keys(config.formats) : [];
        for (const f of named) if (!Object.hasOwn(FORMATS, f)) throw new ConfigError(`formats.${f}: no such format (16x9 or 9x16)`);
        // nothing named: open one format anyway, so the page's own check says what is wrong
        const formats = (named.length ? named : ["16x9"]).filter((f) => !opts.only || opts.only.includes(f));
        for (const format of formats) for (const line of await renderOne(browser, opts, config, format)) console.log(line);
      } catch (e) {
        failed++;
        console.error(`${file}: ${e instanceof ConfigError ? e.message : (e?.stack ?? e)}`);
      }
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(1);
});
