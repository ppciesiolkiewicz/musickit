"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Copies a link to the tune (in the key and scale shown) and shows a tick for a moment once it is copied. Drawn like the
 * sing-along player's icon buttons, to sit in its row.
 */
export function ShareButton({ link }: { link: () => string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => void navigator.clipboard?.writeText(link()).then(() => setCopied(true)).catch(() => undefined);
  const title = copied ? "Link copied" : "Copy a link to this melody";
  return (
    <button type="button" onClick={copy} title={title} aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition ${copied ? "border-emerald-400/60 text-emerald-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
      <Icon name={copied ? "check" : "share-2"} size={14} />
    </button>
  );
}
