import Link from "next/link";
import { findSection, sectionHref } from "@/features/course/course";
import GuideLink from "@/features/articles/ui/GuideLink";

/**
 * A small "why this matters / try this" card at the top of an explorer, linked to the course section that uses it ("stage/section")
 * and, with `guide`, to the public article on the same thing (`/learn/<guide>`), which a visitor can read without logging in.
 */
export default function Lesson({ why, tryThis, course, guide }: { why: string; tryThis: string; course: string; guide?: string }) {
  const [stage, section] = course.split("/");
  const r = findSection(stage, section);
  return (
    <aside data-tour="lesson" className="mb-4 grid gap-3 metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">Why it matters</div>
        <p className="text-slate-300">{why}</p>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">Try this</div>
        <p className="text-slate-300">{tryThis}</p>
      </div>
      {(r || guide) && (
        <div className="flex flex-col gap-1 self-start text-xs">
          {r && <Link href={sectionHref(stage, section)} className="whitespace-nowrap text-sky-300 hover:underline">In the course: {r.section.title} →</Link>}
          {guide && <GuideLink slug={guide} className="text-sky-300 hover:underline" />}
        </div>
      )}
    </aside>
  );
}
