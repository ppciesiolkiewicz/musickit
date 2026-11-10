"use client";

import { useEffect, useState } from "react";
import { Popover } from "@/components/ui";
import { FOUNDING_PRICE } from "@/lib/foundingOffer";

/** How long the note stays up after a press. */
const SHOWN_MS = 5000;

/**
 * "Pay now" on the founding-partner page. Paying isn't open yet, so a press only shows a note saying so; nothing is
 * charged or sent. When sign-ups open, this is the button that goes to the checkout.
 */
export default function PayNowButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), SHOWN_MS);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Popover open={open} side="bottom" content="Sign-ups aren't open yet. Send a message below.">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ls-btn inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40"
      >
        Pay now – {FOUNDING_PRICE}
      </button>
    </Popover>
  );
}
