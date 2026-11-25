"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/features/account/model";
import { DEV_GROUPS, TONE_CLASSES, type DevTone } from "./registry";

const TAB = "rounded-md px-2.5 py-1 transition";

/**
 * Tabs across the /dev pages: the index, then every tool in the registry under its group's name, and the way over to
 * the content tools and /admin, each only when the viewer may open it (`open`).
 */
export default function DevNav({ open }: { open: readonly Permission[] }) {
  const path = usePathname();
  const tab = (t: { href: string; label: string }, tone: DevTone) => {
    const active = path === t.href || (t.href !== "/dev" && path.startsWith(`${t.href}/`));
    return (
      <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`${TAB} ${active ? TONE_CLASSES[tone].active : TONE_CLASSES[tone].tab}`}>
        {t.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Dev tools" className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-slate-800 pb-2 text-sm">
      <div className="flex">{tab({ href: "/dev", label: "All tools" }, "index")}</div>
      {DEV_GROUPS.map((g) => (
        <div key={g.title} role="group" aria-label={g.title} className="flex flex-col gap-0.5">
          <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.title}</span>
          <div className="flex flex-wrap gap-0.5">{g.tools.map((t) => tab(t, g.tone))}</div>
        </div>
      ))}
      <div className="ml-auto flex">
        {open.includes("content") && (
          <Link href="/admin/content" className={`${TAB} ${TONE_CLASSES.stories.tab}`}>
            Content →
          </Link>
        )}
        {(open.includes("admin") || open.includes("content")) && (
          <Link href="/admin" className={`${TAB} text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200`}>
            All admin →
          </Link>
        )}
      </div>
    </nav>
  );
}
