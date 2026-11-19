import type { LibraryRepo } from "@/features/library/server/repo";
import type { ComposeBlock } from "@/features/library/server/types";
import { blockIdOf, blockKeyOf } from "../model/blockId";
import { PATH, stepAt } from "../model/path";
import { candidateOf } from "./composeToday";

/*
 * For tests of the server composers: hand-made library blocks and a library that only answers `composeBlocks`. Not used
 * by the app.
 */

/**
 * A block on one path step: topic and level from the step, 5 minutes, its own title (the step and `n`), and the id the library
 * would give it (the stored exercise's block id) unless `over` names one. Its choice id is `<id>/<level>` unless `over` names one.
 */
export function stubBlock(step: string, n = 0, over: Partial<ComposeBlock> = {}): ComposeBlock {
  const at = stepAt(step);
  if (!at) throw new Error(`no step ${step}`);
  const title = `${step} #${n}`;
  const block: ComposeBlock = {
    id: "",
    choiceId: "",
    content: { title, cells: [{ type: "text", text: `Play ${title}.` }] } as ComposeBlock["content"],
    area: at.track.area,
    topic: at.track.topic,
    concepts: [],
    steps: [step],
    level: at.step.level,
    tags: [],
    slot: { minutes: 5 },
    use: { times: 0, seconds: 0 },
    mine: null,
    ...over,
  };
  const id = over.id ?? blockIdOf(blockKeyOf(candidateOf(block).exercise));
  return { ...block, id, choiceId: over.choiceId ?? `${id}/${at.step.level}` };
}

/** `per` blocks on every step of every track of the topic. */
export const topicBlocks = (topic: string, per = 2): ComposeBlock[] =>
  PATH.filter((t) => t.topic === topic).flatMap((t) => t.steps.flatMap((_, i) => Array.from({ length: per }, (__, n) => stubBlock(`${t.id}:${i + 1}`, n))));

/** A library whose `composeBlocks` gives these blocks for every player and area list, and records each call. */
export function stubLibrary(blocks: ComposeBlock[]): LibraryRepo & { calls: { player: string; areas: string[] }[] } {
  const calls: { player: string; areas: string[] }[] = [];
  const repo = {
    calls,
    async composeBlocks(player: string, areas: string[]) {
      calls.push({ player, areas });
      return structuredClone(blocks);
    },
  };
  return repo as unknown as LibraryRepo & { calls: typeof calls };
}
