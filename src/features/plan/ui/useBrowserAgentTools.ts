"use client";

import { useEffect, useRef } from "react";
import { registerAgentTools } from "@/lib/webmcp";
import { PROMPT_VIA_TOOLS } from "../model/agentTools";

export { hasBrowserAgentApi } from "@/lib/webmcp";

/**
 * While mounted, offers the browser's AI (WebMCP, `@/lib/webmcp`) `get_practice_plan_prompt` (the prompt the plan is
 * written from) and `submit_practice_plan` (the AI's reply: checked like a paste, put in the paste box; the answer says
 * what to fix, so the AI can send again). `submit` returns the text the AI reads back. Registered once; the latest
 * prompt and submit are read through refs.
 */
export function useBrowserAgentTools(prompt: string, submit: (reply: string) => string): void {
  const promptRef = useRef(prompt);
  const submitRef = useRef(submit);
  useEffect(() => {
    promptRef.current = prompt;
    submitRef.current = submit;
  });
  useEffect(
    () =>
      registerAgentTools([
        {
          name: "get_practice_plan_prompt",
          description: "The attunr practice plan prompt: who the student is and the exact JSON plan format to write. Read it, write the plan, then send it with submit_practice_plan.",
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true },
          execute: () => `${PROMPT_VIA_TOOLS}\n\n${promptRef.current}`,
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
      ]),
    [],
  );
}
