/**
 * WebMCP: a page offers tools to an AI built into the browser (Chrome's `document.modelContext`, Chrome 146+ behind a
 * flag, older previews on `navigator.modelContext`, or a polyfill). The AI calls them as plain JavaScript on the page,
 * with the player's own state; nothing goes to a server. Without the API every call here does nothing.
 */
export type AgentTool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<string> | string;
};
type ModelContext = {
  registerTool: (tool: AgentTool, options?: { signal?: AbortSignal }) => unknown;
  unregisterTool?: (name: string) => void;
};

function modelContext(): ModelContext | null {
  if (typeof window === "undefined") return null;
  const mc = (document as unknown as { modelContext?: ModelContext }).modelContext
    ?? (navigator as unknown as { modelContext?: ModelContext }).modelContext;
  return mc && typeof mc.registerTool === "function" ? mc : null;
}

/** True when the browser offers WebMCP, so an AI in the browser can call the page's tools. */
export function hasBrowserAgentApi(): boolean {
  return modelContext() !== null;
}

/** Offers `tools` to the browser's AI; the returned function takes them back. A no-op without WebMCP. */
export function registerAgentTools(tools: AgentTool[]): () => void {
  const mc = modelContext();
  if (!mc) return () => {};
  const controller = new AbortController();
  for (const tool of tools) {
    try {
      void Promise.resolve(mc.registerTool(tool, { signal: controller.signal })).catch(() => {});
    } catch {
      /* an older preview, or a name already taken */
    }
  }
  return () => {
    controller.abort();
    // previews without signal support
    for (const tool of tools) {
      try {
        mc.unregisterTool?.(tool.name);
      } catch {
        /* already gone */
      }
    }
  };
}
