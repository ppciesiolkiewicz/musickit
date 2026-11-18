import { randomUUID } from "node:crypto";
import { preview } from "../model/message";
import type { MessageRow, MessagesRepo, ThreadRow } from "./repo";

/** The repo in memory, for tests. `users` stands in for the users table, for the names /dev/messages shows. */
export function memoryMessagesRepo(users: Map<string, { email: string; name: string }> = new Map()): MessagesRepo {
  const threads = new Map<string, ThreadRow>();
  const msgs: MessageRow[] = [];
  const byNewest = (a: ThreadRow, b: ThreadRow) => b.lastAt.getTime() - a.lastAt.getTime();
  const of = (threadId: string) => msgs.filter((m) => m.threadId === threadId).sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    async createThread({ userId, email, at }) {
      const row: ThreadRow = { id: randomUUID(), kind: "support", userId, email, status: "open", lastAt: at, lastUserAt: null, lastAdminAt: null, userReadAt: null, adminReadAt: null, emailedAt: null, createdAt: at };
      threads.set(row.id, row);
      return { ...row };
    },
    async thread(id) {
      const t = threads.get(id);
      return t ? { ...t } : null;
    },
    async threadsOf(userId) {
      return [...threads.values()].filter((t) => t.userId === userId).sort(byNewest).map((t) => ({ ...t }));
    },
    async allThreads({ status, limit }) {
      return [...threads.values()]
        .filter((t) => !status || t.status === status)
        .sort(byNewest)
        .slice(0, limit)
        .map((t) => {
          const u = t.userId ? users.get(t.userId) : undefined;
          const last = of(t.id).at(-1);
          return { ...t, userEmail: u?.email ?? null, userName: u?.name ?? null, preview: last ? preview(last.body) : "" };
        });
    },
    async addMessage(m) {
      const t = threads.get(m.threadId);
      if (!t) throw new Error(`no thread ${m.threadId}`);
      const row = { ...m, id: randomUUID() };
      msgs.push(row);
      t.lastAt = m.at;
      if (m.fromAdmin) t.lastAdminAt = m.at;
      else t.lastUserAt = m.at;
      return { ...row };
    },
    async messagesOf(threadId) {
      return of(threadId).map((m) => ({ ...m }));
    },
    async lastMessage(threadId) {
      const last = of(threadId).at(-1);
      return last ? { ...last } : null;
    },
    async userMessagesSince(userId, since) {
      return msgs.filter((m) => !m.fromAdmin && m.at >= since && threads.get(m.threadId)?.userId === userId).length;
    },
    async updateThread(id, patch) {
      const t = threads.get(id);
      if (t) Object.assign(t, patch);
    },
  };
}
