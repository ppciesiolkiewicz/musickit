"use client";

import type { ModelLibrary } from "./library";

export interface CloudModel {
  path: string;
  /** the folder: a setup, whose files are variants of it (null for a file at the top) */
  group: string | null;
  /** the file name without .nam */
  variant: string;
  size: number;
  uploadedAt: number;
}

const KEY = "musickit.nam.cloudPassword";

const readPassword = (): string => {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** The private cloud library of amp models (see src/app/api/nam). Models are copied into the browser's own library when used. */
export function createCloud(lib: ModelLibrary) {
  const headers = (): HeadersInit => ({ "x-site-password": readPassword() });
  const fail = async (res: Response): Promise<string> => {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    return j?.error ?? `Something went wrong (${res.status}).`;
  };
  return {
    getPassword: readPassword,
    setPassword(v: string) {
      try {
        if (v) window.localStorage.setItem(KEY, v);
        else window.localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
    async list(): Promise<{ models: CloudModel[] } | { error: string }> {
      try {
        const res = await fetch("/api/nam", { headers: headers(), cache: "no-store" });
        if (!res.ok) return { error: await fail(res) };
        return { models: ((await res.json()) as { models: CloudModel[] }).models };
      } catch {
        return { error: "Could not reach the library." };
      }
    },
    /** Download a model into the browser's library. Resolves to the new model id, or an error message. */
    async use(m: CloudModel): Promise<{ id: number } | { error: string }> {
      const have = lib.list().find((r) => r.cloudPath === m.path);
      if (have) return { id: have.id };
      try {
        const res = await fetch(`/api/nam/file?path=${encodeURIComponent(m.path)}`, { headers: headers() });
        if (!res.ok) return { error: await fail(res) };
        const rec = await lib.addFile(new File([await res.text()], `${m.variant}.nam`), { name: m.group ? `${m.group} / ${m.variant}` : m.variant, cloudPath: m.path });
        return { id: rec.id };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not load that model." };
      }
    },
    async upload(files: File[]): Promise<string | null> {
      const errors: string[] = [];
      for (const f of files) {
        const body = new FormData();
        body.append("file", f);
        try {
          const res = await fetch("/api/nam", { method: "POST", headers: headers(), body });
          if (!res.ok) errors.push(`${f.name}: ${await fail(res)}`);
        } catch {
          errors.push(`${f.name}: could not reach the library.`);
        }
      }
      return errors.length ? errors.join("; ") : null;
    },
    async remove(m: CloudModel): Promise<string | null> {
      try {
        const res = await fetch(`/api/nam?path=${encodeURIComponent(m.path)}`, { method: "DELETE", headers: headers() });
        return res.ok ? null : await fail(res);
      } catch {
        return "Could not reach the library.";
      }
    },
  };
}

export type Cloud = ReturnType<typeof createCloud>;
