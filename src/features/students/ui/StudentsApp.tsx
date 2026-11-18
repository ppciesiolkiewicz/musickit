"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button, Notice, btn } from "@/components/ui";
import { accountsOpen } from "@/features/account/serverAccountStore";
import { useAccount } from "@/features/account/useAccount";
import { localDate } from "@/features/plan/model/schedule";
import { dateLabel } from "@/features/plan/model/today";
import { loginHref } from "@/lib/publicPaths";
import { fetchStudents, postClaimLink } from "../client";
import type { AddedStudent, StudentRow } from "../model/types";
import AddStudent, { savedAdd } from "./AddStudent";

/** Who is looking: still unknown, a site without accounts, signed out, an account without students, a teacher. */
export type Access = "loading" | "no-accounts" | "logged-out" | "not-teacher" | "teacher";

/** The list as the page has it. */
export type ListState = { kind: "loading" } | { kind: "error"; error: string } | { kind: "list"; students: StudentRow[]; limit: number | null };

/** A row's Send the link again: going out, or what came of it. */
export type LinkState = { busy: true } | { busy: false; ok: boolean; text: string };

/** The student's own page, where the teacher sees and makes their plans. */
export const studentHref = (id: string): string => `/students/${id}`;

/** The one line after adding: what happened to the first week, then to the email, with what to do when either didn't work. */
export function addedLine({ student, plan, mail }: AddedStudent): string {
  const { name, email } = student;
  const week = {
    made: `${name} has a plan for their first week.`,
    short: `${name} has a plan for their first week. Some days are shorter than the minutes you picked, because few exercises in the library fit their answers.`,
    none: `attunr couldn't make a plan for ${name}'s first week. Open ${name}'s page to make one.`,
  }[plan];
  const sent = {
    sent: `attunr emailed ${email} a link to log in.`,
    off: "Email is turned off on this server, so no link went out.",
    failed: `The email with the link didn't go out. Press Send the link again in ${name}'s row.`,
  }[mail];
  return `${week} ${sent}`;
}

const panel = "metal-panel rounded-2xl border border-slate-800 bg-slate-900/40";
const primary = "!border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 hover:!bg-sky-400";
const warn = <Icon name="alert-triangle" size={14} />;

/** When the student first opened their link, or that they haven't yet. */
const opened = (s: StudentRow): string => (s.claimedAt ? `Opened the link on ${dateLabel(localDate(new Date(s.claimedAt)))}` : "Not opened yet");

function StudentItem({ s, link, onSendLink }: { s: StudentRow; link: LinkState | undefined; onSendLink: (id: string) => void }) {
  return (
    <li className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={studentHref(s.id)} className="truncate text-sm font-medium text-sky-200 hover:underline">{s.name}</Link>
        <span className="truncate text-sm text-slate-400">{s.email}</span>
        <span className={`text-xs ${s.claimedAt ? "text-slate-500" : "text-amber-300/80"}`}>{opened(s)}</span>
        {link && !link.busy && <span role="status" className={`text-xs ${link.ok ? "text-slate-300" : "text-rose-300"}`}>{link.text}</span>}
      </div>
      {!s.claimedAt && (
        <Button size="sm" className="self-start sm:self-center" disabled={link?.busy} onClick={() => onSendLink(s.id)}>
          <Icon name="rotate-ccw" size={12} />Send the link again
        </Button>
      )}
    </li>
  );
}

/**
 * The Students page as drawn from its state, so tests draw every state without a server: who may see it (`access`),
 * the list (loading, failed with Try again, empty, or the students), the limit, the line after an add, each row's link state.
 */
