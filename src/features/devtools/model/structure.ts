import ts from "typescript";

/**
 * How `src` is put together: packages (a feature, a lib, a components folder, the app routes), the files in them, which file
 * imports which, which component renders which, and which types extend which. Pure: it takes file texts, `server/structure.ts`
 * reads them from disk. Read by `/dev/structure` and `npm run structure`.
 */

/** Layers from the top down; an import should point down or across, never up. */
export const LAYERS = ["app", "features", "components", "lib"] as const;
export type Layer = (typeof LAYERS)[number];

export type FileKind = "page" | "layout" | "route" | "component" | "hook" | "module";

export interface Render {
  /** The tag as written: `WeekView`, `Ui.Button`. */
  tag: string;
  /** The file that defines it. */
  file: string;
  count: number;
}

export interface Extend {
  /** The type or class that extends. */
  name: string;
  /** What it extends, as written. */
  base: string;
  /** The file that defines the base, when it is in src. */
  file?: string;
}

export interface FileNode {
  path: string;
  pkg: string;
  layer: Layer;
  /** The folder inside the package, "" at its top. */
  folder: string;
  kind: FileKind;
  client: boolean;
  /** PascalCase functions and consts the file defines. */
  components: string[];
  imports: string[];
  renders: Render[];
  extends: Extend[];
  lines: number;
}

export interface PackageNode {
  id: string;
  layer: Layer;
  files: number;
  lines: number;
  components: number;
  /** Folder → file count. */
  folders: Record<string, number>;
  /** Package → how many imports point there. */
  dependsOn: Record<string, number>;
  usedBy: Record<string, number>;
}

/** An import that points to a higher layer (lib → features, components → app …). */
export interface UpwardImport {
  from: string;
  to: string;
}

export interface Structure {
  files: FileNode[];
  packages: PackageNode[];
  upward: UpwardImport[];
}

/** `src/features/plan/model/x.ts` → `features/plan`; single files in src/lib or src/components → `lib`, `components`. */
export function packageOf(path: string): { pkg: string; layer: Layer; folder: string } {
  const parts = path.replace(/^src\//, "").split("/");
  const top = parts[0] as Layer;
  const layer: Layer = (LAYERS as readonly string[]).includes(top) ? top : "lib";
  if (layer === "app") return { pkg: "app", layer, folder: parts.slice(1, -1).join("/") };
  if (parts.length <= 2) return { pkg: top, layer, folder: "" };
  return { pkg: `${top}/${parts[1]}`, layer, folder: parts.slice(2, -1).join("/") };
}

const isPascal = (s: string) => /^[A-Z][A-Za-z0-9]*$/.test(s);

function kindOf(path: string, components: string[]): FileKind {
  const base = path.split("/").pop() ?? "";
  if (path.startsWith("src/app/")) {
    if (/^page\.tsx?$/.test(base)) return "page";
    if (/^layout\.tsx?$/.test(base)) return "layout";
    if (/^route\.tsx?$/.test(base)) return "route";
  }
  if (/^use[A-Z]/.test(base)) return "hook";
  if (base.endsWith(".tsx") && components.length) return "component";
  return "module";
}

const EXTS = ["", ".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"];

/** An import specifier as a file in `known`, or undefined for packages and files outside src. */
export function resolveImport(from: string, spec: string, known: Set<string>): string | undefined {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) {
    const out = from.split("/").slice(0, -1);
    for (const seg of spec.split("/")) {
      if (seg === "..") out.pop();
      else if (seg !== ".") out.push(seg);
    }
    base = out.join("/");
  } else return undefined;
  for (const e of EXTS) if (known.has(base + e)) return base + e;
  return undefined;
}

interface Parsed {
  client: boolean;
  components: string[];
  /** Local name → [file, name there ("default", "*" or the export)]. */
  bindings: Map<string, [string, string]>;
  /** Exported name → [file, name there], for `export { X } from` and `export * from`. */
  reExports: Map<string, [string, string]>;
  starFrom: string[];
  imports: Set<string>;
  tags: Map<string, number>;
  extends: Extend[];
}

