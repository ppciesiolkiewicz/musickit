import { TOPICS, type Topic } from "../model";

/** A topic as a tag reads on /learn: "#Singing". */
export const tagOf = (t: Topic) => `#${TOPICS[t]}`;

/** Each topic's colour, the same on a card's tag and on /learn's filter: `tag` for the card, `on`/`off` for the filter button. */
export const TOPIC_STYLE: Record<Topic, { tag: string; on: string; off: string }> = {
  singing: { tag: "border-rose-400/30 bg-rose-500/10 text-rose-200", on: "border-rose-400 bg-rose-500/20 text-rose-100", off: "border-rose-400/30 bg-slate-950/40 text-rose-200 hover:border-rose-400/60" },
  guitar: { tag: "border-amber-400/30 bg-amber-500/10 text-amber-200", on: "border-amber-400 bg-amber-500/20 text-amber-100", off: "border-amber-400/30 bg-slate-950/40 text-amber-200 hover:border-amber-400/60" },
  theory: { tag: "border-violet-400/30 bg-violet-500/10 text-violet-200", on: "border-violet-400 bg-violet-500/20 text-violet-100", off: "border-violet-400/30 bg-slate-950/40 text-violet-200 hover:border-violet-400/60" },
};
