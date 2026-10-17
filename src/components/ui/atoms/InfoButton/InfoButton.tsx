/** The small round (i) that opens an explanation. */
export function InfoButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] normal-case tracking-normal ${open ? "border-sky-400 bg-sky-500/20 text-sky-200" : "border-slate-600 text-slate-400 hover:border-slate-400"}`}
    >
      i
    </button>
  );
}
