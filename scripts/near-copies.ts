/**
 * TEMPORARY, while the library is being thinned: finds seed blocks that are near-copies of each other (the same drill at
 * another level or range, to fold into one block with choices, `set` and `params`) and writes the groups to
 * src/features/library/seed/nearCopies.json, which /admin/content/library/blocks shows as a filter. Delete the script,
 * the JSON and the filter once the folding is done.
 *
 *   ollama serve & ollama pull nomic-embed-text      (once)
 *   npx tsx scripts/near-copies.ts [--threshold 0.93] [--dry]
 *
 * Two blocks are compared only when they are in the same area and use the same kinds of tools. Their words (title,
 * headings, text, lists, why) are embedded with a local Ollama model (`nomic-embed-text`) and compared by cosine; word
 * overlap (Jaccard) is reported beside it. Pairs at or above the threshold are joined into groups. Without Ollama it
 * falls back to word overlap alone (threshold 0.5). Riffs and showcases are left out.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(__dirname, "../src/features/library/seed/blocks");
const OUT = path.join(__dirname, "../src/features/library/seed/nearCopies.json");
const MODEL = "nomic-embed-text";
const OLLAMA = "http://localhost:11434/api/embed";

type Obj = Record<string, unknown>;
interface File { id: string; genre?: string; showcase?: string; exercise: Obj }

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

function words(e: Obj): { text: string; tools: string } {
  const out: string[] = [String(e.title ?? "")];
  const tools: string[] = [];
  const cell = (c: Obj) => {
    if (c.type === "text") out.push(String(c.text));
    if (c.type === "list") out.push(...(c.items as string[]));
    if (c.type === "tool") tools.push(String((c.tool as Obj).type));
    if (c.type === "section") {
      out.push(String(c.heading));
      (c.cells as Obj[]).forEach(cell);
    }
  };
  (e.cells as Obj[]).forEach(cell);
  if (e.why) out.push(String(e.why));
  return { text: out.join("\n").replace(/\{\{[^}]*\}\}/g, " "), tools: [...new Set(tools)].sort().join("+") };
}

const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z]{3,}/g) ?? []);
function jaccard(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
}
function cosine(a: number[], b: number[]): number {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return d / Math.sqrt(x * y);
}

async function embed(texts: string[]): Promise<number[][] | null> {
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 32) {
      const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: MODEL, input: texts.slice(i, i + 32) }), signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      out.push(...((await r.json()) as { embeddings: number[][] }).embeddings);
    }
    return out;
  } catch (e) {
    console.error(`Ollama not used (${e instanceof Error ? e.message : e}); falling back to word overlap.`);
    return null;
  }
}

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as File)
    .filter((f) => !f.genre && !f.showcase);
  const w = files.map((f) => words(f.exercise));
  const toks = w.map((x) => tokens(x.text));
  const vecs = await embed(w.map((x) => `search_document: ${x.text}`));
  const method = vecs ? "embedding" : "jaccard";
  const threshold = Number(arg("--threshold") ?? (vecs ? 0.93 : 0.5));

  const pairs: { a: number; b: number; cos: number | null; jac: number }[] = [];
  for (let i = 0; i < files.length; i++)
    for (let j = i + 1; j < files.length; j++) {
      if (files[i].exercise.area !== files[j].exercise.area || w[i].tools !== w[j].tools) continue;
      pairs.push({ a: i, b: j, cos: vecs ? cosine(vecs[i], vecs[j]) : null, jac: jaccard(toks[i], toks[j]) });
    }
  const score = (p: (typeof pairs)[number]) => p.cos ?? p.jac;
  const hits = pairs.filter((p) => score(p) >= threshold);

  // groups: joined through any pair at or above the threshold
  const parent = files.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (const p of hits) parent[root(p.a)] = root(p.b);
  const by = new Map<number, number[]>();
  for (const p of hits) for (const i of [p.a, p.b]) by.set(root(i), [...new Set([...(by.get(root(i)) ?? []), i])]);
  const groups = [...by.values()]
    .map((ix) => {
      const inside = hits.filter((p) => ix.includes(p.a) && ix.includes(p.b));
      const ids = ix.map((i) => files[i].id).sort();
      return { label: ids[0], blocks: ids, best: Math.max(...inside.map(score)), pairs: inside.map((p) => ({ a: files[p.a].id, b: files[p.b].id, cos: p.cos === null ? null : +p.cos.toFixed(3), jac: +p.jac.toFixed(3) })) };
    })
    .sort((a, b) => b.best - a.best)
    .map((g, i) => ({ id: `g${String(i + 1).padStart(2, "0")}`, ...g, best: +g.best.toFixed(3) }));

  const dist = [0.8, 0.85, 0.88, 0.9, 0.92, 0.95].map((t) => `${t}: ${pairs.filter((p) => score(p) >= t).length}`).join(", ");
  console.log(`${files.length} blocks, ${pairs.length} pairs compared (${method}); pairs at or above: ${dist}`);
  console.log(`${groups.length} groups at ${threshold}, ${groups.reduce((n, g) => n + g.blocks.length, 0)} blocks in them; largest ${Math.max(0, ...groups.map((g) => g.blocks.length))}`);
  if (process.argv.includes("--dry")) {
    for (const g of groups) console.log(`${g.id} ${g.best} ${g.blocks.join(" ")}`);
    return;
  }
  writeFileSync(OUT, JSON.stringify({ note: "TEMPORARY: near-copy groups for thinning the library, from scripts/near-copies.ts. Delete with the script and the filter.", method, model: vecs ? MODEL : null, threshold, groups }, null, 2) + "\n");
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
