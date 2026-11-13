"use client";

import { useEffect, useRef } from "react";
import { registerAgentTools, type AgentTool } from "@/lib/webmcp";

export { hasBrowserAgentApi } from "@/lib/webmcp";
import { authoringGuide, insertExercise, readExerciseReply, readNoteReply, readPlanReply, removeExercise, writeExercise, writeNote } from "../model/agentBlocks";
import { catalogue } from "../model/catalogue";
import { randomId } from "../model/exerciseIds";
import type { Block, StoredPlan } from "../model/types";

const WHERE = {
  type: "object",
  description: "Which exercise, as the week shows it: { \"day\": 1-7, \"exercise\": 1-5 }.",
  properties: { day: { type: "integer" }, exercise: { type: "integer" } },
  required: ["day", "exercise"],
};
// either form: a JSON object, or the same as text
const BLOCK = { description: "The block as one JSON object (or that object as text): title, optional choice, cells; on the plan with the exercise's metadata." };

const guide: AgentTool = {
  name: "get_authoring_guide",
  description: "How to write a block for attunr: the cell and tool formats, which tool for what, the rules for a good exercise, examples, and what a note is. Read it before writing or changing a block.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true },
  execute: () => authoringGuide(catalogue()),
};

/** The latest value, for tools registered once. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * The notes creator's tools for the browser's AI (WebMCP): the guide, read_block (the note) and write_block (the whole note,
 * read by the one parser and shown at once). Registered while mounted.
 */
export function useNoteAgentTools(block: Block | null, onChange: (b: Block) => void): void {
  const latest = useLatest({ block, onChange });
  useEffect(
    () =>
      registerAgentTools([
        guide,
        {
          name: "read_block",
          description: "The note on the page, as JSON.",
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true },
          execute: () => (latest.current.block ? readNoteReply(latest.current.block) : "The page has no note open."),
        },
        {
          name: "write_block",
          description: "Replace the note on the page with this one. The page checks it like a paste and answers with what it changed or left out; fix those and send the whole note again.",
          inputSchema: { type: "object", properties: { block: BLOCK }, required: ["block"] },
          execute: (input) => {
            const r = writeNote(input.block);
            if (r.block) {
              // the next call in the same turn reads this note, not the one before the page re-renders
              latest.current = { ...latest.current, block: r.block };
              latest.current.onChange(r.block);
            }
            return r.reply;
          },
        },
      ]),
    [latest],
  );
}

/**
 * The plan page's tools while a plan runs: the guide, read_plan, read_block, write_block, insert_block and remove_block. A
 * change is saved at once through `editDay`: a rewritten exercise is a new one (its stars cleared), a day keeps 2 to 5.
 */
export function usePlanAgentTools(plan: StoredPlan | null, onChange: (p: StoredPlan) => void, editing: number | null = null): void {
  const latest = useLatest({ plan, onChange, editing });
  const running = plan !== null;
  useEffect(() => {
    if (!running) return;
    const withPlan = (f: (p: StoredPlan) => { plan: StoredPlan | null; reply: string }) => {
      const p = latest.current.plan;
      if (!p) return "No plan is running.";
      const r = f(p);
      if (r.plan) {
        // the next call in the same turn starts from this plan, not the one before the page re-renders
        latest.current = { ...latest.current, plan: r.plan };
        latest.current.onChange(r.plan);
      }
      return r.reply;
    };
    return registerAgentTools([
      guide,
      {
        name: "read_plan",
        description: "The running week: every day's exercises as JSON, each with how it went (its stars, done, or not rated).",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: () => (latest.current.plan ? readPlanReply(latest.current.plan) : "No plan is running."),
      },
      {
        name: "read_block",
        description: "One exercise of the running week, as JSON, with how it went.",
        inputSchema: { type: "object", properties: { where: WHERE }, required: ["where"] },
        annotations: { readOnlyHint: true },
        execute: (input) => (latest.current.plan ? readExerciseReply(latest.current.plan, input.where) : "No plan is running."),
      },
      {
        name: "write_block",
        description: "Replace one exercise of the running week. It is saved at once as a new exercise: its stars and tick are cleared. The page answers with what it changed or left out.",
        inputSchema: { type: "object", properties: { where: WHERE, block: BLOCK }, required: ["where", "block"] },
        execute: (input) => withPlan((p) => writeExercise(p, input.where, input.block, catalogue(), randomId, latest.current.editing)),
      },
      {
        name: "insert_block",
        description: "Add an exercise to a day of the running week, before the exercise numbered in where (one past the last: at the end). A day has 2 to 5 exercises.",
        inputSchema: { type: "object", properties: { where: WHERE, block: BLOCK }, required: ["where", "block"] },
        execute: (input) => withPlan((p) => insertExercise(p, input.where, input.block, catalogue(), randomId, latest.current.editing)),
      },
      {
        name: "remove_block",
        description: "Take an exercise out of a day of the running week. A day keeps at least 2 exercises.",
        inputSchema: { type: "object", properties: { where: WHERE }, required: ["where"] },
        execute: (input) => withPlan((p) => removeExercise(p, input.where, randomId, latest.current.editing)),
      },
    ]);
  }, [running, latest]);
}
