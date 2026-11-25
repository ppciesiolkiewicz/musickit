// node scripts/intro/voice.mjs [--all] [--estimated] [--only solo-hello,teach-end]
//
// Records the narration of both tours (students, teachers) with ElevenLabs in the tours' one voice, Charlie: one MP3
// per scene of src/features/intro/script.json into public/intro/charlie/<scene>.mp3, and the manifest src/features/intro/voices/charlie.json
// (each take's text, length and the second each cue's phrase starts, from ElevenLabs' character timings). Only scenes whose
// text changed since their take are recorded, unless --all; --estimated also records again the takes whose cue times were
// estimated (`estimated: true`) instead of read from ElevenLabs' timings. The manifest is saved after every take, so a run that
// stops halfway (out of credits) keeps what it recorded. Needs ELEVENLABS_API_KEY (read from the environment, else
// .env.local, else .env); ELEVENLABS_MODEL picks the model. See src/features/intro/README.md.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = join(ROOT, "src/features/intro/script.json");
const NAME = "charlie";
const MANIFEST = join(ROOT, `src/features/intro/voices/${NAME}.json`);
const OUT = join(ROOT, `public/intro/${NAME}`);

/** The tours' voice, Charlie (Australian, natural and relaxed), with the settings it is recorded with. */
const VOICE = { id: "IKne3meq5aSn9XLyUdCD", settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: 0.97 } };

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(join(ROOT, f)); // never overrides a variable already set
  } catch {
    /* no such file */
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

/** How the narrator should say words the voice gets wrong. Cue phrases must not contain these words. */
const SAY = [[/attunr/g, "attuner"]];
const spoken = (text) => SAY.reduce((t, [from, to]) => t.replace(from, to), text);

function args(argv) {
  const o = { all: false, estimated: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--all") o.all = true;
    else if (argv[i] === "--estimated") o.estimated = true;
    else if (argv[i] === "--only") o.only = (argv[++i] ?? "").split(",");
    else {
      console.error(`unknown option ${argv[i]}\nusage: node scripts/intro/voice.mjs [--all] [--estimated] [--only solo-hello,teach-end]`);
      process.exit(2);
    }
  }
  return o;
}

async function record(voice, text, previous, next) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      previous_text: previous || undefined,
      next_text: next || undefined,
      voice_settings: voice.settings,
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (!KEY) {
    console.error("ELEVENLABS_API_KEY is not set. Add it to .env.local (or export it) and run again.");
    process.exit(1);
  }
  const voice = VOICE;
  const script = JSON.parse(await readFile(SCRIPT, "utf8"));
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => '{"scenes":{}}'));
  if (manifest.voice !== voice.id || manifest.model !== MODEL) opts.all = true; // one voice for the whole tour
  await mkdir(OUT, { recursive: true });

  // every scene of both tours; `tour` keeps a take's previous and next text inside its own tour
  const scenes = Object.entries(script.videos).flatMap(([tour, v]) => v.scenes.map((s) => ({ ...s, tour })));
  const near = (i, j) => (scenes[j] && scenes[j].tour === scenes[i].tour ? spoken(scenes[j].text) : undefined);
  let done = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (opts.only && !opts.only.includes(s.id)) continue;
    const take = manifest.scenes[s.id];
    if (!opts.all && !opts.only && take?.text === s.text && !(opts.estimated && take.estimated)) continue;
    const say = spoken(s.text);
    const started = Date.now();
    const r = await record(voice, say, near(i, i - 1), near(i, i + 1));
    const a = r.alignment;
    if (!a?.character_start_times_seconds?.length) throw new Error(`${s.id}: no timings in the reply`);
    const starts = a.character_start_times_seconds;
    const ends = a.character_end_times_seconds;
    const cues = {};
    for (const [name, phrase] of Object.entries(s.cues)) {
      const at = say.indexOf(phrase);
      if (at < 0) throw new Error(`${s.id}: cue "${phrase}" is not in the spoken text`);
      cues[name] = Math.round((starts[Math.min(at, starts.length - 1)] ?? 0) * 100) / 100;
    }
    const file = `${s.id}.mp3`;
    await writeFile(join(OUT, file), Buffer.from(r.audio_base64, "base64"));
    const duration = Math.round((ends[ends.length - 1] + 0.15) * 100) / 100;
    manifest.scenes[s.id] = { text: s.text, file: `/intro/${NAME}/${file}`, duration, cues };
    manifest.voice = voice.id;
    manifest.model = MODEL;
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n"); // after every take: a run cut short keeps its takes
    done++;
    console.log(`${s.id}: ${duration}s (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
  for (const id of Object.keys(manifest.scenes)) if (!scenes.some((s) => s.id === id)) delete manifest.scenes[id];
  manifest.voice = voice.id;
  manifest.model = MODEL;
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(done ? `recorded ${done} scene(s); wrote ${MANIFEST}` : "every scene is up to date (use --all to record again)");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
