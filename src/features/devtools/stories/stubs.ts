import type { PropDoc } from "@/features/exercises/docs";
import type { Props, Story } from "./stories";

/*
 * Stubs for the tools the seed blocks asked for and the app doesn't have yet (tasks.txt, TaskSeries MissingTools). A stub
 * is only a story: it is not in TOOLS, so the AI plan prompt never offers it and no seed file can use it. Each one shows
 * what the tool is for, which blocks wait on it, what is still open, and the props it might take, so the shape can be
 * argued over here before it is built. Building one means a real tool in TOOLS and deleting its stub.
 *
 * Only the new tools are here; with all six built (2026-11-22) the list is empty until the next one is asked for. A missing prop or bug on a tool that exists (MissingTools4-7, 9-13) is that tool's work.
 */

export interface StubSpec {
  id: string;
  title: string;
  /** the MissingTools task it comes from */
  task: string;
  what: string;
  /** the seed steps that wait on it, as tasks.txt names them */
  waits: string;
  open?: string;
  keywords: string[];
  props: PropDoc[];
  stories: Story[];
}

/** A hand-written story of a stub. */
export const hand = (name: string, props: Props): Story => ({ name, props, from: "hand" });
/** A planned prop of a stub. */
export const p = (name: string, type: string, description: string, required = false): PropDoc => ({ name, type, required, description });

export const STUBS: StubSpec[] = [];
