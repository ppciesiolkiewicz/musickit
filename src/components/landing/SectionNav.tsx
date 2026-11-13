"use client";

import { useEffect, useState } from "react";

/**
 * A rail of links down the left edge of a long landing page, one per section, with the section in view lit. Dots only from
 * `lg`, where the page margin is narrow (the label shows on hover and focus); dots and labels from `2xl`, where the margin
 * has room. Hidden on smaller screens, where the page is read top to bottom.
 */
export default function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    // the section crossing a line 40% down the screen is the one being read
    const pick = () => {
      const line = window.innerHeight * 0.4;
      let cur: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      // before the first section (the hero) nothing is lit
      setActive(cur);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [items]);

  return (
    <nav aria-label="On this page" className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block 2xl:left-6">
      <ul className="flex flex-col gap-1">
        {items.map((i) => {
          const on = i.id === active;
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={on ? "location" : undefined}
                className="group relative flex items-center gap-3 rounded-full py-1.5 pl-1 pr-2 text-xs outline-none"
              >
                <span className={`h-2 shrink-0 rounded-full transition-all ${on ? "w-5 bg-sky-300" : "w-2 bg-slate-600 group-hover:bg-slate-300 group-focus-visible:bg-slate-300"}`} />
                <span
                  className={`whitespace-nowrap transition ${on ? "text-slate-100" : "text-slate-500 group-hover:text-slate-200"}
                    pointer-events-none absolute left-8 rounded-md bg-slate-900/95 px-2 py-1 opacity-0 shadow-lg group-hover:opacity-100 group-focus-visible:opacity-100
                    2xl:pointer-events-auto 2xl:static 2xl:bg-transparent 2xl:p-0 2xl:opacity-100 2xl:shadow-none`}
                >
                  {i.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
