/**
 * Fetches the app's instrument samples into public/instruments/<ID>/ and writes src/features/sound/engine/samples.generated.json.
 * Run once when the sources change: `npm run samples:fetch`. Then `npm run samples:measure` for their tuning.
 *
 * Sources (both CC BY 3.0, credited in the app):
 * - tonejs-instruments (nbrosowsky), recorded instruments as mp3, one file per listed note;
 * - the Fluid R3 GM soundfont as gleitz/midi-js-soundfonts renders it, one base64 mp3 per note inside a JS file.
 * A dense set is thinned to keep a sample when it is at least three semitones above the last one kept (and always the top one).
 * MusyngKite and FatBoy are CC BY-SA: not used.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type Source = { tji: string } | { fluid: string } | { sameAs: string };

/** what each instrument id plays now; the ids are kept, since saved projects and styles name them */
const SOURCES: Record<string, Source> = {
  PIANO: { tji: "piano" },
  CELLO: { tji: "cello" },
  FLUTE: { tji: "flute" },
  BASSOON: { tji: "bassoon" },
  METAL_GUITAR: { tji: "guitar-electric" },
  ACCORDION: { tji: "harmonium" },
  SYNTH_ACCORDION: { sameAs: "ACCORDION" },
  ELEC_PIANO: { fluid: "electric_piano_1" },
  HONKY_TONK_PIANO: { fluid: "honkytonk_piano" },
  SYNTH_BRASS: { fluid: "synth_brass_1" },
  SYNTH_LEAD: { fluid: "lead_2_sawtooth" },
  POP_LEAD: { fluid: "lead_1_square" },
};

/** tonejs-instruments' note lists ("A#1=As1 …": the note, then its file), copied from its Tonejs-Instruments.js */
const TJI: Record<string, string> = {
  "piano": "A7=A7 A1=A1 A2=A2 A3=A3 A4=A4 A5=A5 A6=A6 A#7=As7 A#1=As1 A#2=As2 A#3=As3 A#4=As4 A#5=As5 A#6=As6 B7=B7 B1=B1 B2=B2 B3=B3 B4=B4 B5=B5 B6=B6 C7=C7 C1=C1 C2=C2 C3=C3 C4=C4 C5=C5 C6=C6 C7=C7 C#7=Cs7 C#1=Cs1 C#2=Cs2 C#3=Cs3 C#4=Cs4 C#5=Cs5 C#6=Cs6 D7=D7 D1=D1 D2=D2 D3=D3 D4=D4 D5=D5 D6=D6 D#7=Ds7 D#1=Ds1 D#2=Ds2 D#3=Ds3 D#4=Ds4 D#5=Ds5 D#6=Ds6 E7=E7 E1=E1 E2=E2 E3=E3 E4=E4 E5=E5 E6=E6 F7=F7 F1=F1 F2=F2 F3=F3 F4=F4 F5=F5 F6=F6 F#7=Fs7 F#1=Fs1 F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 F#6=Fs6 G7=G7 G1=G1 G2=G2 G3=G3 G4=G4 G5=G5 G6=G6 G#7=Gs7 G#1=Gs1 G#2=Gs2 G#3=Gs3 G#4=Gs4 G#5=Gs5 G#6=Gs6",
  "cello": "E3=E3 E4=E4 F2=F2 F3=F3 F4=F4 F#3=Fs3 F#4=Fs4 G2=G2 G3=G3 G4=G4 G#2=Gs2 G#3=Gs3 G#4=Gs4 A2=A2 A3=A3 A4=A4 A#2=As2 A#3=As3 B2=B2 B3=B3 B4=B4 C2=C2 C3=C3 C4=C4 C5=C5 C#3=Cs3 C#4=Cs4 D2=D2 D3=D3 D4=D4 D#2=Ds2 D#3=Ds3 D#4=Ds4 E2=E2",
  "flute": "A6=A6 C4=C4 C5=C5 C6=C6 C7=C7 E4=E4 E5=E5 E6=E6 A4=A4 A5=A5",
  "bassoon": "A4=A4 C3=C3 C4=C4 C5=C5 E4=E4 G2=G2 G3=G3 G4=G4 A2=A2 A3=A3",
  "guitar-electric": "D#3=Ds3 D#4=Ds4 D#5=Ds5 E2=E2 F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 A2=A2 A3=A3 A4=A4 A5=A5 C3=C3 C4=C4 C5=C5 C6=C6 C#2=Cs2",
  "harmonium": "C2=C2 C3=C3 C4=C4 C5=C5 C#2=Cs2 C#3=Cs3 C#4=Cs4 C#5=Cs5 D2=D2 D3=D3 D4=D4 D5=D5 D#2=Ds2 D#3=Ds3 D#4=Ds4 E2=E2 E3=E3 E4=E4 F2=F2 F3=F3 F4=F4 F#2=Fs2 F#3=Fs3 G2=G2 G3=G3 G4=G4 G#2=Gs2 G#3=Gs3 G#4=Gs4 A2=A2 A3=A3 A4=A4 A#2=As2 A#3=As3 A#4=As4",
};

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public/instruments");
const OUT = path.join(ROOT, "src/features/sound/engine/samples.generated.json");
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (note: string) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note)!;
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
};
const SHARP = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
/** "Ds4.mp3" for 63: the file name kept in the repo, safe in a URL */
const fileOf = (midi: number) => `${SHARP[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`;
/** "D#4" for 63: the note name the sound engine's config uses */
const nameOf = (midi: number) => `${SHARP[midi % 12].replace("s", "#")}${Math.floor(midi / 12) - 1}`;

