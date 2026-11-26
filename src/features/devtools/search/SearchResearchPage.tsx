import { PHRASES_TO_CHECK, SEARCH_CHECKED, SEARCHES, SITE_TRAFFIC, SITE_TRAFFIC_MONTH, TOOLS, type Difficulty, type Persona } from "../model/searchResearch";

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  "Very hard": "bg-rose-500/20 text-rose-200",
  Hard: "bg-amber-500/20 text-amber-200",
  Medium: "bg-sky-500/20 text-sky-200",
  Easy: "bg-emerald-500/20 text-emerald-200",
};

const PERSONAS: Persona[] = ["Guitarist", "Singer", "Teacher"];

const ext = "text-sky-300 hover:underline break-all";

/** /admin/dev/search: who ranks on Google for each persona's searches (NEW21), the site traffic checked, and what to check next. */
export default function SearchResearchPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Search research</h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Who ranks on Google for what each persona searches, for the public articles in NEW21. From a US-only web search on {SEARCH_CHECKED};
          Australian results may differ. No search volumes yet. How hard is a guess from who holds the first page (big brands or small
          sites), not Ahrefs&apos; keyword difficulty. Change it in model/searchResearch.ts.
        </p>
      </div>

      {PERSONAS.map((p) => (
        <section key={p} aria-label={p} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-200">{p}</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Search</th>
                  <th className="px-3 py-2 font-medium">Who ranks</th>
                  <th className="px-3 py-2 font-medium">What wins</th>
                  <th className="px-3 py-2 font-medium">How hard</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {SEARCHES.filter((s) => s.persona === p).map((s) => (
                  <tr key={s.query} className="align-top">
                    <td className="px-3 py-2 font-medium text-slate-100">
                      {s.query}
                      {s.page && <a href={s.page} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-normal text-sky-300 hover:underline">Top page ↗</a>}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{s.ranking}</td>
                    <td className="px-3 py-2 text-slate-300">{s.wins}</td>
                    <td className="px-3 py-2"><span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs ${DIFFICULTY_CLASS[s.difficulty]}`}>{s.difficulty}</span></td>
                    <td className="px-3 py-2 text-slate-400">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section aria-label="Site traffic" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-200">Site traffic, {SITE_TRAFFIC_MONTH}</h3>
        <p className="max-w-3xl text-sm text-slate-400">Visits a month to the whole site, from every source, not only Google. The free Ahrefs checker gave the root domain for each page URL.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs text-slate-400">
              <tr><th className="px-3 py-2 font-medium">Site</th><th className="px-3 py-2 font-medium">Visits</th><th className="px-3 py-2 font-medium">Since May</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {SITE_TRAFFIC.map((t) => (
                <tr key={t.site}><td className="px-3 py-2 text-slate-100">{t.site}</td><td className="px-3 py-2 font-mono tabular-nums text-slate-100">{t.visits}</td><td className="px-3 py-2 text-slate-400">{t.trend}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="To check next" className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-200">To check next</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {TOOLS.map((t) => (
            <li key={t.url}><a href={t.url} target="_blank" rel="noreferrer" className={ext}>{t.label} ↗</a> <span className="text-slate-400">{t.note}</span></li>
          ))}
        </ul>
        <p className="text-sm text-slate-400">Phrases for the keyword generator:</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PERSONAS.map((p) => (
            <div key={p} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
              <p className="mb-1 font-medium text-slate-200">{p}</p>
              <ul className="list-disc pl-5 text-slate-300">{PHRASES_TO_CHECK[p].map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
