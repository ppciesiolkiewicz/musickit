import type { PlanReviewRow } from "@/features/userData/server/repo";

/** Every player's plan reviews, newest first; `null` when this build has no database. */
export default function PlanReviewsTable({ reviews }: { reviews: (PlanReviewRow & { userId: string })[] | null }) {
  if (!reviews) return <p className="text-sm text-slate-400">No database: set DATABASE_URL to list plan reviews.</p>;
  if (reviews.length === 0) return <p className="text-sm text-slate-400">No plan reviews yet.</p>;
  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-sm text-slate-400">Newest first, {reviews.length} shown.</p>
      <table className="w-full text-left text-sm text-slate-200">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Stars</th>
            <th className="p-2">Plan</th>
            <th className="p-2">Why</th>
            <th className="p-2">Plan id</th>
            <th className="p-2">Library plan id</th>
            <th className="p-2">User id</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={`${r.userId}:${r.planId}`} className="border-t border-slate-800 align-top">
              <td className="whitespace-nowrap p-2">{r.at.toISOString().slice(0, 16).replace("T", " ")}</td>
              <td className="p-2">{r.stars}</td>
              <td className="p-2">{r.title}</td>
              <td className="p-2">{r.why ?? ""}</td>
              <td className="p-2 font-mono text-xs">{r.planId}</td>
              <td className="p-2 font-mono text-xs">{r.libraryPlanId ?? ""}</td>
              <td className="p-2 font-mono text-xs">{r.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
