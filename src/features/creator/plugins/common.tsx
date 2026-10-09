"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";

export const pbtn = "grid h-7 min-w-7 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** The page every plugin has: a heading line and the body. `general` marks the version shown with no key. */
export function Body({ title, aside, general, children }: { title: ReactNode; aside?: ReactNode; general?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col gap-2 p-2 text-sm text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-slate-100">{title}</h3>
        {general && <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">general</span>}
        <span className="ml-auto flex items-center gap-1.5">{aside}</span>
      </div>
      {children}
    </div>
  );
}

export function PlayButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className={pbtn} onClick={onClick} title={label} aria-label={label}>
      <Icon name="play" size={14} fill />
    </button>
  );
}

export const Hint = ({ children }: { children: ReactNode }) => <p className="text-xs text-slate-500">{children}</p>;
