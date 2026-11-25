import { ROLE_LABEL } from "@/features/account/model";
import PermissionTicks from "./PermissionTicks";
import type { SessionTimes, UserRow } from "@/features/account/server/repo";
import { migrateAnswers, type PlanAnswers } from "@/features/plan/intake/answers";
import { topicsFor } from "@/features/plan/intake/topics";
import { AREAS } from "@/features/plan/model/concepts";
import { KEY_LINES } from "@/features/plan/model/keys";
import type { PlanSummary } from "@/features/userData/server/repo";
import { VOICES } from "@/features/theory/singing";
import { noteName } from "@/features/theory/voiceRange";

/** One account with what the users list shows beside it; `times` and `plan` are null when there is none. */
export interface UserListRow {
  user: UserRow;
  times: SessionTimes | null;
  plan: PlanSummary | null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const dayTime = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");
const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id;
const times = (n: number) => (n === 1 ? "once" : `${n} times`);

/** The line under a user: the areas, the minutes a day, and how often they finished the questionnaire. */
function summary(a: PlanAnswers, answered: number): string {
  return [a.areas.map(areaLabel).join(", "), `${a.minutes} min a day`, `answered ${times(answered)}`].join(" · ");
}

/** Every answer of the latest questionnaire, by area, in the questionnaire's own words. */
function Answers({ a }: { a: PlanAnswers }) {
  const voice = a.voice?.type ? VOICES[a.voice.type].label : null;
  const range = a.voice?.range ? `${noteName(a.voice.range.low)} to ${noteName(a.voice.range.high)}` : null;
  const extra: [string, string][] = [];
  if (voice || range) extra.push(["Voice", [voice, range].filter(Boolean).join(", ")]);
  if (a.keys !== undefined) extra.push(["Keys", KEY_LINES[a.keys].name]);
  if (a.styles.trim()) extra.push(["Styles", a.styles.trim()]);
  if (a.notes.trim()) extra.push(["Notes", a.notes.trim()]);
  return (
    <div className="mt-2 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
      {a.areas.map((area) => {
        const picked = topicsFor(area).filter((t) => a.topics[t.id] !== undefined);
        return (
          <div key={area}>
            <p className="mb-1 font-medium text-slate-200">{areaLabel(area)}</p>
            {picked.length ? (
              <ul className="space-y-0.5">
                {picked.map((t) => (
                  <li key={t.id}><span className="text-slate-400">{t.label}:</span> {t.lines[a.topics[t.id]]}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No topics answered.</p>
            )}
          </div>
        );
      })}
      {extra.length > 0 && (
        <ul className="space-y-0.5 sm:col-span-2">
          {extra.map(([k, v]) => (
            <li key={k} className="whitespace-pre-wrap break-words"><span className="text-slate-400">{k}:</span> {v}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Every account with when it last logged in and was last seen (over all its browsers; nothing once it has logged out
 * everywhere), how many plans it holds, its permissions (ticked in place) and its latest questionnaire answers, folded
 * under each row. `viewerId` is the signed-in admin, whose own Admin box stays ticked; null when the viewer is not an admin (development without a login, or a signed-in person with no admin permission).
 */
export default function UsersTable({ rows, viewerId }: { rows: UserListRow[]; viewerId: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-400">
          <tr className="border-b border-slate-700">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium" title="What of /dev and /admin they may open on the live site">Permissions</th>
            <th className="py-2 pr-4 font-medium">Joined</th>
            <th className="py-2 pr-4 font-medium" title="The newest log-in over all their browsers, in UTC">Last log-in</th>
            <th className="py-2 pr-4 font-medium" title="Updated at most once a day">Last seen</th>
            <th className="py-2 font-medium" title="Their own plans, the running one and earlier ones, and plans a teacher gave">Plans</th>
          </tr>
        </thead>
        {rows.map(({ user: u, times: t, plan }) => {
          const answers = plan?.answers ? migrateAnswers(plan.answers) : null;
          return (
            <tbody key={u.id} className="border-b border-slate-800">
              <tr>
                <td className="pt-2 pr-4 text-slate-100">{u.name}</td>
                <td className="pt-2 pr-4 text-slate-300">{u.email}</td>
                <td className="pt-2 pr-4 text-slate-300">{ROLE_LABEL[u.role]}</td>
                <td className="pt-2 pr-4">
                  <PermissionTicks userId={u.id} initial={u.permissions} self={u.id === viewerId} />
                </td>
                <td className="pt-2 pr-4 tabular-nums text-slate-400">{day(u.createdAt)}</td>
                <td className="pt-2 pr-4 tabular-nums text-slate-400" title={t ? undefined : "No session: logged out everywhere, or never logged in"}>{t ? dayTime(t.lastLogin) : "–"}</td>
                <td className="pt-2 pr-4 tabular-nums text-slate-400">{t ? day(t.lastSeen) : "–"}</td>
                <td className="pt-2 tabular-nums text-slate-300">
                  {plan ? plan.own : 0}
                  {plan && plan.given > 0 && <span className="text-slate-400"> + {plan.given} from a teacher</span>}
                </td>
              </tr>
              <tr>
                <td colSpan={8} className="pb-2 pt-1">
                  {answers ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-slate-400">{summary(answers, Math.max(1, plan?.answered ?? 0))}</summary>
                      <Answers a={answers} />
                    </details>
                  ) : (
                    <p className="text-xs text-slate-500">No questionnaire answers yet.</p>
                  )}
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
