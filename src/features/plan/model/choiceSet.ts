/**
 * What one choice of a curated block changes in the block (block-ids-and-choices design, Part 2): `tools`, tool props set
 * over the block's tools (by tool type, every tool of that type; or by `#n`, the n-th tool cell counted from 0 through
 * the sections as `toolsOf` counts them), and `params`, a few words of its own that fill `{{=name}}` in the title,
 * headings, text and lists. So one block holds the same drill at several levels without a copy: the words that differ
 * are a param, the settings that differ are `tools`. `key` and `bpm` are not params: they are moves (`moves.ts`).
 *
 * Applied to the raw seed exercise (`exerciseOf`) before it is parsed, so a set prop is checked by the tool's own
 * parser, and to a stored block's content (`composeBlocks`). Never stored applied: the block keeps its own content and
 * each choice its set (`choices.set`).
 */

/** A choice's changes to its block. Both parts optional; `{}` is the block as written. */
export interface ChoiceSet {
  tools?: Record<string, Record<string, unknown>>;
  params?: Record<string, string>;
}

/** `{{=name}}` of a choice param (not `key` or `bpm`, which are moves). */
const PARAM = /\{\{=([a-z][a-z0-9]*)\}\}/g;
const MOVE_PARAMS = new Set(["key", "bpm"]);
const isParamName = (n: string) => /^[a-z][a-z0-9]*$/.test(n) && !MOVE_PARAMS.has(n);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** A stored `choices.set` (or a file's `set` and `params`) read as a ChoiceSet; anything else is `{}`. */
export function readChoiceSet(raw: unknown): ChoiceSet {
  if (!isObj(raw)) return {};
  const out: ChoiceSet = {};
  if (isObj(raw.tools)) {
    const tools = Object.fromEntries(Object.entries(raw.tools).filter(([, v]) => isObj(v))) as ChoiceSet["tools"];
    if (Object.keys(tools!).length) out.tools = tools;
  }
  if (isObj(raw.params)) {
    const params = Object.fromEntries(Object.entries(raw.params).filter(([k, v]) => isParamName(k) && typeof v === "string")) as Record<string, string>;
    if (Object.keys(params).length) out.params = params;
  }
  return out;
}

export const isEmptyChoiceSet = (s: ChoiceSet | null | undefined): boolean => !s || (!s.tools && !s.params);

const fill = (text: unknown, params: Record<string, string>): unknown =>
  typeof text === "string" && text.includes("{{=") ? text.replace(PARAM, (m, n: string) => (n in params ? params[n] : m)) : text;

/**
 * The block (or raw exercise) with a choice's set applied: tool props laid over the tools it names (a prop set to null
 * is taken out), params filled. Anything that is not a cell list is left as it is. The input is not changed.
 */
export function applyChoiceSet<T extends { title?: unknown; cells?: unknown }>(block: T, set: ChoiceSet | null | undefined): T {
  if (isEmptyChoiceSet(set)) return block;
  const tools = set!.tools ?? {};
  const params = set!.params ?? {};
  let n = 0;
  const tool = (t: Obj): Obj => {
    const at = n++;
    const over = { ...(typeof t.type === "string" ? tools[t.type] : undefined), ...tools[`#${at}`] };
    if (!Object.keys(over).length) return t;
    const out: Obj = { ...t };
    for (const [k, v] of Object.entries(over)) {
      if (k === "type") continue;
      if (v === null) delete out[k];
      else out[k] = v;
    }
    return out;
  };
  const cell = (c: unknown): unknown => {
    if (!isObj(c)) return c;
    if (c.type === "tool" && isObj(c.tool)) return { ...c, tool: tool(c.tool) };
    if (c.type === "text") return { ...c, text: fill(c.text, params) };
    if (c.type === "list" && Array.isArray(c.items)) return { ...c, items: c.items.map((i) => fill(i, params)) };
    if (c.type === "section") return { ...c, heading: fill(c.heading, params), cells: Array.isArray(c.cells) ? c.cells.map(cell) : c.cells };
    return c;
  };
  return { ...block, title: fill(block.title, params), cells: Array.isArray(block.cells) ? block.cells.map(cell) : block.cells };
}

/** The `{{=name}}` params a block's words use (not `key` or `bpm`). */
export function paramsUsed(block: { title?: unknown; cells?: unknown }): Set<string> {
  const out = new Set<string>();
  const scan = (t: unknown) => {
    if (typeof t === "string") for (const m of t.matchAll(PARAM)) if (!MOVE_PARAMS.has(m[1])) out.add(m[1]);
  };
  const cell = (c: unknown) => {
    if (!isObj(c)) return;
    if (c.type === "text") scan(c.text);
    if (c.type === "list" && Array.isArray(c.items)) c.items.forEach(scan);
    if (c.type === "section") {
      scan(c.heading);
      if (Array.isArray(c.cells)) c.cells.forEach(cell);
    }
  };
  scan(block.title);
  if (Array.isArray(block.cells)) block.cells.forEach(cell);
  return out;
}

/** The tool types of a block's tool cells, in the order `#n` counts them. */
function toolTypes(cells: unknown): string[] {
  const out: string[] = [];
  const cell = (c: unknown) => {
    if (!isObj(c)) return;
    if (c.type === "tool" && isObj(c.tool)) out.push(String(c.tool.type));
    if (c.type === "section" && Array.isArray(c.cells)) c.cells.forEach(cell);
  };
  if (Array.isArray(cells)) cells.forEach(cell);
  return out;
}

/**
 * What is wrong with one choice's set against its block, worded for `seed check`: a tool key that names no tool, a
 * set `type`, a param the words don't use, a param the words use and the choice doesn't fill, a bad param name.
 */
export function choiceSetProblems(block: { title?: unknown; cells?: unknown }, raw: { set?: unknown; params?: unknown }, where: string): string[] {
  const out: string[] = [];
  const types = toolTypes(block.cells);
  if (raw.set !== undefined) {
    if (!isObj(raw.set)) out.push(`${where}: "set" is not an object of tool props.`);
    else
      for (const [k, v] of Object.entries(raw.set)) {
        const n = /^#(\d+)$/.exec(k);
        if (n ? Number(n[1]) >= types.length : !types.includes(k)) out.push(`${where}: "set" names "${k}", but the block has no such tool${n ? ` (it has ${types.length} tools, counted from #0)` : ""}.`);
        if (!isObj(v)) out.push(`${where}: "set.${k}" is not an object of tool props.`);
        else if ("type" in v) out.push(`${where}: "set.${k}" sets "type": another tool is another block.`);
      }
  }
  const used = paramsUsed(block);
  const given = isObj(raw.params) ? raw.params : {};
  if (raw.params !== undefined && !isObj(raw.params)) out.push(`${where}: "params" is not an object of words.`);
  for (const [k, v] of Object.entries(given)) {
    if (!isParamName(k)) out.push(`${where}: param "${k}" is not one lowercase word (and not key or bpm, which are moves).`);
    else if (!used.has(k)) out.push(`${where}: param "${k}" is set but the words never write {{=${k}}}.`);
    if (typeof v !== "string" || !v.trim()) out.push(`${where}: param "${k}" is not words.`);
  }
  for (const k of used) if (!(k in given)) out.push(`${where}: the words write {{=${k}}} but this choice gives no "${k}" in "params".`);
  return out;
}
