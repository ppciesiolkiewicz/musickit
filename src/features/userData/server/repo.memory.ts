import type { DayTime } from "@/features/plan/model/planTime";
import type { ProgressEntry } from "@/features/progress/log";
import type { ShareRow, UserDataRepo, VideoRow } from "./repo";

/**
 * The repo in memory, for tests. Same rules as Postgres: one document per player and kind, one entry per player and exercise,
 * and the cascades (deleting a video or a share drops its `share_videos` and `plan_claims` rows).
 */
/** The repo over memory, for tests. `cascadeUser` stands in for deleting the user row, which the database cascades. */
export function memoryUserDataRepo(): UserDataRepo & { cascadeUser(userId: string): void } {
  const docs = new Map<string, unknown>();
  const progress = new Map<string, ProgressEntry>();
  /** `plan_day_times` rows, keyed `${userId}/${planId}/${day}`. */
  const planTimes = new Map<string, DayTime>();
  const videos = new Map<string, VideoRow>();
  const shares = new Map<string, ShareRow>();
  /** `share_videos` rows, as `${shareId} ${videoId}`. */
  const shareVideos = new Set<string>();
  /** `plan_claims` rows, as `${shareId} ${userId}`. */
  const claims = new Set<string>();
  const pair = (a: string, b: string) => `${a} ${b}`;
  const dropShare = (id: string) => {
    shares.delete(id);
    for (const k of [...shareVideos]) if (k.startsWith(`${id} `)) shareVideos.delete(k);
    for (const k of [...claims]) if (k.startsWith(`${id} `)) claims.delete(k);
  };
  const dropVideo = (id: string) => {
    videos.delete(id);
    for (const k of [...shareVideos]) if (k.endsWith(` ${id}`)) shareVideos.delete(k);
  };
  const copy = (v: VideoRow | undefined): VideoRow | null => (v ? structuredClone(v) : null);
  return {
    async getDoc(userId, kind) {
      const v = docs.get(`${userId}/${kind}`);
      return v === undefined ? null : structuredClone(v);
    },
    async putDoc(userId, kind, data) {
      docs.set(`${userId}/${kind}`, structuredClone(data));
    },
    async listProgress(userId) {
      return [...progress.entries()].filter(([k]) => k.startsWith(`${userId}/`)).map(([, e]) => structuredClone(e));
    },
    async putProgress(userId, entry) {
      progress.set(`${userId}/${entry.exerciseId}`, structuredClone(entry));
    },
    async removeProgress(userId, exerciseId) {
      progress.delete(`${userId}/${exerciseId}`);
    },
    async listPlanTimes(userId, planId) {
      return [...planTimes.entries()].filter(([k]) => k.startsWith(`${userId}/${planId}/`)).map(([, t]) => structuredClone(t));
    },
    async putPlanTime(userId, t) {
      planTimes.set(`${userId}/${t.planId}/${t.day}`, structuredClone(t));
    },
    async createVideo(row) {
      if (videos.has(row.id) || [...videos.values()].some((v) => v.blobPath === row.blobPath)) return false;
      videos.set(row.id, structuredClone(row));
      return true;
    },
    async listVideos(userId) {
      return [...videos.values()].filter((v) => v.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((v) => structuredClone(v));
    },
    async getVideo(id) {
      return copy(videos.get(id));
    },
    async renameVideo(userId, id, title) {
      const v = videos.get(id);
      if (!v || v.userId !== userId) return null;
      v.title = title;
      return copy(v);
    },
    async deleteVideo(userId, id) {
      const v = videos.get(id);
      if (!v || v.userId !== userId) return null;
      dropVideo(id);
      return copy(v);
    },
    async canWatch(viewerId, videoId) {
      const v = videos.get(videoId);
      if (!v) return null;
      if (viewerId !== null && v.userId === viewerId) return copy(v);
      const through = [...shares.values()].some(
        (s) =>
          s.userId === v.userId &&
          shareVideos.has(pair(s.id, v.id)) &&
          ((s.kind === "note" && s.stoppedAt === null) || (s.kind === "plan" && viewerId !== null && claims.has(pair(s.id, viewerId)))),
      );
      return through ? copy(v) : null;
    },
    async createShare(row, videoIds) {
      if (shares.has(row.id)) throw new Error("share id taken");
      shares.set(row.id, structuredClone(row));
      for (const id of videoIds) if (videos.get(id)?.userId === row.userId) shareVideos.add(pair(row.id, id));
    },
    async getShare(id) {
      const s = shares.get(id);
      return s ? structuredClone(s) : null;
    },
    async listShares(userId, kind, itemId) {
      return [...shares.values()]
        .filter((s) => s.userId === userId && s.kind === kind && s.itemId === itemId && s.stoppedAt === null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((s) => structuredClone(s));
    },
    async stopShare(userId, id, now) {
      const s = shares.get(id);
      if (!s || s.userId !== userId || s.stoppedAt !== null) return false;
      s.stoppedAt = now;
      return true;
    },
    async claimPlan(shareId, userId) {
      if (!shares.has(shareId)) throw new Error("no such share");
      if (claims.has(pair(shareId, userId))) return "again";
      claims.add(pair(shareId, userId));
      return "new";
    },
    async videoPaths(userId) {
      return [...videos.values()].filter((v) => v.userId === userId).map((v) => v.blobPath);
    },
    cascadeUser(userId) {
      for (const k of [...docs.keys()]) if (k.startsWith(`${userId}/`)) docs.delete(k);
      for (const k of [...progress.keys()]) if (k.startsWith(`${userId}/`)) progress.delete(k);
      for (const k of [...planTimes.keys()]) if (k.startsWith(`${userId}/`)) planTimes.delete(k);
      for (const k of [...claims]) if (k.endsWith(` ${userId}`)) claims.delete(k);
      for (const s of [...shares.values()]) if (s.userId === userId) dropShare(s.id);
      for (const v of [...videos.values()]) if (v.userId === userId) dropVideo(v.id);
    },
  };
}
