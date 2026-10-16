/** The Music Kit wordmark: soft Fraunces serif, "Kit" in the accent italic. */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`whitespace-nowrap leading-none tracking-tight text-slate-100 ${className}`}
      style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 72' }}
    >
      <span className="font-semibold">Music</span>
      <span className="ml-[0.18em] font-light italic text-sky-300">Kit</span>
    </span>
  );
}
