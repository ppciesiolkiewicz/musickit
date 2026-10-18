/** Instant fallback while a route's page loads: plain markup and a CSS spinner, no client JS, so it shows before the page's bundle arrives. */
export default function Loading() {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center text-slate-400" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-300" />
        <span className="text-xs tracking-wide">Loading…</span>
      </div>
    </div>
  );
}
