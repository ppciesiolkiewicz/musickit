import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { devOrAdminGate } from "@/features/devtools/server/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where .nam files are kept on a developer's machine (both gitignored): the ones sent to the amp library, and others tried by hand. */
const FOLDERS = ["tmp/nam-upload", "nam"];

/** A file under a folder named `cc0` is one its author gave to the public domain: the picker tags it "(CC0)", the ones that may ship with the app. */
const isCc0 = (file: string) => file.split(path.sep).slice(0, -1).some((part) => part.toLowerCase() === "cc0");

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
 * development). No `file`: the list, each name ending "(CC0)" for a file under a `cc0` folder. `file`: that model's text, only when it is one of the listed files.
 */
export async function GET(req: Request) {
  const gate = await devOrAdminGate(req);
  if (gate) return gate;
  const files = await modelFiles();
  const file = new URL(req.url).searchParams.get("file");
  if (file === null) return Response.json({ models: files.map((f) => ({ file: f, name: `${path.basename(f).replace(/\.nam$/i, "")}${isCc0(f) ? " (CC0)" : ""}` })) }, { headers: { "cache-control": "no-store" } });
  if (!files.includes(file)) return Response.json({ error: "Unknown model." }, { status: 404 });
  try {
    return new Response(await readFile(path.join(process.cwd(), file), "utf8"), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The model could not be read." }, { status: 500 });
  }
}
