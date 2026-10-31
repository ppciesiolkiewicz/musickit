/** Indents a block of text if it parses as a JSON object or array; anything else comes back as it was. */
function indent(block: string): string {
  const t = block.trim();
  if (!/^[[{]/.test(t)) return block;
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return block;
  }
}

/**
 * Text for reading, with its JSON indented: the body of every ```json fence, and outside fences any line that is a whole
 * JSON object or array. For display only; the prompt keeps its compact JSON.
 */
export function prettyJson(text: string): string {
  return text
    .split(/(```json[^\n]*\n[\s\S]*?\n```)/)
    .map((chunk, i) => {
      if (i % 2 === 0) return chunk.split("\n").map(indent).join("\n");
      const m = chunk.match(/^(```json[^\n]*\n)([\s\S]*?)(\n```)$/)!;
      return m[1] + indent(m[2]) + m[3];
    })
    .join("");
}
