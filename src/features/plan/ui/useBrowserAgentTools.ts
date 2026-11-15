"use client";

import { useEffect, useRef } from "react";
import { registerAgentTools } from "@/lib/webmcp";
import { PROMPT_VIA_TOOLS } from "../model/agentTools";

export { hasBrowserAgentApi } from "@/lib/webmcp";

/**
 * While mounted, offers the browser's AI (WebMCP, `@/lib/webmcp`) `get_practice_plan_prompt` (the prompt the plan is
 * written from), `check_practice_plan` (the AI's plan read as a paste would be, nothing on the page changed; `check`
 * returns the answer) and `submit_practice_plan` (the AI's reply: checked like a paste, put in the paste box; the answer says
 * what to fix, so the AI can send again). `submit` returns the text the AI reads back. Registered once; the latest
 * prompt and submit are read through refs.
 */
export function useBrowserAgentTools(prompt: string, submit: (reply: string) => string, check: (reply: string) => string): void {
  const promptRef = useRef(prompt);
  const submitRef = useRef(submit);
  const checkRef = useRef(check);
  useEffect(() => {
    promptRef.current = prompt;
    submitRef.current = submit;
    checkRef.current = check;
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
          name: "check_practice_plan",
          description: "Check the practice plan you wrote before you send it: the page reads it as submit_practice_plan would and answers with what it would change or drop. Nothing on the page changes. Fix those and check again until it says nothing to fix.",
          inputSchema: {
            type: "object",
            properties: { plan: { type: "string", description: "The whole plan as one JSON object (text)." } },
            required: ["plan"],
          },
          annotations: { readOnlyHint: true },
          execute: (input) => {
            const plan = input.plan;
            return checkRef.current(typeof plan === "string" ? plan : JSON.stringify(plan));
          },
        },
        {
          name: "submit_practice_plan",
          description: "Send the practice plan you wrote (the JSON object the prompt asks for) to the page. Check it with check_practice_plan first. The page checks it and answers with what it changed or dropped; fix those and send the whole plan again. The student then presses Build my plan.",
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
