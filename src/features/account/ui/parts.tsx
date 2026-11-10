"use client";

import type { ReactNode } from "react";
import { SIGNUP_ROLES, type SignupRole } from "../model";

/** Shared pieces of the log-in, register and account screens. */

export const FIELD =
  "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none";
export const LABEL = "mb-1.5 block text-xs font-medium text-slate-400";
export const PRIMARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60";
export const SECONDARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-60";
export const LINK = "font-medium text-sky-300 underline-offset-2 hover:underline";

/** The framed column every one of these screens sits in. */
export function Card({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">{children}</div>;
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="text-sm text-rose-300">{children}</p> : null;
}

export function OrLine() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden>
      <span className="h-px flex-1 bg-slate-800" />
      or
      <span className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

const ROLE_TEXT: Record<SignupRole, { label: string; line: string }> = {
  student: { label: "Student", line: "I'm learning." },
  teacher: { label: "Teacher", line: "I teach." },
};

/** Student or Teacher, as two buttons side by side. */
export function RoleChoice({ value, onChange }: { value: SignupRole | null; onChange: (role: SignupRole) => void }) {
  return (
    <fieldset>
      <legend className={LABEL}>I am a</legend>
      <div className="grid grid-cols-2 gap-2">
        {SIGNUP_ROLES.map((r) => {
          const on = value === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(r)}
              className={`rounded-xl border px-4 py-3 text-left transition ${on ? "border-sky-400 bg-sky-500/15 text-sky-50" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
            >
              <span className="block text-sm font-semibold">{ROLE_TEXT[r].label}</span>
              <span className="block text-xs text-slate-400">{ROLE_TEXT[r].line}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A plain link, not a fetch: the browser itself has to travel to Google and back. */
export function GoogleButton({ role, next }: { role?: SignupRole | null; next?: string | null }) {
  const q = new URLSearchParams();
  if (role) q.set("role", role);
  if (next) q.set("next", next);
  const query = q.toString();
  return (
    <a href={`/api/auth/google/start${query ? `?${query}` : ""}`} className={SECONDARY}>
      <svg aria-hidden viewBox="0 0 18 18" width="16" height="16">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
      </svg>
      Continue with Google
    </a>
  );
}

export type Posted = { ok: boolean; status: number; body: Record<string, unknown> };

/** A JSON request to one of the auth routes. Never throws: no network comes back as `status: 0` with a line to show. */
export async function send(url: string, method: "POST" | "PATCH" | "DELETE" | "GET", data?: unknown): Promise<Posted> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      ...(data === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(data) }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: "Couldn't reach the server. Check your connection and try again." } };
  }
}

export const errorOf = (r: Posted): string => (typeof r.body.error === "string" ? r.body.error : "Something went wrong. Try again.");
