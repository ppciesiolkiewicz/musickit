import Link from "next/link";
import ContentShell from "@/features/devtools/ContentShell";
import { CONTENT_TOOLS, TONE_CLASSES } from "@/features/devtools/registry";

/** The /admin/content index: a card for each content tool. */
export default function ContentIndex() {
  const tone = TONE_CLASSES.stories;
  return (
    <ContentShell wide>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className={`block h-full rounded-xl border bg-slate-900/60 p-4 transition ${tone.card}`}>
              <span className={`font-semibold ${tone.label}`}>{t.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{t.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ContentShell>
  );
}