function parse(path: string, text: string, known: Set<string>): Parsed {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const p: Parsed = {
    client: /^\s*["']use client["']/.test(text),
    components: [],
    bindings: new Map(),
    reExports: new Map(),
    starFrom: [],
    imports: new Set(),
    tags: new Map(),
    extends: [],
  };
  const resolve = (spec: string) => resolveImport(path, spec, known);
  const typeName = (n: ts.Node) => n.getText(sf).replace(/<[\s\S]*$/, "");

  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const file = resolve(n.moduleSpecifier.text);
      if (file) {
        p.imports.add(file);
        const c = n.importClause;
        if (c?.name) p.bindings.set(c.name.text, [file, "default"]);
        const nb = c?.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) p.bindings.set(nb.name.text, [file, "*"]);
        if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) p.bindings.set(el.name.text, [file, (el.propertyName ?? el.name).text]);
      }
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      const file = resolve(n.moduleSpecifier.text);
      if (file) {
        p.imports.add(file);
        if (!n.exportClause) p.starFrom.push(file);
        else if (ts.isNamedExports(n.exportClause))
          for (const el of n.exportClause.elements) p.reExports.set(el.name.text, [file, (el.propertyName ?? el.name).text]);
      }
    } else if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteral(n.arguments[0]) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const file = resolve(n.arguments[0].text);
      if (file) p.imports.add(file);
    } else if (ts.isFunctionDeclaration(n) && n.name && isPascal(n.name.text)) {
      p.components.push(n.name.text);
    } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isPascal(n.name.text) && n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer) || ts.isCallExpression(n.initializer))) {
      // const X = () => …, memo(…), forwardRef(…), dynamic(…)
      const init = n.initializer;
      if (!ts.isCallExpression(init) || /^(React\.)?(memo|forwardRef|lazy)$|^dynamic$/.test(init.expression.getText(sf))) p.components.push(n.name.text);
    } else if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(sf);
      if (/^[A-Z]/.test(tag) || tag.includes(".")) p.tags.set(tag, (p.tags.get(tag) ?? 0) + 1);
    }
    if ((ts.isInterfaceDeclaration(n) || ts.isClassDeclaration(n)) && n.name && n.heritageClauses) {
      for (const h of n.heritageClauses) for (const t of h.types) p.extends.push({ name: n.name.text, base: typeName(t) });
    }
    if (ts.isTypeAliasDeclaration(n) && ts.isIntersectionTypeNode(n.type)) {
      for (const t of n.type.types) if (ts.isTypeReferenceNode(t)) p.extends.push({ name: n.name.text, base: typeName(t) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  p.components = [...new Set(p.components)];
  return p;
}

/** Follows barrels (`export { X } from`, `export * from`) to the file that defines `name`. */
function definer(file: string, name: string, parsed: Map<string, Parsed>, depth = 0): string {
  const p = parsed.get(file);
  if (!p || depth > 6 || name === "default" || name === "*") return file;
  const re = p.reExports.get(name);
  if (re) return definer(re[0], re[1], parsed, depth + 1);
  if (p.components.includes(name)) return file;
  for (const star of p.starFrom) {
    const s = parsed.get(star);
    if (s && (s.components.includes(name) || s.reExports.has(name) || s.starFrom.length)) {
      const found = definer(star, name, parsed, depth + 1);
      if (parsed.get(found)?.components.includes(name)) return found;
    }
  }
  return file;
}

/** The whole map from file texts keyed by repo path (`src/...`). Test files are left out. */
export function buildStructure(sources: Record<string, string>): Structure {
  const paths = Object.keys(sources).filter((f) => !/\.test\.tsx?$/.test(f)).sort();
  const known = new Set(paths);
  const parsed = new Map(paths.map((f) => [f, parse(f, sources[f], known)] as const));

  const files: FileNode[] = paths.map((path) => {
    const p = parsed.get(path)!;
    const where = packageOf(path);
    const renders: Render[] = [];
    for (const [tag, count] of p.tags) {
      const [head, ...rest] = tag.split(".");
      const b = p.bindings.get(head);
      let file: string | undefined;
      if (b) file = b[1] === "*" && rest.length ? definer(b[0], rest[rest.length - 1], parsed) : definer(b[0], b[1], parsed);
      else if (p.components.includes(head)) file = path;
      if (file) renders.push({ tag, file, count });
    }
    const exts = p.extends.map((e) => {
      const b = p.bindings.get(e.base.split(".")[0]);
      const file = b ? b[0] : undefined;
      return file ? { ...e, file } : e;
    });
    return {
      path, ...where,
      kind: kindOf(path, p.components),
      client: p.client,
      components: p.components,
      imports: [...p.imports].sort(),
      renders,
      extends: exts,
      lines: sources[path].split("\n").length,
    };
  });

  const pkgs = new Map<string, PackageNode>();
  for (const f of files) {
    const k = pkgs.get(f.pkg) ?? { id: f.pkg, layer: f.layer, files: 0, lines: 0, components: 0, folders: {}, dependsOn: {}, usedBy: {} };
    k.files++;
    k.lines += f.lines;
    k.components += f.components.length;
    k.folders[f.folder] = (k.folders[f.folder] ?? 0) + 1;
    pkgs.set(f.pkg, k);
  }
  const byPath = new Map(files.map((f) => [f.path, f]));
  const upward: UpwardImport[] = [];
  for (const f of files) {
    for (const i of f.imports) {
      const t = byPath.get(i)!;
      if (t.pkg === f.pkg) continue;
      const a = pkgs.get(f.pkg)!, b = pkgs.get(t.pkg)!;
      a.dependsOn[t.pkg] = (a.dependsOn[t.pkg] ?? 0) + 1;
      b.usedBy[f.pkg] = (b.usedBy[f.pkg] ?? 0) + 1;
      if (LAYERS.indexOf(t.layer) < LAYERS.indexOf(f.layer)) upward.push({ from: f.path, to: t.path });
    }
  }
  const packages = [...pkgs.values()].sort((a, b) => LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer) || a.id.localeCompare(b.id));
  return { files, packages, upward };
}

/** Files that import `path`, and files that render a component from it. */
export function usersOf(s: Structure, path: string): { importedBy: string[]; renderedBy: string[]; extendedBy: { file: string; name: string; base: string }[] } {
  const importedBy: string[] = [], renderedBy: string[] = [], extendedBy: { file: string; name: string; base: string }[] = [];
  for (const f of s.files) {
    if (f.imports.includes(path)) importedBy.push(f.path);
    if (f.path !== path && f.renders.some((r) => r.file === path)) renderedBy.push(f.path);
    for (const e of f.extends) if (e.file === path) extendedBy.push({ file: f.path, name: e.name, base: e.base });
  }
  return { importedBy, renderedBy, extendedBy };
}

export interface TreeNode {
  file: string;
  /** Tags it is rendered as by its parent. */
  tags: string[];
  children: TreeNode[];
  /** Already shown above on this branch, or cut by depth. */
  cut?: "cycle" | "depth";
}

/** What a file renders, file by file, down to `depth`. A file already on the branch is marked, not expanded again. */
export function renderTree(s: Structure, root: string, depth = 8): TreeNode {
  const byPath = new Map(s.files.map((f) => [f.path, f]));
  const grow = (file: string, tags: string[], seen: Set<string>, d: number): TreeNode => {
    if (seen.has(file)) return { file, tags, children: [], cut: "cycle" };
    const f = byPath.get(file);
    const kids = new Map<string, string[]>();
    for (const r of f?.renders ?? []) if (r.file !== file) kids.set(r.file, [...(kids.get(r.file) ?? []), r.tag]);
    if (d >= depth && kids.size) return { file, tags, children: [], cut: "depth" };
    const next = new Set(seen).add(file);
    return { file, tags, children: [...kids].map(([k, t]) => grow(k, t, next, d + 1)) };
  };
  return grow(root, [], new Set(), 0);
}

/** The Next.js routes: each page with the URL it serves. */
export function routes(s: Structure): { url: string; file: string }[] {
  return s.files
    .filter((f) => f.kind === "page")
    .map((f) => ({ url: "/" + f.folder.split("/").filter((seg) => seg && !/^\(.*\)$/.test(seg)).join("/"), file: f.path }))
    .sort((a, b) => a.url.localeCompare(b.url));
}
