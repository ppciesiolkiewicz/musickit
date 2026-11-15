/**
 * The upload queue's pure parts. With accounts, a take is written to this browser first (IndexedDB, `store.ts`) as a queued video,
 * then uploaded; the local copy is dropped only once the server has saved its row. No React, no browser calls, so they are tested.
 */

/** A take kept in this browser. */
export interface SavedVideo {
  /** `crypto.randomUUID()`, kept from the recording to the server, so a note's ref never changes */
  id: string;
  title: string;
  /** the recorded type ("video/webm;codecs=vp9,opus") */
  type: string;
  blob: Blob;
  seconds: number;
  /** the picture's size, for its shape */
  width: number;
  height: number;
  savedAt: number;
}
/** A saved video without its file: what a list shows. */
export type SavedVideoInfo = Omit<SavedVideo, "blob">;

/**
 * A take waiting for the server. `waiting`: not tried yet on this page; `uploading`: being sent now; `failed`: the last try
 * didn't get through (`error` is the server's words, when it gave some). `fileUp`: the file is in the store already and only the
 * row is missing, so a retry doesn't upload it again (the store refuses to overwrite a file). `accountId`: whose account it goes
 * to, so another person signing in on this browser never uploads it.
 */
export type QueuedVideo = SavedVideo & {
  accountId: string;
  state: "waiting" | "uploading" | "failed";
  tries: number;
  error?: string;
  fileUp?: boolean;
};

/** The oldest take that is waiting or failed; one being uploaded is skipped. Null when there is none. */
export function nextToUpload(list: QueuedVideo[]): QueuedVideo | null {
  let next: QueuedVideo | null = null;
  for (const v of list) if (v.state !== "uploading" && (!next || v.savedAt < next.savedAt)) next = v;
  return next;
}

/** The take after a try that didn't get through: failed, one more try counted. */
export function afterFailure(v: QueuedVideo, error: string | undefined): QueuedVideo {
  const out: QueuedVideo = { ...v, state: "failed", tries: v.tries + 1 };
  if (error) out.error = error;
  else delete out.error;
  return out;
}

/** The queue once a take is saved on the server: without it. */
export const afterSuccess = (list: QueuedVideo[], id: string): QueuedVideo[] => list.filter((v) => v.id !== id);
