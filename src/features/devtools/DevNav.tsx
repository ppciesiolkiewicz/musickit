"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEV_TOOLS } from "./registry";

/** Tabs across the /dev pages: the index and every tool in the registry. */
export default function DevNav() {
  const path = usePathname();
  const tabs = [{ href: "/dev", label: "All tools" }, ...DEV_TOOLS];
  return (
    <nav aria-label="Dev tools" className="mb-4 flex flex-wrap gap-1 border-b border-slate-800 pb-2 text-sm">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition ${active ? "bg-sky-500/15 text-sky-200" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
