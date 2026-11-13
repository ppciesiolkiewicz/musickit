/**
 * How src is structured: packages and their layers, what depends on what, which component renders which.
 * The same scan as /dev/structure (src/features/devtools/model/structure.ts), in the terminal.
 *
 *   npx tsx scripts/structure.ts help
 */
import { LAYERS, renderTree, routes, usersOf, type Structure, type TreeNode } from "../src/features/devtools/model/structure";
import { scanStructure } from "../src/features/devtools/server/structure";

const HELP = `structure <command> [args]          (visual version: /dev/structure on the dev server)

  packages                 every package by layer: files, lines, components, depends on, used by   (default)
  pkg <id>                 one package: folders, files, what it depends on and what uses it   e.g. pkg features/plan
  tree <route|file> [N]    what a page or component renders, N levels deep (default 4)        e.g. tree /looper
  file <path>              one file: components, imports, imported by, renders, rendered by, extends
  upward                   imports that point up a layer (${LAYERS.join(" > ")})
  routes                   every page and its file`;

const s: Structure = scanStructure();
const [cmd = "packages", ...args] = process.argv.slice(2);
const pad = (x: string | number, n: number) => String(x).padEnd(n);
const top = (o: Record<string, number>, n = 6) =>
  Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}(${v})`).join(" ") || "—";
const short = (p: string) => p.replace(/^src\//, "");

function findFile(q: string): string {
  if (q.startsWith("/")) {
    const r = routes(s).find((x) => x.url === q);
    if (r) return r.file;
  }
  const exact = s.files.find((f) => f.path === q || short(f.path) === q);
  if (exact) return exact.path;
  const hits = s.files.filter((f) => f.path.includes(q) || f.components.includes(q));
  if (hits.length === 1) return hits[0].path;
  console.error(hits.length ? `"${q}" matches:\n  ${hits.slice(0, 20).map((h) => h.path).join("\n  ")}` : `no file or route matches "${q}"`);
  process.exit(1);
}

function printTree(n: TreeNode, prefix = "", last = true, rootLine = true) {
  const f = s.files.find((x) => x.path === n.file);
  const label = `${short(n.file)}${f?.components.length ? `  [${f.components.join(", ")}]` : ""}${f?.client ? "  client" : ""}${n.cut === "cycle" ? "  ↺" : n.cut === "depth" ? "  …" : ""}`;
  console.log(rootLine ? label : `${prefix}${last ? "└─ " : "├─ "}${n.tags.join(", ")} → ${label}`);
  const next = rootLine ? "" : prefix + (last ? "   " : "│  ");
  n.children.forEach((c, i) => printTree(c, next, i === n.children.length - 1, false));
}

switch (cmd) {
  case "help":
    console.log(HELP);
    break;
  case "packages":
    for (const layer of LAYERS) {
      console.log(`\n${layer.toUpperCase()}`);
      for (const p of s.packages.filter((x) => x.layer === layer))
        console.log(`  ${pad(p.id, 26)} ${pad(p.files + " files", 10)} ${pad(p.lines + " lines", 12)} ${pad(p.components + " comp", 9)} → ${top(p.dependsOn, 4)}`);
    }
    console.log(`\n${s.upward.length} imports point up a layer (structure upward)`);
    break;
  case "pkg": {
    const p = s.packages.find((x) => x.id === args[0]);
    if (!p) { console.error(`no package "${args[0]}"; one of: ${s.packages.map((x) => x.id).join(" ")}`); process.exit(1); }
    console.log(`${p.id}  (${p.layer})  ${p.files} files, ${p.lines} lines, ${p.components} components`);
    console.log(`\ndepends on: ${top(p.dependsOn, 50)}\nused by:    ${top(p.usedBy, 50)}\n`);
    for (const folder of Object.keys(p.folders).sort()) {
      console.log(`${folder || "(top)"}/`);
      for (const f of s.files.filter((x) => x.pkg === p.id && x.folder === folder))
        console.log(`  ${pad(f.path.split("/").pop()!, 32)} ${pad(f.kind + (f.client ? " client" : ""), 18)} ${f.components.join(", ")}`);
    }
    break;
  }
  case "tree":
    printTree(renderTree(s, findFile(args[0] ?? "/"), Number(args[1] ?? 4)));
    break;
  case "file": {
    const f = s.files.find((x) => x.path === findFile(args[0] ?? ""))!;
    const u = usersOf(s, f.path);
    const list = (xs: string[]) => (xs.length ? xs.map((x) => `\n    ${short(x)}`).join("") : " —");
    console.log(`${f.path}  (${f.pkg}, ${f.kind}${f.client ? ", client" : ""}, ${f.lines} lines)`);
    console.log(`  components:${f.components.length ? " " + f.components.join(", ") : " —"}`);
    console.log(`  renders:${list(f.renders.filter((r) => r.file !== f.path).map((r) => `${r.tag} ← ${short(r.file)}`))}`);
    console.log(`  rendered by:${list(u.renderedBy)}`);
    console.log(`  imports:${list(f.imports)}`);
    console.log(`  imported by:${list(u.importedBy)}`);
    console.log(`  extends:${list(f.extends.map((e) => `${e.name} extends ${e.base}${e.file ? ` (${short(e.file)})` : ""}`))}`);
    console.log(`  extended by:${list(u.extendedBy.map((e) => `${e.name} extends ${e.base} (${short(e.file)})`))}`);
    break;
  }
  case "upward":
    for (const u of s.upward) console.log(`${short(u.from)}  →  ${short(u.to)}`);
    console.log(`${s.upward.length} upward imports`);
    break;
  case "routes":
    for (const r of routes(s)) console.log(`${pad(r.url, 34)} ${short(r.file)}`);
    break;
  default:
    console.log(HELP);
    process.exit(1);
}
