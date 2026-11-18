import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { messageThreads, messages, users } from "@/lib/db/schema";
import { preview, type MessageContext } from "../model/message";
import type { MessageRow, MessagesRepo, ThreadRow } from "./repo";

type ThreadDb = typeof messageThreads.$inferSelect;
type MessageDb = typeof messages.$inferSelect;

const thread = (r: ThreadDb): ThreadRow => ({ ...r, kind: "support", status: r.status === "closed" ? "closed" : "open" });
const message = (r: MessageDb): MessageRow => ({ ...r, context: (r.context as MessageContext | null) ?? null });

/** The repo over Postgres. */
export function drizzleMessagesRepo(db: Db): MessagesRepo {
  return {
    async createThread({ userId, email, at }) {
      const [row] = await db.insert(messageThreads).values({ userId, email, lastAt: at, createdAt: at }).returning();
      return thread(row);
    },
    async thread(id) {
      const [row] = await db.select().from(messageThreads).where(eq(messageThreads.id, id)).limit(1);
      return row ? thread(row) : null;
    },
    async threadsOf(userId) {
      const rows = await db.select().from(messageThreads).where(eq(messageThreads.userId, userId)).orderBy(desc(messageThreads.lastAt));
      return rows.map(thread);
    },
    async allThreads({ status, limit }) {
      const last = db
        .select({ body: messages.body })
        .from(messages)
        .where(eq(messages.threadId, messageThreads.id))
        .orderBy(desc(messages.at))
        .limit(1);
      const rows = await db
        .select({ t: messageThreads, userEmail: users.email, userName: users.name, last: sql<string | null>`(${last})` })
        .from(messageThreads)
        .leftJoin(users, eq(users.id, messageThreads.userId))
        .where(status ? eq(messageThreads.status, status) : undefined)
        .orderBy(desc(messageThreads.lastAt))
        .limit(limit);
      return rows.map((r) => ({ ...thread(r.t), userEmail: r.userEmail, userName: r.userName, preview: r.last ? preview(r.last) : "" }));
    },
    async addMessage(m) {
      return db.transaction(async (tx) => {
        const [row] = await tx.insert(messages).values(m).returning();
        await tx
          .update(messageThreads)
          .set(m.fromAdmin ? { lastAt: m.at, lastAdminAt: m.at } : { lastAt: m.at, lastUserAt: m.at })
          .where(eq(messageThreads.id, m.threadId));
        return message(row);
      });
    },
    async messagesOf(threadId) {
      const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.at);
      return rows.map(message);
    },
    async lastMessage(threadId) {
      const [row] = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(desc(messages.at)).limit(1);
      return row ? message(row) : null;
    },
    async userMessagesSince(userId, since) {
      const [row] = await db
        .select({ n: count() })
        .from(messages)
        .innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
        .where(and(eq(messageThreads.userId, userId), eq(messages.fromAdmin, false), gte(messages.at, since)));
      return row?.n ?? 0;
    },
    async updateThread(id, patch) {
      if (!Object.keys(patch).length) return;
      await db.update(messageThreads).set(patch).where(eq(messageThreads.id, id));
    },
  };
}
