"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import IntroPlayer from "./IntroPlayer";

/**
 * The quick tour as a small card beside other content, with a Cinema mode button that opens it over the whole page. The
 * same player stays mounted in both, so the tour keeps playing from where it was. In cinema mode Space plays and pauses,
 * and Escape or Close goes back.
 */
export default function TourCard() {
  const [cinema, setCinema] = useState(false);

  useEffect(() => {
    if (!cinema) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCinema(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [cinema]);

  return (
    <div
      role={cinema ? "dialog" : undefined}
      aria-modal={cinema || undefined}
      aria-label={cinema ? "Quick tour" : undefined}
      className={cinema ? "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/95 p-4 backdrop-blur-sm sm:p-8" : ""}
      onClick={cinema ? (e) => e.target === e.currentTarget && setCinema(false) : undefined}
    >
      <div className={cinema ? "w-full max-w-[min(72rem,calc((100dvh-17rem)*16/9))]" : ""}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">Quick tour</p>
          <button
            type="button"
            onClick={() => setCinema((c) => !c)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            <Icon name={cinema ? "x" : "maximize"} size={13} /> {cinema ? "Close" : "Cinema mode"}
          </button>
        </div>
        <IntroPlayer compact={!cinema} spaceKey={cinema} />
      </div>
    </div>
  );
}
