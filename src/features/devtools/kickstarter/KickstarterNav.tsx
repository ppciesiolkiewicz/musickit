"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dev/kickstarter", label: "Students" },
  { href: "/dev/kickstarter/teachers", label: "Teachers" },
];

/** The two sides of /dev/kickstarter: the offer to students, and the emails to teachers and schools. */
export default function KickstarterNav() {
  const path = usePathname();
  return (
    <nav aria-label="Kickstarter" className="mb-4 flex gap-1 text-sm">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-4 py-1.5 font-medium transition focus-visible:outline-2 focus-visible:outline-sky-400 ${active ? "bg-slate-100 text-slate-900" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
