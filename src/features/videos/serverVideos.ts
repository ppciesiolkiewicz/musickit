"use client";

import { getJson } from "@/features/userData/client/load";
import { ACCOUNT_CHANGED_WORDS, accountHeaders, isAccountChanged } from "@/features/userData/client/accountHeader";
import type { QueuedVideo, SavedVideoInfo } from "./queue";
import { videoPath } from "./recording";
import { markQueued } from "./store";

/**
 * A signed-in player's videos over the API (`src/app/api/videos`): the list, rename, delete, the file's URL, and the upload of a
 * queued take: the file straight to the private Blob store (`upload()` from `@vercel/blob/client`), then the row (`POST /api/videos`).
 */

/** A video on the server, as the list gives it. */
export type ServerVideo = SavedVideoInfo & { size: number };

/** Where a `<video>` plays an uploaded video from (checked by the server on every request). */
export const videoFileUrl = (id: string): string => `/api/videos/${id}/file`;

/** An upload the server answered with a refusal; `message` is the server's words for the player. */
export class UploadRefused extends Error {
  constructor(message: string, readonly code: number) {
    super(message);
  }
}

/** The player's uploaded videos, newest first. Waits and asks again on network errors and 5xx; a 4xx rejects (`LoadRefused`). */
export async function listServerVideos(): Promise<ServerVideo[]> {
  const body = (await getJson("/api/videos")) as { videos?: ServerVideo[] } | null;
  return Array.isArray(body?.videos) ? body.videos : [];
}

export async function renameServerVideo(id: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/videos/${id}`, { method: "PATCH", headers: accountHeaders({ "content-type": "application/json" }), body: JSON.stringify({ title }) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteServerVideo(id: string): Promise<boolean> {
  try {
    return (await fetch(`/api/videos/${id}`, { method: "DELETE", headers: accountHeaders() })).ok;
  } catch {
    return false;
  }
}

/** The server's words in a refusal, when it sent some. */
async function refusal(res: Response): Promise<UploadRefused> {
  let error = "";
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === "string") error = body.error;
  } catch {
    // no JSON: no words
  }
  return new UploadRefused(error, res.status);
}

/** The row for an uploaded file: true once the server has it (a 409 for an id already in this player's list is ours: saved; a 409 `account-changed` is refused, with words to reload). */
async function complete(v: QueuedVideo, path: string): Promise<true | UploadRefused> {
  const res = await fetch("/api/videos", {
    method: "POST",
    headers: accountHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ id: v.id, title: v.title, type: v.type, seconds: v.seconds, width: v.width, height: v.height, path }),
  });
  if (res.ok) return true;
  if (res.status === 409) {
    // a 409 is either "this id is in a list already" or "another account is logged in now": only the first can be ours
    const body = await res.clone().json().catch(() => null);
    if (isAccountChanged(409, body)) return new UploadRefused(ACCOUNT_CHANGED_WORDS, 409);
    const mine = await listServerVideos().catch(() => []);
    if (mine.some((s) => s.id === v.id)) return true;
  }
  return refusal(res);
}

/** Over this size a take goes up in parts, each retried by the Blob client. */
const MULTIPART_BYTES = 64 * 1024 ** 2;

/**
 * Uploads a queued take: the file (unless `fileUp` says it is in the store already: the store won't overwrite it), then the row.
 * Resolves once the server has both; throws otherwise (an `UploadRefused` carries the server's words). The caller drops the local copy.
 */
export async function uploadQueued(v: QueuedVideo): Promise<void> {
  const path = videoPath(v.accountId, v.id, v.type);
  if (!v.fileUp) {
    try {
      const { upload } = await import("@vercel/blob/client");
      await upload(path, v.blob, {
        access: "private",
        handleUploadUrl: "/api/videos/upload",
        headers: accountHeaders(),
        clientPayload: JSON.stringify({ id: v.id, type: v.type, size: v.blob.size }),
        contentType: v.type,
        multipart: v.blob.size > MULTIPART_BYTES,
      });
    } catch (e) {
      // the file may be in the store from an earlier visit that closed before the row was written: try the row before giving up
      const row = await complete(v, path).catch(() => null);
      if (row === true) return;
      throw row?.message ? row : e;
    }
    await markQueued(v.id, { fileUp: true });
  }
  const row = await complete(v, path);
  if (row !== true) throw row;
}