/** keep a sample when it is at least 3 semitones above the last kept, and always the top one */
function thin(notes: number[]): number[] {
  const sorted = [...new Set(notes)].sort((a, b) => a - b);
  const kept: number[] = [];
  for (const n of sorted) if (!kept.length || n - kept[kept.length - 1] >= 3) kept.push(n);
  const top = sorted[sorted.length - 1];
  if (kept[kept.length - 1] !== top) kept.push(top);
  return kept;
}

async function get(url: string): Promise<Buffer> {
  for (let tries = 4; ; tries--) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (tries <= 1) throw e;
    }
  }
}

/** note → file bytes, for one source */
async function fetchSource(src: { tji: string } | { fluid: string }): Promise<Map<number, Buffer>> {
  const out = new Map<number, Buffer>();
  if ("tji" in src) {
    const files = new Map(TJI[src.tji].split(" ").map((pair) => pair.split("=")).map(([note, file]) => [midiOf(note), file]));
    for (const m of thin([...files.keys()])) out.set(m, await get(`https://nbrosowsky.github.io/tonejs-instruments/samples/${src.tji}/${files.get(m)}.mp3`));
  } else {
    const js = (await get(`https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${src.fluid}-mp3.js`)).toString("utf8");
    const notes = new Map<number, string>();
    for (const m of js.matchAll(/"([A-G]b?-?\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g)) notes.set(midiOf(m[1]), m[2]);
    for (const m of thin([...notes.keys()].filter((n) => n % 3 === 0))) out.set(m, Buffer.from(notes.get(m)!, "base64"));
  }
  return out;
}

async function main() {
  // the old Casio folders (PIANO, ELEC-PIANO, …) go: everything under public/instruments is rewritten
  for (const dir of await readdir(PUBLIC)) await rm(path.join(PUBLIC, dir), { recursive: true, force: true });
  const config: Record<string, { baseUrl: string; urls: Record<string, string>; source: string }> = {};
  for (const [id, src] of Object.entries(SOURCES)) {
    if ("sameAs" in src) continue;
    const files = await fetchSource(src);
    const dir = path.join(PUBLIC, id);
    await mkdir(dir, { recursive: true });
    const urls: Record<string, string> = {};
    for (const [m, bytes] of [...files].sort((a, b) => a[0] - b[0])) {
      await writeFile(path.join(dir, fileOf(m)), bytes);
      urls[nameOf(m)] = fileOf(m);
    }
    config[id] = { baseUrl: `/instruments/${id}/`, urls, source: "tji" in src ? `tonejs-instruments/${src.tji}` : `FluidR3_GM/${src.fluid}` };
    const kb = [...files.values()].reduce((s, b) => s + b.length, 0) / 1024;
    console.log(`${id.padEnd(18)} ${String(files.size).padStart(3)} samples  ${kb.toFixed(0).padStart(6)} KB  ${config[id].source}`);
  }
  for (const [id, src] of Object.entries(SOURCES)) if ("sameAs" in src) config[id] = { ...config[src.sameAs] };
  await writeFile(OUT, JSON.stringify(config, null, 1) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

void main();
