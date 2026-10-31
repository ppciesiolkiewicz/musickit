/** A run of display text; `json` marks an indented JSON value. */
export interface Segment {
  text: string;
  json: boolean;
}

/** The JSON value a block of text holds, indented; null if it isn't a whole JSON object or array. */
function indent(block: string): string | null {
  const t = block.trim();
  if (!/^[[{]/.test(t)) return null;
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return null;
  }
}

/** Joins neighbouring plain runs, so a part reads as few segments as it can. */
function push(out: Segment[], text: string, json: boolean) {
  const last = out[out.length - 1];
  if (last && !last.json && !json) last.text += text;
  else out.push({ text, json });
}

/**
 * Text for reading, cut into plain and JSON runs, the JSON indented: the body of every ```json fence, and outside fences any
 * line that is a whole JSON object or array. For display only; the prompt keeps its compact JSON.
 */
export function prettyJsonSegments(text: string): Segment[] {
  const out: Segment[] = [];
  text.split(/(```json[^\n]*\n[\s\S]*?\n```)/).forEach((chunk, i) => {
    if (i % 2 === 1) {
      const [, open, body, close] = chunk.match(/^(```json[^\n]*\n)([\s\S]*?)(\n```)$/)!;
      const json = indent(body);
      push(out, open, false);
      push(out, json ?? body, json !== null);
      push(out, close, false);
      return;
    }
    chunk.split("\n").forEach((line, li) => {
      if (li > 0) push(out, "\n", false);
      const json = indent(line);
      push(out, json ?? line, json !== null);
    });
  });
  return out.filter((s) => s.text);
}

/** `prettyJsonSegments` as one string. */
export const prettyJson = (text: string) => prettyJsonSegments(text).map((s) => s.text).join("");

export type JsonTokenKind = "key" | "string" | "number" | "literal" | "punct" | "space";

/** Indented JSON cut into tokens for colouring; joined back they give the input. */
export function jsonTokens(json: string): { text: string; kind: JsonTokenKind }[] {
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])|(\s+)/g;
  const out: { text: string; kind: JsonTokenKind }[] = [];
  for (const m of json.matchAll(re)) {
    if (m[1] !== undefined) {
      out.push({ text: m[1], kind: m[2] ? "key" : "string" });
      if (m[2]) out.push({ text: m[2], kind: "punct" });
    } else if (m[3] !== undefined) out.push({ text: m[3], kind: "number" });
    else if (m[4] !== undefined) out.push({ text: m[4], kind: "literal" });
    else if (m[5] !== undefined) out.push({ text: m[5], kind: "punct" });
    else out.push({ text: m[6], kind: "space" });
  }
  return out;
}
