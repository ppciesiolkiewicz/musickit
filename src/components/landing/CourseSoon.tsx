import { STYLES, courseNote } from "@/features/styles/styles";

/** "Funk course: coming soon" in the bundles with a style course, for the styles whose course comes sooner; nothing for the rest. */
export default function CourseSoon({ className = "" }: { className?: string }) {
  return (
    <>
      {STYLES.map((s) => {
        const note = courseNote(s.id);
        return note && (
          <p key={s.id} data-style-only={s.id} className={`text-xs text-slate-400 ${className}`}>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_var(--color-emerald-400)]" />
              {note}
            </span>
          </p>
        );
      })}
    </>
  );
}
