"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/features/account/model";
import { CONTENT_TOOLS, TONE_CLASSES } from "./registry";

const TAB = "rounded-md px-2.5 py-1 transition";
const OTHER = `${TAB} text-slate-400 hover:bg-slate-800/60 hover:text-slate-100`;

/**
 * Tabs across the /admin/content pages: the index and every tool in `CONTENT_TOOLS`, then the way back to the /admin hub
 * and over to the admin pages and the dev tools, each only when the viewer may open it (`open`).
 */
export default function ContentNav({ open }: { open: readonly Permission[] }) {
  const path = usePathname();
  const tabs = [{ href: "/admin/content", label: "All tools" }, ...CONTENT_TOOLS];
  return (
    <nav aria-label="Content" className="mb-4 flex flex-wrap items-center gap-1 border-b border-slate-800 pb-2 text-sm">
      {tabs.map((t) => {
        const active = path === t.href || (t.href !== "/admin/content" && path.startsWith(`${t.href}/`));
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`${TAB} ${active ? TONE_CLASSES.stories.active : TONE_CLASSES.stories.tab}`}>
            {t.label}
          </Link>
        );
      })}
      <Link href="/admin" className={`${OTHER} ml-auto`}>
        All admin
      </Link>
      {open.includes("admin") && (
        <Link href="/admin/admin" className={OTHER}>
          Admin →
        </Link>
      )}
      {open.includes("dev") && (
        <Link href="/admin/dev" className={OTHER}>
          Dev tools →
        </Link>
      )}
    </nav>
  );
}
