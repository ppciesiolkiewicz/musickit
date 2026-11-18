import type { MessageContext } from "../model/message";

/** A `message_threads` row. */
export type ThreadRow = {
  id: string;
  kind: "support";
  userId: string | null;
  email: string | null;
  status: "open" | "closed";
  lastAt: Date;
  lastUserAt: Date | null;
  lastAdminAt: Date | null;
  userReadAt: Date | null;
  adminReadAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
};

/** A `messages` row. */
export type MessageRow = { id: string; threadId: string; fromAdmin: boolean; body: string; context: MessageContext | null; at: Date };

/** A thread as /admin/messages lists it: with the user's email and name (null for a contact message) and its last line. */
export type ListedThread = ThreadRow & { userEmail: string | null; userName: string | null; preview: string };

/** Where messages are kept: Postgres (`repo.drizzle.ts`) or memory for tests (`repo.memory.ts`). */
export interface MessagesRepo {
  createThread(t: { userId: string | null; email: string | null; at: Date }): Promise<ThreadRow>;
  thread(id: string): Promise<ThreadRow | null>;
  /** The user's threads, newest `lastAt` first. */
  threadsOf(userId: string): Promise<ThreadRow[]>;
  /** Every thread, newest `lastAt` first; all statuses when `status` is left out. */
  allThreads(filter: { status?: "open" | "closed"; limit: number }): Promise<ListedThread[]>;
  /** Stores the message and moves the thread's `lastAt` and `lastUserAt` or `lastAdminAt` to its time. */
  addMessage(m: Omit<MessageRow, "id">): Promise<MessageRow>;
  /** Oldest first. */
  messagesOf(threadId: string): Promise<MessageRow[]>;
  lastMessage(threadId: string): Promise<MessageRow | null>;
  /** How many messages the user wrote (not ours) at or after `since`, across their threads. */
  userMessagesSince(userId: string, since: Date): Promise<number>;
  updateThread(id: string, patch: Partial<Pick<ThreadRow, "status" | "userReadAt" | "adminReadAt" | "emailedAt">>): Promise<void>;
}