export function StudentsView({ access, list, added, links, onRetry, onAdd, onSendLink }: {
  access: Access;
  list: ListState;
  added: AddedStudent | null;
  links: Record<string, LinkState>;
  onRetry: () => void;
  onAdd: () => void;
  onSendLink: (id: string) => void;
}) {
  if (access === "loading") return <p className="text-sm text-slate-500">Loading…</p>;
  if (access === "no-accounts") return <p className="text-sm text-slate-300">Adding students needs a teacher&apos;s account, and attunr is running without accounts here.</p>;
  if (access === "logged-out") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
        <p>Log in to see your students.</p>
        <Link href={loginHref("/students")} className={btn}>Log in</Link>
      </div>
    );
  }
  if (access === "not-teacher") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
        <p>Only a teacher&apos;s account can have students. To add students, choose a Teacher plan on your account page.</p>
        <Link href="/account" className={btn}>Change your plan</Link>
      </div>
    );
  }
  if (list.kind === "loading") return <p className="text-sm text-slate-500">Loading your students…</p>;
  if (list.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice tone="warn" icon={warn}>{list.error}</Notice>
        <Button onClick={onRetry}><Icon name="rotate-ccw" size={12} />Try again</Button>
      </div>
    );
  }

  const { students, limit } = list;
  const full = limit !== null && students.length >= limit;
  return (
    <div className="flex flex-col gap-4">
      {added && <Notice icon={<Icon name="check" size={14} />}><span role="status">{addedLine(added)}</span></Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={primary} disabled={full} onClick={onAdd}><Icon name="plus" size={14} />Add a student</Button>
        {limit !== null && <span className="text-sm tabular-nums text-slate-400">{students.length} of {limit} students</span>}
      </div>
      {full && (
        <p className="text-sm text-slate-300">
          Your plan has no places left for students. To add more, <Link href="/account" className="text-sky-300 hover:underline">change your plan</Link>.
        </p>
      )}
      {students.length === 0 ? (
        <p className="text-sm text-slate-400">No students yet. Add one, and attunr makes their account and a plan for their first week.</p>
      ) : (
        <ul className={panel}>
          {students.map((s) => <StudentItem key={s.id} s={s} link={links[s.id]} onSendLink={onSendLink} />)}
        </ul>
      )}
    </div>
  );
}

/** The words for a link that went out again. */
const LINK_WORDS = { sent: "attunr emailed a new link.", off: "Email is turned off on this server, so no link went out." } as const;

/**
 * A teacher's students (`GET /api/students`), adding one (`AddStudent`), and a new link for a student who hasn't opened
 * theirs. Who may see it is `can("students")`; with no account (no accounts on this site, or signed out) a line says why
 * there is no list.
 */
export default function StudentsApp() {
  const { account, loaded, can } = useAccount();
  const access: Access = !loaded ? "loading" : !account ? (accountsOpen() ? "logged-out" : "no-accounts") : can("students") ? "teacher" : "not-teacher";
  const [list, setList] = useState<ListState>({ kind: "loading" });
  const [added, setAdded] = useState<AddedStudent | null>(null);
  const [links, setLinks] = useState<Record<string, LinkState>>({});
  // a flow left open (a reload) comes back
  const [adding, setAdding] = useState(() => (typeof window === "undefined" ? false : !!savedAdd()));

  // the list's state starts as loading; Try again sets it so again before asking
  const [asked, setAsked] = useState(0);
  useEffect(() => {
    if (access !== "teacher") return;
    let live = true;
    fetchStudents().then((r) => {
      if (live) setList(r.ok ? { kind: "list", students: r.students, limit: r.limit } : { kind: "error", error: r.error });
    });
    return () => {
      live = false;
    };
  }, [access, asked]);
  const retry = () => {
    setList({ kind: "loading" });
    setAsked((n) => n + 1);
  };

  const onAdded = (a: AddedStudent) => {
    setAdding(false);
    setAdded(a);
    setList((l) => (l.kind === "list" ? { ...l, students: [a.student, ...l.students.filter((s) => s.id !== a.student.id)] } : l));
  };

  const onSendLink = async (id: string) => {
    setLinks((m) => ({ ...m, [id]: { busy: true } }));
    const r = await postClaimLink(id);
    setLinks((m) => ({ ...m, [id]: r.ok ? { busy: false, ok: true, text: LINK_WORDS[r.mail] } : { busy: false, ok: false, text: r.error } }));
  };

  return (
    <>
      <StudentsView access={access} list={list} added={added} links={links} onRetry={retry} onAdd={() => setAdding(true)} onSendLink={(id) => void onSendLink(id)} />
      {adding && access === "teacher" && <AddStudent onAdded={onAdded} onClose={() => setAdding(false)} />}
    </>
  );
}
