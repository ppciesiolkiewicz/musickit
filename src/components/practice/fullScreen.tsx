"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import { Hint } from "@/components/ui";

const noSubscribe = () => () => {};

/**
 * A tool's view that can go full screen: in place while `full` is off; on, a page modal drawn from the body (out of any
 * card's stacking), the page behind kept still, Esc closes it (`onClose`). The same element either way, so what plays in
 * it plays on. Used by the interval singer and the pitch roll.
 */
export function FullScreenFrame({ full, onClose, label, className = "flex flex-col gap-3", frameRef, children }: {
  full: boolean;
  onClose: () => void;
  /** the dialog's name while full screen */
  label: string;
  /** the frame's classes in place; full screen it fills the screen as a column */
  className?: string;
  frameRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!full) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close.current();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [full]);

  const view = (
    <div ref={frameRef} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? label : undefined}
      className={full ? "fixed inset-0 z-[70] flex flex-col gap-3 overflow-hidden bg-slate-950 p-4 sm:p-6" : className}>
      {children}
    </div>
  );
  return full && mounted ? createPortal(view, document.body) : view;
}

/** The Full screen button: maximise while off, minimise (lit) while on. `description` says what it enlarges. */
export function FullScreenButton({ full, onClick, description }: { full: boolean; onClick: () => void; description: string }) {
  return (
    <Hint title="Full screen" description={description}>
      <button type="button" onClick={onClick} title={full ? "Close full screen (Esc)" : "Full screen"} aria-label={full ? "Close full screen (Esc)" : "Full screen"} aria-pressed={full}
        className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-1.5 transition ${full ? "border-sky-400/70 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
        <Icon name={full ? "minimize" : "maximize"} size={15} />
      </button>
    </Hint>
  );
}
