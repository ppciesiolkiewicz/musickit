import { redirect } from "next/navigation";

/** The inbox moved to /admin/messages. Emails sent before the move link here, so the thread is carried over. */
export default async function OldMessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const { thread } = await searchParams;
  redirect(typeof thread === "string" && thread ? `/admin/messages?thread=${encodeURIComponent(thread)}` : "/admin/messages");
}
