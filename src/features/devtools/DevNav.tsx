"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEV_TOOLS, TONE_CLASSES, type DevTone } from "./registry";

/** Tabs across the /dev pages: the index and every tool in the registry. */
export default function DevNav() {
  const path = usePathname();
  const tabs: { href: string; label: string; tone: DevTone }[] = [{ href: "/dev", label: "All tools", tone: "index" }, ...DEV_TOOLS];
  return (
    <nav aria-label="Dev tools" className="mb-4 flex flex-wrap gap-1 border-b border-slate-800 pb-2 text-sm">
      {tabs.map((t) => {
        const active = path === t.href;
        const tone = TONE_CLASSES[t.tone];
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition ${active ? tone.active : tone.tab}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
