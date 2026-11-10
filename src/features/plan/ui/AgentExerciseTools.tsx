"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasBrowserAgentApi, registerAgentTools } from "@/lib/webmcp";
import type { PlanTool } from "../model/tools";

// the tool views and their parser are big: loaded only when the browser's AI uses them
const AgentToolModal = dynamic(() => import("./AgentToolModal"), { ssr: false });
const model = () => import("../model/agentTools");

/**
 * On every page (mounted in PageShell), where the browser has WebMCP (`@/lib/webmcp`): offers its AI the exercise tools
 * a plan is made of. `list_exercise_tools` reads their props, `show_exercise_tool` opens one in a dialog over the page,
 * set up as the AI wrote it and checked like a plan's tool. "Show me A minor pentatonic box 2 with a drone at 70" works
 * without a plan. Without WebMCP it draws nothing and loads nothing.
 */
export default function AgentExerciseTools() {
  const [shown, setShown] = useState<PlanTool | null>(null);
  useEffect(() => {
    if (!hasBrowserAgentApi()) return;
    return registerAgentTools([
      {
        name: "list_exercise_tools",
        description: "The attunr exercise tools (scale and chord necks, singing tools, backing band and tracks, play-alongs…) with their props, for show_exercise_tool. Pass names to read only those.",
        inputSchema: { type: "object", properties: { names: { type: "array", items: { type: "string" }, description: "Tool names to describe; none: all." } } },
        annotations: { readOnlyHint: true },
        execute: async (input) => (await model()).listToolsReply(input.names),
      },
      {
        name: "show_exercise_tool",
        description: "Open one attunr exercise tool for the student, set up with its props, in a dialog over the current page (it replaces one already open). Read the props with list_exercise_tools first. The answer says what the page changed, or why it could not show it.",
        inputSchema: {
          type: "object",
          properties: { tool: { type: "object", description: "The tool: { \"type\": a name from list_exercise_tools, ...its props }, as in a practice plan's tool section.", properties: { type: { type: "string" } }, required: ["type"] } },
          required: ["tool"],
        },
        execute: async (input) => {
          const { tool, reply } = (await model()).showToolReply(input.tool);
          if (tool) setShown(tool);
          return reply;
        },
      },
      {
        name: "close_exercise_tool",
        description: "Close the exercise tool opened with show_exercise_tool.",
        inputSchema: { type: "object", properties: {} },
        execute: () => {
          setShown(null);
          return "Closed.";
        },
      },
    ]);
  }, []);
  return shown ? <AgentToolModal tool={shown} onClose={() => setShown(null)} /> : null;
}
