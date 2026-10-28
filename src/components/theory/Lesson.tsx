import Link from "next/link";
import { findSection, sectionHref } from "@/features/course/course";

/** A small "why this matters / try this" card at the top of an explorer, linked to the course section that uses it ("stage/section"). */
export default function Lesson({ why, tryThis, course }: { why: string; tryThis: string; course: string }) {
  const [stage, section] = course.split("/");
  const r = findSection(stage, section);
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
      {r && <Link href={sectionHref(stage, section)} className="self-start whitespace-nowrap text-xs text-sky-300 hover:underline">In the course: {r.section.title} →</Link>}
    </aside>
  );
}
