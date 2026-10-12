import Link from "next/link";
import { stageHref } from "@/features/theory/course/outline";

/** A small "why this matters / try this" card at the top of an explorer, linked to the course stage that uses it. */
export default function Lesson({ why, tryThis, stage }: { why: string; tryThis: string; stage: number }) {
  return (
    <aside className="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">Why it matters</div>
        <p className="text-slate-300">{why}</p>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">Try this</div>
        <p className="text-slate-300">{tryThis}</p>
      </div>
      <Link href={stageHref(stage)} className="self-start whitespace-nowrap text-xs text-sky-300 hover:underline">Part of stage {stage} →</Link>
    </aside>
  );
}
