import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { permissionGate } from "@/features/devtools/server/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where .nam files are kept on a developer's machine (both gitignored): the ones sent to the amp library, and others tried by hand. */
const FOLDERS = ["tmp/nam-upload", "nam"];

/**
 * The licence each tone's page on TONE3000 showed when it was read (2026-11-24), by file name. T3K: use it in software and publish what
 * you play through it, but don't pass the file on without its author's permission, so it can't ship with the app.
 */
const T3K = new Set([
  "FNDR BFSR VB Edge WRM2 CAB FREE", // tones/fender-super-reverb-1965-edge-of-breakup-a2-88775
  "Jcm800", // tones/marshall-jcm800-v30-1960-87735
  "5150 Stealth 100w Blue Mesa OS - jp_is_out_of_tune", // tones/5150-stealth-100w-mesa-os-full-rig-blue-red-and-green-84864
  "5150 Stealth 100w Green SD1 Mesa OS - jp_is_out_of_tune",
  "5150 Stealth 100w Red Mesa OS - jp_is_out_of_tune",
  "90sDualRec-FullRig-Red-Modn-Classic", // tones/87866
  "90sDualRec-FullRig-Red-Modn-SweetSpot+808",
]);

const nameOf = (file: string) => path.basename(file).replace(/\.nam$/i, "");

/** Whether the file sits under a folder with this name (any case). */
const inFolder = (file: string, folder: string) => file.split(path.sep).slice(0, -1).some((part) => part.toLowerCase() === folder);

/**
 * What the picker writes after a model's name. A file under a folder named `cc0` is one its author gave to the public domain. A file
 * under `gpl3` comes from github.com/pelennor2170/NAM_models, licensed GNU GPL v3: it may ship with the app unchanged, with its
 * creator's name, the GPL text and a link to that repo on a credits page. Both kinds may ship. Any other file not in the list above has
 * no licence that was read: "licence not known".
 */
const licenceOf = (file: string): string =>
  inFolder(file, "cc0") ? "CC0" : inFolder(file, "gpl3") ? "GPL-3" : T3K.has(nameOf(file)) ? "T3K" : "licence not known";

/** Every .nam file under the folders, as paths from the repo root. A folder that isn't there gives none. */
async function modelFiles(): Promise<string[]> {
  const found: string[] = [];
  for (const folder of FOLDERS) {
    const entries = await readdir(path.join(process.cwd(), folder), { recursive: true, withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (e.isFile() && /\.nam$/i.test(e.name)) found.push(path.relative(process.cwd(), path.join(e.parentPath, e.name)));
    }
  }
  return found.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * The amp models on this machine's disk, for the riff maker where the amp library isn't set up (no store token in
 * development). No `file`: the list, each with its licence. `file`: that model's text, only when it is one of the listed files.
 */
export async function GET(req: Request) {
  const gate = await permissionGate(req, "dev");
  if (gate) return gate;
  const files = await modelFiles();
  const file = new URL(req.url).searchParams.get("file");
  if (file === null) return Response.json({ models: files.map((f) => ({ file: f, name: nameOf(f), licence: licenceOf(f) })) }, { headers: { "cache-control": "no-store" } });
  if (!files.includes(file)) return Response.json({ error: "Unknown model." }, { status: 404 });
  try {
    return new Response(await readFile(path.join(process.cwd(), file), "utf8"), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The model could not be read." }, { status: 500 });
  }
}
