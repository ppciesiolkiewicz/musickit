import { optionText } from "@/features/exercises/basics/choice";
import type { ChoiceOption } from "../../model/tools";

/**
 * A note's key bar: the block's open choice, in words ("A · Minor pentatonic"), above its cells. Read-only for now; the
 * key selector (a variant of the choice's chips) replaces it when notes move onto blocks.
 */
export default function KeyBar({ value, measure }: { value: ChoiceOption; measure: string }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 border-b border-slate-800 pb-3 ${measure}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Key</span>
      <span className="text-sm font-semibold text-slate-100">{optionText(value)}</span>
    </p>
  );
}
