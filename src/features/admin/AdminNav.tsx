"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_PAGES } from "./registry";

const TAB = "rounded-md px-3 py-1.5 transition";
const IDLE = "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200";
const ACTIVE = "bg-amber-500/20 text-amber-100";

/** Tabs across the /admin pages: the index and every page in the registry, with the way over to the dev tools. */
export default function AdminNav() {
  const path = usePathname();
  const tabs = [{ href: "/admin", label: "All pages" }, ...ADMIN_PAGES];
  return (
    <nav aria-label="Admin" className="mb-4 flex flex-wrap items-center gap-1 border-b border-slate-800 pb-2 text-sm">
      {tabs.map((t) => {
        const active = path === t.href || (t.href !== "/admin" && path.startsWith(`${t.href}/`));
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`${TAB} ${active ? ACTIVE : IDLE}`}>
            {t.label}
          </Link>
        );
      })}
      <Link href="/dev" className={`${TAB} ml-auto text-slate-400 hover:bg-slate-800/60 hover:text-slate-100`}>
        Dev tools →
      </Link>
    </nav>
  );
}
