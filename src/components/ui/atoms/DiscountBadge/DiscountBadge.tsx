/**
 * The early price's mark, "50% off - Early access": a red pill next to a discounted price, on every page that quotes one (plan cards,
 * the home Pricing section, /kickstarter). Red only here; anywhere else on those pages red means an error. `size` lg is for
 * a price card's heading, xl stands in for the big number of a stat tile, sm sits beside a price in a line.
 */
const SIZES = { sm: "px-2 py-0.5 text-[11px]", lg: "px-3 py-1 text-sm", xl: "px-5 py-2 text-3xl" } as const;

export function DiscountBadge({ percent, size = "sm", className = "" }: { percent: number; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-red-500 font-semibold text-white ${s} ${className}`}>{percent}% off - Early access</span>;
}
