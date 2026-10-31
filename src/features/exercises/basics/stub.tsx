/** The placeholder a stub tool shows until its real view exists: its name and what the AI set. */
export function StubView({ name, settings }: { name: string; settings: string[] }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600 p-4">
      <p className="text-sm font-medium text-slate-300">Stub exercise: {name}</p>
      <p className="mt-1 text-xs text-slate-500">{settings.join(" · ")}</p>
    </div>
  );
}

/** "strings 6, 5" or "all strings" (6 = low E). */
export const stringsLabel = (strings?: number[]) => (strings?.length ? `${strings.length > 1 ? "strings" : "string"} ${strings.join(", ")}` : "all strings");
