"use client";

import { useCallback, useEffect, useState } from "react";
import { report, type Tracked } from "@/features/userData/client/registry";
import { useDataSource } from "@/features/userData/client/useDataSource";
import { LoadRefused } from "@/features/userData/client/load";
import { afterFailure, nextToUpload, type QueuedVideo, type SavedVideoInfo } from "./queue";
import { videoFileName } from "./recording";
import { deleteServerVideo, listServerVideos, renameServerVideo, UploadRefused, uploadQueued, videoFileUrl } from "./serverVideos";
import { changed, deleteVideo, dropQueued, getVideo, isUnstored, listQueued, listVideos, markQueued, onVideosChange, renameVideo } from "./store";

/*
 * The upload queue's runner, one per page: it uploads the signed-in player's queued takes one at a time, each at most once per
 * run (a failed one waits for Try again or the next page load). While anything is uploading or waiting it reports "saving" to the
 * userData registry, so the save notice's leave warning covers it; a failed upload reports nothing there (the video list shows it
 * with Try again and Download), except a take only in this page's memory, which is lost when the page closes.
 */

let account: string | null = null;
let running = false;
let again = false;
let pending = false;
const tried = new Set<string>();
const resumed = new Set<string>();

const tracker: Tracked = { status: () => (running || pending ? "saving" : "saved"), flush: () => {} };

async function refreshStatus(): Promise<void> {
  const list = account ? await listQueued(account) : [];
  pending = list.some((v) => v.state !== "failed" || isUnstored(v.id));
  report(tracker);
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  onVideosChange(() => void refreshStatus());
}

/** Starts the runner for this account (or tells a running one to look again). */
export function kickUploads(accountId: string): void {
  if (account !== accountId) tried.clear();
  account = accountId;
  listen();
  if (running) {
    again = true;
    return;
  }
  void loop();
}

async function loop(): Promise<void> {
  running = true;
  report(tracker);
  try {
    for (;;) {
      again = false;
      const acc = account;
      if (!acc) break;
      const next = nextToUpload((await listQueued(acc)).filter((v) => !tried.has(v.id)));
      if (!next) {
        if (again) continue;
        break;
      }
      tried.add(next.id);
      await markQueued(next.id, { state: "uploading" });
      try {
        await uploadQueued({ ...next, state: "uploading" });
        await dropQueued(next.id);
      } catch (e) {
        const failed = afterFailure(next, e instanceof UploadRefused && e.message ? e.message : undefined);
        await markQueued(next.id, { state: failed.state, tries: failed.tries, error: failed.error });
      }
    }
  } finally {
    running = false;
    await refreshStatus();
  }
}

/**
 * Once per page and account, on a signed-in page: whatever is still queued in this browser is uploaded, one at a time. A take left
 * "uploading" by a page that closed mid-upload is waiting again.
 */
export async function resumeUploads(accountId: string): Promise<void> {
  if (resumed.has(accountId)) return;
  resumed.add(accountId);
  for (const v of await listQueued(accountId)) if (v.state === "uploading") await markQueued(v.id, { state: "waiting" });
  kickUploads(accountId);
}

/** Mounted once (by `UserDataProvider`): resumes the queue on every page load for a signed-in player. */
export function useResumeUploads(): void {
  const { source, ready, accountId } = useDataSource();
  useEffect(() => {
    if (ready && source === "server" && accountId) void resumeUploads(accountId);
  }, [ready, source, accountId]);
}

/** A video in the player's list. `uploaded`: on the server. `state`: in the upload queue. `unstored`: only in this page's memory. */
export type LibraryVideo = SavedVideoInfo & { uploaded: boolean; state?: QueuedVideo["state"]; error?: string; unstored?: boolean };

const info = ({ blob: _blob, ...rest }: QueuedVideo): SavedVideoInfo => (void _blob, { id: rest.id, title: rest.title, type: rest.type, seconds: rest.seconds, width: rest.width, height: rest.height, savedAt: rest.savedAt });

function saveFile(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

/**
 * The player's own videos. Signed in: the queued takes first (newest first), then the uploaded ones; without accounts or for a
 * visitor: the videos kept in this browser, as before. `videos` is null while loading; `refused` when the server list was refused.
 */
export function useVideoLibrary(): {
  videos: LibraryVideo[] | null;
  refused: boolean;
  retry: (id: string) => void;
  download: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
} {
  const { source, ready, accountId } = useDataSource();
  const server = source === "server" && accountId !== null;
  const [videos, setVideos] = useState<LibraryVideo[] | null>(null);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    const load = async () => {
      if (!server) {
        const local = await listVideos();
        if (live) setVideos(local.map((v) => ({ ...v, uploaded: false })));
        return;
      }
      const queued = await listQueued(accountId);
      const q: LibraryVideo[] = queued.map((v) => ({ ...info(v), uploaded: false, state: v.state, error: v.error, unstored: isUnstored(v.id) }));
      if (live) setVideos((cur) => [...q, ...(cur ?? []).filter((v) => v.uploaded && !queued.some((x) => x.id === v.id))]);
      let up: LibraryVideo[] = [];
      try {
        up = (await listServerVideos()).map(({ size: _size, ...v }) => (void _size, { ...v, uploaded: true }));
        if (live) setRefused(false);
      } catch (e) {
        if (live && e instanceof LoadRefused) setRefused(true);
      }
      if (live) setVideos([...q, ...up.filter((v) => !queued.some((x) => x.id === v.id))]);
    };
    void load();
    const off = onVideosChange(() => void load());
    return () => {
      live = false;
      off();
    };
  }, [ready, server, accountId]);

  const retry = useCallback(
    (id: string) => {
      if (!accountId) return;
      tried.delete(id);
      void markQueued(id, { state: "waiting" }).then(() => kickUploads(accountId));
    },
    [accountId],
  );

  const download = useCallback(
    async (id: string) => {
      const v = videos?.find((x) => x.id === id);
      if (!v) return;
      if (v.uploaded) return saveFile(videoFileUrl(id), videoFileName(v.title, v.type));
      const saved = await getVideo(id);
      if (!saved) return;
      const url = URL.createObjectURL(saved.blob);
      saveFile(url, videoFileName(v.title, v.type));
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [videos],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      const v = videos?.find((x) => x.id === id);
      if (!v) return false;
      if (!server) return renameVideo(id, title);
      if (!v.uploaded) return markQueued(id, { title });
      const ok = await renameServerVideo(id, title);
      if (ok) changed();
      return ok;
    },
    [videos, server],
  );

  const remove = useCallback(
    async (id: string) => {
      const v = videos?.find((x) => x.id === id);
      if (!v || v.state === "uploading") return false;
      if (!server) return deleteVideo(id);
      if (!v.uploaded) return dropQueued(id);
      const ok = await deleteServerVideo(id);
      if (ok) changed();
      return ok;
    },
    [videos, server],
  );

  return { videos, refused, retry, download, rename, remove };
}
