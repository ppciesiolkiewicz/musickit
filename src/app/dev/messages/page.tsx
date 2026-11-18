import DevShell from "@/features/devtools/DevShell";
import MessagesInbox from "@/features/devtools/messages/MessagesInbox";

export const dynamic = "force-dynamic";

/** Messages from signed-in players and the contact form. `?thread=<id>` opens one (the email we get links here). */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const { thread } = await searchParams;
  return (
    <DevShell wide>
      <MessagesInbox initialThread={typeof thread === "string" && thread ? thread : null} />
    </DevShell>
  );
}
