"use client";

import { useEffect, useRef } from "react";

/**
 * WebMCP: the page offers tools to an AI built into the browser (Chrome's `document.modelContext`, Chrome 146+ behind
 * a flag, older previews on `navigator.modelContext`, or a polyfill). With it, the player's browser AI reads the prompt
 * and hands its plan straight back, no copy and paste. Without it this does nothing.
 */
type AgentTool = {
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

/**
 * While mounted, offers `get_practice_plan_prompt` (the prompt the plan is written from) and `submit_practice_plan`
 * (the AI's reply: checked like a paste, put in the paste box; the answer says what to fix, so the AI can send again).
 * `submit` returns the text the AI reads back. Registered once; the latest prompt and submit are read through refs.
 */
export function useBrowserAgentTools(prompt: string, submit: (reply: string) => string): void {
  const promptRef = useRef(prompt);
  const submitRef = useRef(submit);
  useEffect(() => {
    promptRef.current = prompt;
    submitRef.current = submit;
  });
  useEffect(() => {
    const mc = modelContext();
    if (!mc) return;
    const controller = new AbortController();
    const tools: AgentTool[] = [
      {
        name: "get_practice_plan_prompt",
        description: "The attunr practice plan prompt: who the student is and the exact JSON plan format to write. Read it, write the plan, then send it with submit_practice_plan.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: () => promptRef.current,
      },
      {
        name: "submit_practice_plan",
        description: "Send the practice plan you wrote (the JSON object the prompt asks for) to the page. The page checks it and answers with what it changed or dropped; fix those and send the whole plan again. The student then presses Build my plan.",
        inputSchema: {
          type: "object",
          properties: { plan: { type: "string", description: "The whole plan as one JSON object (text)." } },
          required: ["plan"],
        },
        execute: (input) => {
          const plan = input.plan;
          return submitRef.current(typeof plan === "string" ? plan : JSON.stringify(plan));
        },
      },
    ];
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
  }, []);
}
