/** A key drawn as a key cap on a button, to show the keyboard shortcut for it. Takes its colour from the button. */
export function KeyCap({ children, className = "" }: { children: string; className?: string }) {
  return <kbd aria-hidden className={`rounded border border-current px-1 font-mono text-[10px] font-normal leading-tight opacity-70 ${className}`}>{children}</kbd>;
}
